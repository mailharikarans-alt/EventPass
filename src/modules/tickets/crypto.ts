import crypto from 'node:crypto';
import type { QRPayload } from '../../types';

// In production, EVENTPASS_HMAC_SECRET is injected from server environment variables
const HMAC_SECRET = process.env.EVENTPASS_HMAC_SECRET || 'eventpass_prod_secure_signing_key_2026';

/**
 * Generates an HMAC-SHA256 signature for a ticket and event.
 */
export function signTicketQR(ticketId: string, eventId: string, issuedAt: number = Date.now()): string {
  const data = `${ticketId}:${eventId}:${issuedAt}`;
  const hmac = crypto.createHmac('sha256', HMAC_SECRET);
  hmac.update(data);
  return hmac.digest('hex');
}

/**
 * Builds the complete QR payload token to be encoded in the QR code.
 */
export function generateTicketQRPayload(ticketId: string, eventId: string): string {
  const issuedAt = Date.now();
  const signature = signTicketQR(ticketId, eventId, issuedAt);
  const payload: QRPayload = {
    ticketId,
    eventId,
    issuedAt,
    signature,
  };
  return JSON.stringify(payload);
}

/**
 * Verifies that a scanned QR payload is mathematically valid, not tampered, and matches the target event.
 */
export function verifyTicketQRPayload(
  qrString: string,
  targetEventId?: string
): { isValid: boolean; ticketId?: string; eventId?: string; reason?: string } {
  try {
    const payload: QRPayload = JSON.parse(qrString);
    if (!payload.ticketId || !payload.eventId || !payload.signature || !payload.issuedAt) {
      return { isValid: false, reason: 'Malformed QR Code format' };
    }

    // Verify cryptographic signature
    const expectedSignature = signTicketQR(payload.ticketId, payload.eventId, payload.issuedAt);
    if (crypto.timingSafeEqual(Buffer.from(payload.signature, 'hex'), Buffer.from(expectedSignature, 'hex')) === false) {
      return { isValid: false, reason: 'Invalid cryptographic signature (Counterfeit ticket)' };
    }

    // If verifying for a specific door/event, check event ID
    if (targetEventId && payload.eventId !== targetEventId) {
      return { isValid: false, ticketId: payload.ticketId, eventId: payload.eventId, reason: 'Wrong Event: This ticket belongs to a different event' };
    }

    return { isValid: true, ticketId: payload.ticketId, eventId: payload.eventId };
  } catch (err) {
    return { isValid: false, reason: 'Unreadable QR data' };
  }
}
