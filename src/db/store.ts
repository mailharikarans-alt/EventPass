import type {
  User,
  Event,
  TicketType,
  PromoCode,
  Order,
  Ticket,
  CheckInLog,
  StaffAssignment,
  WebhookLog,
  CreateOrderRequestSchema
} from '../types';
import { generateTicketQRPayload, verifyTicketQRPayload } from '../modules/tickets/crypto';
import QRCode from 'qrcode';

/**
 * EventPass Transactional In-Memory / File-Synced Data Store
 * Built with strict concurrency mutexes to guarantee zero overselling,
 * atomic conditional updates, and automatic 10-minute reservation expiration.
 */
class EventPassStore {
  public users: Map<string, User> = new Map();
  public events: Map<string, Event> = new Map();
  public ticketTypes: Map<string, TicketType> = new Map();
  public promoCodes: Map<string, PromoCode> = new Map();
  public orders: Map<string, Order> = new Map();
  public tickets: Map<string, Ticket> = new Map();
  public checkInLogs: CheckInLog[] = [];
  public staffAssignments: StaffAssignment[] = [];
  public processedWebhooks: Set<string> = new Set(); // Idempotency tracker

  // Concurrency Mutex Queue for inventory reservations
  private inventoryMutex: Promise<void> = Promise.resolve();

  constructor() {
    // Run inventory hold cleanup every 30 seconds
    if (typeof setInterval !== 'undefined') {
      setInterval(() => {
        this.releaseExpiredReservations();
      }, 30 * 1000);
    }
  }

  /**
   * Acquires a serialized lock to ensure atomic conditional inventory checking & updates.
   */
  private async withInventoryLock<T>(action: () => Promise<T> | T): Promise<T> {
    const previousMutex = this.inventoryMutex;
    let releaseLock: () => void;
    this.inventoryMutex = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    await previousMutex;
    try {
      return await action();
    } finally {
      releaseLock!();
    }
  }

  /**
   * Release expired unpaid reservations (>10 minutes old)
   */
  public releaseExpiredReservations(): number {
    const now = new Date();
    let releasedCount = 0;

    for (const [orderId, order] of this.orders.entries()) {
      if (order.status === 'PENDING_PAYMENT') {
        const expiresAt = new Date(order.reservationExpiresAtUtc);
        if (now > expiresAt) {
          // Mark order expired
          order.status = 'EXPIRED';
          releasedCount++;

          // Release reserved quantities back to ticket types
          for (const item of order.items) {
            const ticketType = this.ticketTypes.get(item.ticketTypeId);
            if (ticketType) {
              ticketType.reservedQuantity = Math.max(0, ticketType.reservedQuantity - item.quantity);
            }
          }
        }
      }
    }

    return releasedCount;
  }

