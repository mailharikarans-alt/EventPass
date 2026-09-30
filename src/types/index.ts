import { z } from 'zod';

// ==========================================
// User & Auth Roles
// ==========================================
export type UserRole = 'ATTENDEE' | 'ORGANIZER' | 'STAFF' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
}

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['ATTENDEE', 'ORGANIZER', 'STAFF', 'ADMIN']),
  avatarUrl: z.string().url().optional(),
  createdAt: z.string(),
});

// ==========================================
// Event Types & Schemas
// ==========================================
export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED';
export type VenueType = 'PHYSICAL' | 'ONLINE' | 'HYBRID';

export interface Event {
  id: string;
  organizerId: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  coverImageUrl: string;
  venueType: VenueType;
  venueName?: string;
  venueAddress?: string;
  mapUrl?: string;
  onlineMeetingUrl?: string;
  // Stored in UTC ISO string
  startTimeUtc: string;
  endTimeUtc: string;
  // IANA timezone, e.g. "America/New_York", "UTC", "Asia/Tokyo"
  timezone: string;
  capacity: number;
  status: EventStatus;
  isRecurring: boolean;
  recurringFrequency?: 'WEEKLY' | 'MONTHLY';
  checkInPin?: string; // Quick 6-digit staff check-in PIN
  createdAt: string;
  updatedAt: string;
}

export const EventInputSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.string().min(1, 'Category is required'),
  coverImageUrl: z.string().url('Must be a valid image URL'),
  venueType: z.enum(['PHYSICAL', 'ONLINE', 'HYBRID']),
  venueName: z.string().optional(),
  venueAddress: z.string().optional(),
  mapUrl: z.string().url().optional().or(z.literal('')),
  onlineMeetingUrl: z.string().url().optional().or(z.literal('')),
  startTimeUtc: z.string().datetime(),
  endTimeUtc: z.string().datetime(),
  timezone: z.string().min(1, 'Timezone is required'),
  capacity: z.number().int().positive('Capacity must be positive'),
  isRecurring: z.boolean().default(false),
  recurringFrequency: z.enum(['WEEKLY', 'MONTHLY']).optional(),
  checkInPin: z.string().length(6).optional(),
});

// ==========================================
// Ticket Types & Inventory
// ==========================================
export interface TicketType {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  priceCents: number; // Smallest currency unit (e.g. 2500 = $25.00)
  currency: string;   // e.g. "USD", "EUR"
  totalQuantity: number;
  reservedQuantity: number;
  soldQuantity: number;
  perOrderLimit: number;
  salesStartUtc?: string;
  salesEndUtc?: string;
  createdAt: string;
}

export const TicketTypeInputSchema = z.object({
  name: z.string().min(1, 'Ticket name is required'),
  description: z.string().optional(),
  priceCents: z.number().int().min(0, 'Price must be 0 or positive'),
  currency: z.string().length(3).default('USD'),
  totalQuantity: z.number().int().positive('Total quantity must be at least 1'),
  perOrderLimit: z.number().int().min(1).default(5),
  salesStartUtc: z.string().datetime().optional(),
  salesEndUtc: z.string().datetime().optional(),
});

// ==========================================
// Promo Codes
// ==========================================
export type DiscountType = 'PERCENTAGE' | 'FIXED';

export interface PromoCode {
  id: string;
  eventId: string;
  code: string;
  discountType: DiscountType;
  discountValue: number; // Percentage (e.g. 20 for 20%) or Cents (e.g. 500 for $5.00)
  maxUses: number;
  currentUses: number;
  validUntilUtc?: string;
  createdAt: string;
}

export const PromoCodeSchema = z.object({
  code: z.string().min(3).max(20).toUpperCase(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']),
  discountValue: z.number().positive(),
  maxUses: z.number().int().positive().default(100),
  validUntilUtc: z.string().datetime().optional(),
});

// ==========================================
// Order & Inventory Hold
// ==========================================
export type OrderStatus = 'PENDING_PAYMENT' | 'COMPLETED' | 'REFUNDED' | 'CANCELLED' | 'EXPIRED';
export type PaymentProviderType = 'STRIPE' | 'RAZORPAY' | 'SANDBOX_MOCK';

export interface OrderItem {
  ticketTypeId: string;
  ticketTypeName: string;
  unitPriceCents: number;
  quantity: number;
  subtotalCents: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  eventId: string;
  buyerUserId?: string;
  buyerEmail: string;
  buyerName: string;
  items: OrderItem[];
  subtotalCents: number;
  discountCents: number;
  totalAmountCents: number;
  currency: string;
  promoCodeId?: string;
  status: OrderStatus;
  paymentProvider: PaymentProviderType;
  paymentIntentId?: string;
  reservationExpiresAtUtc: string; // 10 minutes from creation
  createdAt: string;
  paidAtUtc?: string;
}

export const CreateOrderRequestSchema = z.object({
  eventId: z.string(),
  buyerEmail: z.string().email(),
  buyerName: z.string().min(1),
  items: z.array(
    z.object({
      ticketTypeId: z.string(),
      quantity: z.number().int().positive().max(10),
    })
  ).min(1),
  promoCode: z.string().optional(),
});

// ==========================================
// Issued Ticket with Cryptographic QR Token
// ==========================================
export type TicketStatus = 'VALID' | 'CHECKED_IN' | 'TRANSFERRED' | 'REFUNDED' | 'VOID';

export interface QRPayload {
  ticketId: string;
  eventId: string;
  issuedAt: number;
  signature: string; // HMAC-SHA256 signature
}

export interface Ticket {
  id: string;
  ticketNumber: string; // Human readable, e.g. "TKT-8941-A2"
  orderId: string;
  eventId: string;
  ticketTypeId: string;
  ticketTypeName: string;
  attendeeName: string;
  attendeeEmail: string;
  qrPayloadString: string;
  qrCodeDataUrl?: string;
  status: TicketStatus;
  checkedInAtUtc?: string;
  checkedInBy?: string; // Staff user id or door pin identifier
  transferredToEmail?: string;
  createdAt: string;
}

// ==========================================
// Check-In Logs & Staff
// ==========================================
export interface CheckInLog {
  id: string;
  ticketId: string;
  eventId: string;
  staffIdentifier: string;
  timestampUtc: string;
  action: 'SUCCESS' | 'DUPLICATE_REJECTED' | 'INVALID_EVENT' | 'EXPIRED_OR_VOID';
  notes?: string;
}

export interface StaffAssignment {
  id: string;
  eventId: string;
  staffUserId: string;
  assignedByUserId: string;
  createdAt: string;
}

// ==========================================
// Webhook Idempotency Log
// ==========================================
export interface WebhookLog {
  id: string;
  provider: PaymentProviderType;
  providerEventId: string;
  eventType: string;
  processedAtUtc: string;
}
