import { store } from '../db/store';
import type { Event, TicketType } from '../types';

export interface ConcurrencyTestResult {
  totalRequests: number;
  initialStock: number;
  successfulPurchases: number;
  rejectedPurchases: number;
  oversold: boolean;
  finalReservedQuantity: number;
  finalAvailableQuantity: number;
  executionTimeMs: number;
  details: {
    requestId: number;
    status: 'SUCCESS' | 'REJECTED';
    orderId?: string;
    message?: string;
  }[];
}

/**
 * Fires 50 simultaneous purchase attempts at a ticket type with only 10 remaining tickets.
 * Demonstrates mathematical and transactional protection against overselling.
 */
export async function runConcurrencyTest(totalRequests: number = 50, initialStock: number = 10): Promise<ConcurrencyTestResult> {
  const startTime = Date.now();

  // Create isolated test event and ticket batch
  const testEventId = `evt_test_stress_${Date.now()}`;
  const testTicketTypeId = `tt_test_stress_${Date.now()}`;

  const testEvent: Event = {
    id: testEventId,
    organizerId: 'usr_org_1',
    slug: `stress-test-${Date.now()}`,
    title: 'Atomic Concurrency Validation Event',
    description: 'High concurrency stress test harness',
    category: 'Benchmark',
    coverImageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800',
    venueType: 'ONLINE',
    startTimeUtc: new Date(Date.now() + 86400000).toISOString(),
    endTimeUtc: new Date(Date.now() + 172800000).toISOString(),
    timezone: 'UTC',
    capacity: initialStock,
    status: 'PUBLISHED',
    isRecurring: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const testTicketType: TicketType = {
    id: testTicketTypeId,
    eventId: testEventId,
    name: 'Limited Flash Pass',
    priceCents: 5000,
    currency: 'USD',
    totalQuantity: initialStock,
    reservedQuantity: 0,
    soldQuantity: 0,
    perOrderLimit: 1, // 1 ticket per request
    createdAt: new Date().toISOString(),
  };

  store.events.set(testEvent.id, testEvent);
  store.ticketTypes.set(testTicketType.id, testTicketType);

  // Prepare 50 concurrent buyers
  const purchasePromises = Array.from({ length: totalRequests }, (_, idx) => {
    const buyerNum = idx + 1;
    return store.createOrderWithReservation({
      eventId: testEventId,
      buyerEmail: `stress_buyer_${buyerNum}@test.local`,
      buyerName: `Simulated Buyer #${buyerNum}`,
      items: [{ ticketTypeId: testTicketTypeId, quantity: 1 }],
    }).then(
      (order) => ({
        requestId: buyerNum,
        status: 'SUCCESS' as const,
        orderId: order.id,
        message: `Reserved successfully under Order ${order.orderNumber}`,
      }),
      (err) => ({
        requestId: buyerNum,
        status: 'REJECTED' as const,
        message: err instanceof Error ? err.message : String(err),
      })
    );
  });

  // Execute all 50 in parallel
  const results = await Promise.all(purchasePromises);
  const executionTimeMs = Date.now() - startTime;

  const successfulPurchases = results.filter(r => r.status === 'SUCCESS').length;
  const rejectedPurchases = results.filter(r => r.status === 'REJECTED').length;

  const updatedTicketType = store.ticketTypes.get(testTicketTypeId)!;
  const finalReservedQuantity = updatedTicketType.reservedQuantity;
  const finalAvailableQuantity = updatedTicketType.totalQuantity - (updatedTicketType.soldQuantity + updatedTicketType.reservedQuantity);
  const oversold = successfulPurchases > initialStock || finalReservedQuantity > initialStock;

  return {
    totalRequests,
    initialStock,
    successfulPurchases,
    rejectedPurchases,
    oversold,
    finalReservedQuantity,
    finalAvailableQuantity,
    executionTimeMs,
    details: results,
  };
}