  /**
   * Atomically reserves inventory for an order.
   * If insufficient tickets are available, throws an error and no inventory is modified.
   */
  public async createOrderWithReservation(params: {
    eventId: string;
    buyerEmail: string;
    buyerName: string;
    buyerUserId?: string;
    items: { ticketTypeId: string; quantity: number }[];
    promoCode?: string;
  }): Promise<Order> {
    return this.withInventoryLock(async () => {
      // First, cleanse any expired holds
      this.releaseExpiredReservations();

      const event = this.events.get(params.eventId);
      if (!event) {
        throw new Error('Event not found');
      }
      if (event.status !== 'PUBLISHED') {
        throw new Error(`Cannot purchase tickets for an event in '${event.status}' status`);
      }

      // 1. Verify availability for every requested ticket type
      const preparedItems = [];
      let subtotalCents = 0;

      for (const req of params.items) {
        const tktType = this.ticketTypes.get(req.ticketTypeId);
        if (!tktType) {
          throw new Error(`Ticket type ${req.ticketTypeId} does not exist`);
        }
        if (tktType.eventId !== params.eventId) {
          throw new Error(`Ticket type does not belong to this event`);
        }
        if (req.quantity > tktType.perOrderLimit) {
          throw new Error(`Exceeded per-order limit of ${tktType.perOrderLimit} for ${tktType.name}`);
        }

        const available = tktType.totalQuantity - (tktType.soldQuantity + tktType.reservedQuantity);
        if (available < req.quantity) {
          throw new Error(`Sold out: Only ${Math.max(0, available)} ticket(s) remaining for ${tktType.name}`);
        }

        const itemSubtotal = tktType.priceCents * req.quantity;
        subtotalCents += itemSubtotal;

        preparedItems.push({
          ticketType: tktType,
          quantity: req.quantity,
          itemSubtotal,
        });
      }

      // 2. Validate Promo Code if provided
      let discountCents = 0;
      let matchedPromo: PromoCode | undefined;
      if (params.promoCode) {
        const cleanCode = params.promoCode.trim().toUpperCase();
        for (const p of this.promoCodes.values()) {
          if (p.eventId === params.eventId && p.code === cleanCode) {
            matchedPromo = p;
            break;
          }
        }

        if (!matchedPromo) {
          throw new Error('Invalid promo code');
        }
        if (matchedPromo.currentUses >= matchedPromo.maxUses) {
          throw new Error('Promo code has reached its maximum uses');
        }
        if (matchedPromo.validUntilUtc && new Date() > new Date(matchedPromo.validUntilUtc)) {
          throw new Error('Promo code has expired');
        }

        if (matchedPromo.discountType === 'PERCENTAGE') {
          discountCents = Math.round((subtotalCents * matchedPromo.discountValue) / 100);
        } else {
          discountCents = Math.min(subtotalCents, matchedPromo.discountValue);
        }
      }

      const totalAmountCents = Math.max(0, subtotalCents - discountCents);

      // 3. Atomically reserve quantities
      for (const item of preparedItems) {
        item.ticketType.reservedQuantity += item.quantity;
      }

      // 4. Create Order with 10-minute hold window
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

      const orderId = `ord_${Math.random().toString(36).substring(2, 10)}`;
      const orderNumber = `EP-${Math.floor(100000 + Math.random() * 900000)}`;

      const order: Order = {
        id: orderId,
        orderNumber,
        eventId: params.eventId,
        buyerUserId: params.buyerUserId,
        buyerEmail: params.buyerEmail,
        buyerName: params.buyerName,
        items: preparedItems.map(p => ({
          ticketTypeId: p.ticketType.id,
          ticketTypeName: p.ticketType.name,
          unitPriceCents: p.ticketType.priceCents,
          quantity: p.quantity,
          subtotalCents: p.itemSubtotal,
        })),
        subtotalCents,
        discountCents,
        totalAmountCents,
        currency: 'USD',
        promoCodeId: matchedPromo?.id,
        status: totalAmountCents === 0 ? 'COMPLETED' : 'PENDING_PAYMENT',
        paymentProvider: 'SANDBOX_MOCK',
        reservationExpiresAtUtc: expiresAt.toISOString(),
        createdAt: now.toISOString(),
        paidAtUtc: totalAmountCents === 0 ? now.toISOString() : undefined,
      };

      this.orders.set(order.id, order);

      // If $0 order (Free event or 100% discount), instantly issue tickets!
      if (totalAmountCents === 0) {
        // Convert reservations to sold
        for (const item of preparedItems) {
          item.ticketType.reservedQuantity = Math.max(0, item.ticketType.reservedQuantity - item.quantity);
          item.ticketType.soldQuantity += item.quantity;
        }
        if (matchedPromo) {
          matchedPromo.currentUses += 1;
        }
        // Emit tickets
        await this.generateTicketsForOrder(order);
      }

      return order;
    });
  }

  /**
   * Fulfils an order upon verified payment webhook.
   * Idempotent: safe against duplicate webhook deliveries.
   */
  public async fulfillOrderFromWebhook(params: {
    webhookEventId: string;
    orderId: string;
    paymentIntentId: string;
    amountCents: number;
    provider: 'STRIPE' | 'RAZORPAY' | 'SANDBOX_MOCK';
  }): Promise<{ order: Order; tickets: Ticket[]; isDuplicate: boolean }> {
    return this.withInventoryLock(async () => {
      // 1. Idempotency Check
      if (this.processedWebhooks.has(params.webhookEventId)) {
        const existingOrder = this.orders.get(params.orderId);
        const existingTickets = Array.from(this.tickets.values()).filter(t => t.orderId === params.orderId);
        return { order: existingOrder!, tickets: existingTickets, isDuplicate: true };
      }

      const order = this.orders.get(params.orderId);
      if (!order) {
        throw new Error(`Order ${params.orderId} not found`);
      }

      if (order.status === 'COMPLETED') {
        this.processedWebhooks.add(params.webhookEventId);
        const existingTickets = Array.from(this.tickets.values()).filter(t => t.orderId === params.orderId);
        return { order, tickets: existingTickets, isDuplicate: true };
      }

      // Check if order expired prior to webhook
      if (order.status === 'EXPIRED') {
        throw new Error('Order expired before payment was confirmed. Inventory must be re-checked or refunded.');
      }

      // 2. Mark order completed
      const now = new Date();
      order.status = 'COMPLETED';
      order.paymentIntentId = params.paymentIntentId;
      order.paidAtUtc = now.toISOString();

      // 3. Move items from reserved -> sold
      for (const item of order.items) {
        const ticketType = this.ticketTypes.get(item.ticketTypeId);
        if (ticketType) {
          ticketType.reservedQuantity = Math.max(0, ticketType.reservedQuantity - item.quantity);
          ticketType.soldQuantity += item.quantity;
        }
      }

      // Increment promo usage if any
      if (order.promoCodeId) {
        const promo = this.promoCodes.get(order.promoCodeId);
        if (promo) {
          promo.currentUses += 1;
        }
      }

      // 4. Generate signed cryptographic tickets with QR codes
      const tickets = await this.generateTicketsForOrder(order);

      // Record idempotency key
      this.processedWebhooks.add(params.webhookEventId);

      return { order, tickets, isDuplicate: false };
    });
  }

