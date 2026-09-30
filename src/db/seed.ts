import { store } from './store';
import type { User, Event, TicketType, PromoCode } from '../types';

export async function seedDemoData() {
  if (store.users.size > 0) return; // Already seeded

  console.log('🌱 Seeding EventPass database with demo records...');

  // 1. Users
  const organizer: User = {
    id: 'usr_org_1',
    name: 'Sarah Chen (Summit Labs)',
    email: 'organizer@eventpass.io',
    role: 'ORGANIZER',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    createdAt: new Date().toISOString(),
  };

  const attendee: User = {
    id: 'usr_att_1',
    name: 'Alex Rivera',
    email: 'alex@example.com',
    role: 'ATTENDEE',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    createdAt: new Date().toISOString(),
  };

  const staff: User = {
    id: 'usr_stf_1',
    name: 'Marcus Door Staff',
    email: 'staff@eventpass.io',
    role: 'STAFF',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    createdAt: new Date().toISOString(),
  };

  const admin: User = {
    id: 'usr_adm_1',
    name: 'Platform Administrator',
    email: 'admin@eventpass.io',
    role: 'ADMIN',
    createdAt: new Date().toISOString(),
  };

  store.users.set(organizer.id, organizer);
  store.users.set(attendee.id, attendee);
  store.users.set(staff.id, staff);
  store.users.set(admin.id, admin);

  // 2. Events
  const event1: Event = {
    id: 'evt_techsummit_2026',
    organizerId: organizer.id,
    slug: 'global-ai-founders-summit-2026',
    title: 'Global AI & Cloud Founders Summit 2026',
    description: 'Join 1,200 founders, engineers, and investors exploring the next frontier of distributed computing, autonomous agents, and real-time inference. Includes keynote talks, VIP networking, and breakout workshops.',
    category: 'Technology & AI',
    coverImageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200',
    venueType: 'PHYSICAL',
    venueName: 'Metropolitan Pavilion & Hall B',
    venueAddress: '125 W 18th St, New York, NY 10011',
    mapUrl: 'https://maps.google.com/?q=Metropolitan+Pavilion+New+York',
    startTimeUtc: '2026-10-15T13:00:00Z',
    endTimeUtc: '2026-10-16T22:00:00Z',
    timezone: 'America/New_York',
    capacity: 1200,
    status: 'PUBLISHED',
    isRecurring: false,
    checkInPin: '482910',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const event2: Event = {
    id: 'evt_indierock_fest',
    organizerId: organizer.id,
    slug: 'sunset-indie-music-festival',
    title: 'Sunset Harbor Indie Music & Arts Fest',
    description: 'An open-air evening celebrating indie artists, food trucks, craft beer, and community art installations by the waterfront.',
    category: 'Music & Arts',
    coverImageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200',
    venueType: 'PHYSICAL',
    venueName: 'Pier 17 Rooftop Stage',
    venueAddress: '89 South St, New York, NY 10038',
    mapUrl: 'https://maps.google.com/?q=Pier+17+New+York',
    startTimeUtc: '2026-10-24T20:00:00Z',
    endTimeUtc: '2026-10-25T03:00:00Z',
    timezone: 'America/New_York',
    capacity: 650,
    status: 'PUBLISHED',
    isRecurring: false,
    checkInPin: '190472',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const event3: Event = {
    id: 'evt_nextjs_workshop',
    organizerId: organizer.id,
    slug: 'advanced-fullstack-masterclass',
    title: 'Advanced Full-Stack Web Architecture Live Masterclass',
    description: 'Interactive deep-dive on modern high-concurrency systems, distributed locking, and production observability. Delivered live over HD video with real-time Q&A.',
    category: 'Education & Workshops',
    coverImageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200',
    venueType: 'ONLINE',
    onlineMeetingUrl: 'https://meet.eventpass.io/room/fullstack-masterclass-2026',
    startTimeUtc: '2026-11-05T17:00:00Z',
    endTimeUtc: '2026-11-05T20:00:00Z',
    timezone: 'America/Chicago',
    capacity: 250,
    status: 'PUBLISHED',
    isRecurring: true,
    recurringFrequency: 'MONTHLY',
    checkInPin: '739281',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const draftEvent: Event = {
    id: 'evt_draft_hackathon',
    organizerId: organizer.id,
    slug: 'winter-solstice-hackathon-draft',
    title: 'Winter Solstice 48h Autonomous Agent Hackathon',
    description: 'Upcoming 48-hour sprint building frontier applications with prize pool over $50k. Currently finalizing sponsors.',
    category: 'Technology & AI',
    coverImageUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200',
    venueType: 'HYBRID',
    venueName: 'TechHub Downtown',
    venueAddress: '500 Howard St, San Francisco, CA',
    startTimeUtc: '2026-12-18T16:00:00Z',
    endTimeUtc: '2026-12-20T20:00:00Z',
    timezone: 'America/Los_Angeles',
    capacity: 300,
    status: 'DRAFT',
    isRecurring: false,
    checkInPin: '334918',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.events.set(event1.id, event1);
  store.events.set(event2.id, event2);
  store.events.set(event3.id, event3);
  store.events.set(draftEvent.id, draftEvent);

  // 3. Ticket Types
  const ttSummitEarly: TicketType = {
    id: 'tt_summit_early',
    eventId: event1.id,
    name: 'Early Bird General Admission',
    description: 'Full 2-day pass including all keynotes, stage sessions, and expo floor access.',
    priceCents: 19900, // $199.00
    currency: 'USD',
    totalQuantity: 200,
    reservedQuantity: 0,
    soldQuantity: 142,
    perOrderLimit: 4,
    createdAt: new Date().toISOString(),
  };

  const ttSummitVIP: TicketType = {
    id: 'tt_summit_vip',
    eventId: event1.id,
    name: 'VIP Founder & Investor Pass',
    description: 'All GA access + private speaker lounge, catered lunch, VIP afterparty, and priority seating.',
    priceCents: 59900, // $599.00
    currency: 'USD',
    totalQuantity: 80,
    reservedQuantity: 0,
    soldQuantity: 58,
    perOrderLimit: 2,
    createdAt: new Date().toISOString(),
  };

  const ttSummitVirtual: TicketType = {
    id: 'tt_summit_free_stream',
    eventId: event1.id,
    name: 'Virtual Keynote Live Stream (Free)',
    description: 'Access live broadcast of morning keynotes and downloadable summit transcripts.',
    priceCents: 0, // FREE
    currency: 'USD',
    totalQuantity: 1000,
    reservedQuantity: 0,
    soldQuantity: 340,
    perOrderLimit: 5,
    createdAt: new Date().toISOString(),
  };

  // Music Fest tickets
  const ttFestGA: TicketType = {
    id: 'tt_fest_ga',
    eventId: event2.id,
    name: 'General Admission Tier 1',
    description: 'Entry to all stages and pier viewing decks.',
    priceCents: 4500, // $45.00
    currency: 'USD',
    totalQuantity: 400,
    reservedQuantity: 0,
    soldQuantity: 215,
    perOrderLimit: 6,
    createdAt: new Date().toISOString(),
  };

  // Concurrency test demo ticket with only 10 remaining
  const ttConcurrencyDemo: TicketType = {
    id: 'tt_concurrency_stress',
    eventId: event2.id,
    name: 'Flash Sale Limited Backstage Pass (Stress Test Batch)',
    description: 'Ultra-limited run of 10 passes for testing 50 concurrent buyers.',
    priceCents: 9500, // $95.00
    currency: 'USD',
    totalQuantity: 10,
    reservedQuantity: 0,
    soldQuantity: 0,
    perOrderLimit: 1,
    createdAt: new Date().toISOString(),
  };

  store.ticketTypes.set(ttSummitEarly.id, ttSummitEarly);
  store.ticketTypes.set(ttSummitVIP.id, ttSummitVIP);
  store.ticketTypes.set(ttSummitVirtual.id, ttSummitVirtual);
  store.ticketTypes.set(ttFestGA.id, ttFestGA);
  store.ticketTypes.set(ttConcurrencyDemo.id, ttConcurrencyDemo);

  // 4. Promo codes
  const promo1: PromoCode = {
    id: 'promo_summit20',
    eventId: event1.id,
    code: 'SUMMIT20',
    discountType: 'PERCENTAGE',
    discountValue: 20, // 20% off
    maxUses: 100,
    currentUses: 14,
    createdAt: new Date().toISOString(),
  };

  const promoFree: PromoCode = {
    id: 'promo_vipguest',
    eventId: event1.id,
    code: 'VIPGUEST',
    discountType: 'PERCENTAGE',
    discountValue: 100, // 100% off
    maxUses: 20,
    currentUses: 3,
    createdAt: new Date().toISOString(),
  };

  store.promoCodes.set(promo1.id, promo1);
  store.promoCodes.set(promoFree.id, promoFree);

  // 5. Pre-generate a sample completed order and valid signed ticket for Alex
  const sampleOrder = await store.createOrderWithReservation({
    eventId: event1.id,
    buyerEmail: attendee.email,
    buyerName: attendee.name,
    buyerUserId: attendee.id,
    items: [
      { ticketTypeId: ttSummitEarly.id, quantity: 1 }
    ],
  });

  // Fulfill via simulated webhook to produce real signed QR ticket
  await store.fulfillOrderFromWebhook({
    webhookEventId: 'seed_evt_webhook_001',
    orderId: sampleOrder.id,
    paymentIntentId: 'pi_seed_demo_982341',
    amountCents: sampleOrder.totalAmountCents,
    provider: 'SANDBOX_MOCK',
  });

  console.log('✅ EventPass demo data seeded successfully!');
}
