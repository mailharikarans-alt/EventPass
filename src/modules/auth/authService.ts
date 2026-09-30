import type { User, UserRole } from '../../types';
import { store } from '../../db/store';

export interface SessionToken {
  token: string;
  userId: string;
  role: UserRole;
  expiresAt: number;
}

// Active in-memory session tokens
const activeSessions: Map<string, SessionToken> = new Map();

export class AuthService {
  /**
   * Generates a session token for a given user.
   */
  static createSession(user: User): string {
    const token = `s_tok_${user.id}_${Math.random().toString(36).substring(2, 12)}`;
    activeSessions.set(token, {
      token,
      userId: user.id,
      role: user.role,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    return token;
  }

  /**
   * Resolves a session token into an authenticated user.
   */
  static getSessionUser(token?: string): User | null {
    if (!token) return null;
    const session = activeSessions.get(token);
    if (!session || Date.now() > session.expiresAt) {
      if (session) activeSessions.delete(token);
      return null;
    }
    return store.users.get(session.userId) || null;
  }

  /**
   * Simulates sending and verifying a magic sign-in link or email OTP.
   */
  static async requestMagicLink(email: string, role: UserRole = 'ATTENDEE', name?: string): Promise<{ token: string; user: User }> {
    const normalizedEmail = email.trim().toLowerCase();
    
    // Find or create user
    let user: User | undefined;
    for (const u of store.users.values()) {
      if (u.email.toLowerCase() === normalizedEmail) {
        user = u;
        break;
      }
    }

    if (!user) {
      user = {
        id: `usr_${Math.random().toString(36).substring(2, 10)}`,
        email: normalizedEmail,
        name: name || normalizedEmail.split('@')[0],
        role,
        createdAt: new Date().toISOString(),
      };
      store.users.set(user.id, user);
    }

    const token = this.createSession(user);
    return { token, user };
  }

  /**
   * Verifies if user has organizer rights for a specific event
   */
  static canManageEvent(user: User | null, eventId: string): boolean {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    if (user.role !== 'ORGANIZER') return false;
    
    const event = store.events.get(eventId);
    return !!event && event.organizerId === user.id;
  }

  /**
   * Verifies if staff or organizer can check-in tickets for an event
   */
  static canScanForEvent(user: User | null, eventId: string, providedPin?: string): boolean {
    const event = store.events.get(eventId);
    if (!event) return false;

    // Check PIN bypass for door staff
    if (providedPin && event.checkInPin && providedPin === event.checkInPin) {
      return true;
    }

    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    if (user.role === 'ORGANIZER' && event.organizerId === user.id) return true;
    if (user.role === 'STAFF') return true;

    return false;
  }
}
