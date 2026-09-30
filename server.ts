import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { store } from './src/db/store';
import { seedDemoData } from './src/db/seed';
import { AuthService } from './src/modules/auth/authService';
import { runConcurrencyTest } from './src/tests/concurrency';
import { paymentProvider } from './src/modules/payments';
import { CreateOrderRequestSchema } from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// JSON parser
app.use(express.json());

// Initialize seed data
seedDemoData().catch(err => console.error('Seed error:', err));

// ==========================================
// Auth API Endpoints
// ==========================================
app.get('/api/auth/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  const user = AuthService.getSessionUser(token);
  
  if (!user) {
    // Return default attendee or guest if no token provided
    const defaultUser = store.users.get('usr_att_1');
    return res.json({ user: defaultUser || null, authenticated: false });
  }

  return res.json({ user, authenticated: true });
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, role, name } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const { token, user } = await AuthService.requestMagicLink(email, role || 'ATTENDEE', name);
    return res.json({ token, user, message: 'Logged in successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/users', (_req: Request, res: Response) => {
  return res.json(Array.from(store.users.values()));
});

// Switch role convenience endpoint for demonstration
app.post('/api/auth/switch-demo-user', (req: Request, res: Response) => {
  const { role } = req.body;
  let targetUser = Array.from(store.users.values()).find(u => u.role === role);
  if (!targetUser) {
    // Return first user or default
    targetUser = Array.from(store.users.values())[0];
  }
  const token = AuthService.createSession(targetUser);
  return res.json({ token, user: targetUser });
});

// ==========================================
// Events API Endpoints
// ==========================================
app.get('/api/events', (_req: Request, res: Response) => {
  const events = Array.from(store.events.values());
  return res.json(events);
});

app.get('/api/events/:idOrSlug', (req: Request, res: Response) => {
  const { idOrSlug } = req.params;
  const event = Array.from(store.events.values()).find(e => e.id === idOrSlug || e.slug === idOrSlug);
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }

  const ticketTypes = Array.from(store.ticketTypes.values()).filter(t => t.eventId === event.id);
  const promoCodes = Array.from(store.promoCodes.values()).filter(p => p.eventId === event.id);

  return res.json({ event, ticketTypes, promoCodes });
});

// ==========================================
// Orders & Checkout API
// ==========================================
app.post('/api/orders/reserve', async (req: Request, res: Response) => {
  const parseResult = CreateOrderRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.issues[0]?.message || 'Invalid request body' });
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  const user = AuthService.getSessionUser(token);

  try {
    const order = await store.createOrderWithReservation({
      eventId: parseResult.data.eventId,
      buyerEmail: parseResult.data.buyerEmail,
      buyerName: parseResult.data.buyerName,
      buyerUserId: user?.id,
      items: parseResult.data.items,
      promoCode: parseResult.data.promoCode,
    });

    const event = store.events.get(order.eventId)!;
    const checkoutSession = await paymentProvider.createCheckoutSession({
      order,
      event,
      successUrl: `/order/confirmation?orderId=${order.id}`,
      cancelUrl: `/events/${event.slug}?orderCancelled=true`,
    });

    return res.json({ order, checkoutSession });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ==========================================
// Webhook Endpoint (Idempotent order fulfillment)
// ==========================================
app.post('/api/webhooks/payment', async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] || req.headers['x-mock-signature'] || 'mock_valid_signature';

  try {
    const verification = await paymentProvider.verifyWebhook(
      JSON.stringify(req.body),
      Array.isArray(signature) ? signature[0] : signature
    );

    if (!verification.isValid || !verification.orderId) {
      return res.status(400).json({ error: 'Invalid webhook signature or payload' });
    }

    const result = await store.fulfillOrderFromWebhook({
      webhookEventId: verification.eventId || `evt_${Date.now()}`,
      orderId: verification.orderId,
      paymentIntentId: verification.paymentIntentId || `pi_${Date.now()}`,
      amountCents: verification.amountCents || 0,
      provider: 'SANDBOX_MOCK',
    });

    return res.json({
      received: true,
      orderStatus: result.order.status,
      ticketsIssued: result.tickets.length,
      isDuplicate: result.isDuplicate,
    });
  } catch (err: any) {
    console.error('Webhook processing error:', err);
    return res.status(400).json({ error: err.message });
  }
});

// ==========================================
// Scan & Check-in Endpoint
// ==========================================
app.post('/api/tickets/scan', async (req: Request, res: Response) => {
  const { scannedQrPayload, targetEventId, staffIdentifier, checkInPin } = req.body;

  if (!scannedQrPayload || !targetEventId) {
    return res.status(400).json({ error: 'scannedQrPayload and targetEventId are required' });
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  const user = AuthService.getSessionUser(token);

  const canScan = AuthService.canScanForEvent(user, targetEventId, checkInPin);
  if (!canScan) {
    return res.status(403).json({ error: 'Unauthorized to check in tickets for this event. Invalid PIN or account.' });
  }

  try {
    const scanResult = await store.scanAndCheckInTicket({
      scannedQrPayload,
      targetEventId,
      staffIdentifier: staffIdentifier || user?.name || 'Staff Door Attendant',
    });

    return res.json(scanResult);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// Concurrency Benchmark Endpoint
// ==========================================
app.post('/api/benchmark/concurrency', async (req: Request, res: Response) => {
  const { requests = 50, stock = 10 } = req.body;
  try {
    const result = await runConcurrencyTest(Number(requests), Number(stock));
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// Store Diagnostics & Schema State
// ==========================================
app.get('/api/diagnostics/state', (_req: Request, res: Response) => {
  return res.json({
    counts: {
      users: store.users.size,
      events: store.events.size,
      ticketTypes: store.ticketTypes.size,
      promoCodes: store.promoCodes.size,
      orders: store.orders.size,
      tickets: store.tickets.size,
      checkInLogs: store.checkInLogs.length,
      processedWebhooks: store.processedWebhooks.size,
    },
    sampleTickets: Array.from(store.tickets.values()).slice(0, 5),
    sampleOrders: Array.from(store.orders.values()).slice(0, 5),
  });
});

// ==========================================
// Setup Vite in Dev or Static in Production
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`🚀 EventPass Full-Stack Server running on port ${PORT}`);
  });
}

startServer();