  /**
   * Emits signed tickets for an order with HMAC-SHA256 QR codes.
   */
  private async generateTicketsForOrder(order: Order): Promise<Ticket[]> {
    const createdTickets: Ticket[] = [];
    let ticketIndex = 1;

    for (const item of order.items) {
      for (let i = 0; i < item.quantity; i++) {
        const ticketId = `tkt_${Math.random().toString(36).substring(2, 10)}`;
        const ticketNumber = `${order.orderNumber}-T${ticketIndex++}`;
        const qrPayloadString = generateTicketQRPayload(ticketId, order.eventId);

        // Pre-generate QR data URL
        let qrCodeDataUrl = '';
        try {
          qrCodeDataUrl = await QRCode.toDataURL(qrPayloadString, {
            margin: 2,
            width: 300,
            color: {
              dark: '#0f172a',
              light: '#ffffff',
            },
          });
        } catch (e) {
          console.error('Failed to generate QR data URL:', e);
        }

        const ticket: Ticket = {
          id: ticketId,
          ticketNumber,
          orderId: order.id,
          eventId: order.eventId,
          ticketTypeId: item.ticketTypeId,
          ticketTypeName: item.ticketTypeName,
          attendeeName: order.buyerName,
          attendeeEmail: order.buyerEmail,
          qrPayloadString,
          qrCodeDataUrl,
          status: 'VALID',
          createdAt: new Date().toISOString(),
        };

        this.tickets.set(ticket.id, ticket);
        createdTickets.push(ticket);
      }
    }

    return createdTickets;
  }

  /**
   * Scans and marks a ticket as checked in.
   * Performs cryptographic signature validation, event matching, and prevents duplicate check-in.
   */
  public async scanAndCheckInTicket(params: {
    scannedQrPayload: string;
    targetEventId: string;
    staffIdentifier: string;
  }): Promise<{
    success: boolean;
    ticket?: Ticket;
    reason: string;
    log: CheckInLog;
  }> {
    const verification = verifyTicketQRPayload(params.scannedQrPayload, params.targetEventId);

    const logBase: Omit<CheckInLog, 'action' | 'notes'> = {
      id: `chk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ticketId: verification.ticketId || 'UNKNOWN',
      eventId: params.targetEventId,
      staffIdentifier: params.staffIdentifier,
      timestampUtc: new Date().toISOString(),
    };

    if (!verification.isValid || !verification.ticketId) {
      const log: CheckInLog = {
        ...logBase,
        action: verification.reason?.includes('Wrong Event') ? 'INVALID_EVENT' : 'EXPIRED_OR_VOID',
        notes: verification.reason || 'Invalid QR Token',
      };
      this.checkInLogs.push(log);
      return { success: false, reason: verification.reason || 'Invalid QR code', log };
    }

    const ticket = this.tickets.get(verification.ticketId);
    if (!ticket) {
      const log: CheckInLog = {
        ...logBase,
        action: 'EXPIRED_OR_VOID',
        notes: 'Ticket not found in database',
      };
      this.checkInLogs.push(log);
      return { success: false, reason: 'Ticket not found in system', log };
    }

    if (ticket.status === 'CHECKED_IN') {
      const log: CheckInLog = {
        ...logBase,
        ticketId: ticket.id,
        action: 'DUPLICATE_REJECTED',
        notes: `Already checked in at ${ticket.checkedInAtUtc} by ${ticket.checkedInBy}`,
      };
      this.checkInLogs.push(log);
      return {
        success: false,
        ticket,
        reason: `DUPLICATE TICKET! Already scanned at ${ticket.checkedInAtUtc}`,
        log,
      };
    }

    if (ticket.status !== 'VALID') {
      const log: CheckInLog = {
        ...logBase,
        ticketId: ticket.id,
        action: 'EXPIRED_OR_VOID',
        notes: `Ticket is in '${ticket.status}' status`,
      };
      this.checkInLogs.push(log);
      return {
        success: false,
        ticket,
        reason: `Ticket invalid: Current status is ${ticket.status}`,
        log,
      };
    }

    // Mark as checked in
    ticket.status = 'CHECKED_IN';
    ticket.checkedInAtUtc = new Date().toISOString();
    ticket.checkedInBy = params.staffIdentifier;

    const successLog: CheckInLog = {
      ...logBase,
      ticketId: ticket.id,
      action: 'SUCCESS',
      notes: `Checked in successfully for ${ticket.attendeeName}`,
    };
    this.checkInLogs.push(successLog);

    return {
      success: true,
      ticket,
      reason: 'Valid ticket. Admitted!',
      log: successLog,
    };
  }
}

export const store = new EventPassStore();
