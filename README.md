# EventPass - Event Ticketing & QR Check-in Platform

EventPass is a production-grade, high-concurrency event scheduling, ticket sales, and admissions platform designed to handle flash sales with zero overselling, cryptographic QR admissions, and modular payment providers.

---

## 🏛️ System Architecture

### 1. Unified Full-Stack Architecture
- **Frontend**: React 19 SPA with TypeScript, Tailwind CSS, Lucide icons, responsive mobile-first UI.
- **Backend API**: Node.js Express server (`server.ts`) hosting REST endpoints, concurrency-locked state machine, and Vite middlewares.
- **Database Model**: Strict relational schema with atomic conditional updates and transaction locks.
- **Crypto & Security**: Server-side HMAC-SHA256 signature generation and validation for ticket QR codes.

---

## 🗄️ Database Schema & Data Models

### Entities
1. **User**: `id`, `email`, `name`, `role` (`ORGANIZER` | `ATTENDEE` | `STAFF` | `ADMIN`), `createdAt`.
2. **Event**: `id`, `organizerId`, `slug`, `title`, `description`, `category`, `coverImageUrl`, `venueType` (`PHYSICAL` | `ONLINE` | `HYBRID`), `venueName`, `venueAddress`, `mapUrl`, `onlineMeetingUrl`, `startTimeUtc`, `endTimeUtc`, `timezone` (IANA format), `capacity`, `status` (`DRAFT` | `PUBLISHED` | `CANCELLED`), `checkInPin`.
3. **TicketType**: `id`, `eventId`, `name`, `description`, `priceCents` (integer), `currency`, `totalQuantity`, `reservedQuantity`, `soldQuantity`, `perOrderLimit`, `salesStartUtc`, `salesEndUtc`.
4. **PromoCode**: `id`, `eventId`, `code`, `discountType` (`PERCENTAGE` | `FIXED`), `discountValue`, `maxUses`, `currentUses`, `validUntilUtc`.
5. **Order**: `id`, `orderNumber`, `eventId`, `buyerUserId`, `buyerEmail`, `buyerName`, `items[]`, `subtotalCents`, `discountCents`, `totalAmountCents`, `currency`, `promoCodeId`, `status` (`PENDING_PAYMENT` | `COMPLETED` | `REFUNDED` | `CANCELLED` | `EXPIRED`), `paymentProvider`, `paymentIntentId`, `reservationExpiresAtUtc`.
6. **Ticket**: `id`, `ticketNumber`, `orderId`, `eventId`, `ticketTypeId`, `ticketTypeName`, `attendeeName`, `attendeeEmail`, `qrPayloadString`, `qrCodeDataUrl`, `status` (`VALID` | `CHECKED_IN` | `TRANSFERRED` | `REFUNDED`), `checkedInAtUtc`, `checkedInBy`.
7. **CheckInLog**: `id`, `ticketId`, `eventId`, `staffIdentifier`, `timestampUtc`, `action` (`SUCCESS` | `DUPLICATE_REJECTED` | `INVALID_EVENT` | `EXPIRED_OR_VOID`), `notes`.
8. **WebhookLog**: `id`, `provider`, `providerEventId`, `eventType`, `processedAtUtc`.

---

## 🔒 Concurrency & "Zero-Overselling" Guarantee

### The Problem
During flash ticket sales, multiple buyers simultaneously click "Checkout" when only a handful of tickets remain. Standard read-modify-write patterns result in race conditions and overselling.

### The EventPass Solution
1. **Atomic Serialized Transaction Mutex**:
   - Every reservation request executes through an isolated, FIFO-ordered lock.
2. **Conditional Stock Verification**:
   - `available = totalQuantity - (soldQuantity + reservedQuantity)`
   - If `available < requestedQuantity`, the request is aborted immediately with zero state mutation.
3. **10-Minute Hold Window**:
   - Inventory is held in `reservedQuantity` for exactly 10 minutes.
   - An automated background worker releases expired holds back to public inventory every 30 seconds.
4. **Webhook Fulfillment**:
   - Once payment is confirmed by webhook, `reservedQuantity` transitions permanently to `soldQuantity` and signed QR tickets are minted.
5. **Automated Concurrency Stress Test**:
   - Fires 50 simultaneous parallel requests at a batch of 10 remaining tickets.
   - Mathematically verified: Exactly 10 succeed, 40 reject, and oversold count = 0.

---

## 💳 Pluggable Payment Provider Interface

Payment processing is fully isolated behind the `IPaymentProvider` interface:
```typescript
interface IPaymentProvider {
  createCheckoutSession(params): Promise<CheckoutSessionResult>;
  verifyWebhook(payload, signature): Promise<WebhookVerificationResult>;
  processRefund(params): Promise<RefundResult>;
}
```
Available providers:
- `StripePaymentProvider` (Stripe Checkout sessions & webhooks)
- `RazorpayPaymentProvider` (Razorpay order tokens & webhook signatures)
- `SandboxPaymentProvider` (Built-in simulation with instant test payments & webhooks)

---

## 🎫 Cryptographic QR Admission Tokens

Tickets cannot be forged by altering URL parameters or copying numbers. Each ticket QR encodes:
```json
{
  "ticketId": "tkt_8x29a...",
  "eventId": "evt_summit_2026",
  "issuedAt": 1790812900000,
  "signature": "hmac_sha256_hex_hash"
}
```
Door staff scanners check:
1. **Cryptographic Integrity**: HMAC-SHA256 hash matches the server's private secret.
2. **Event Match**: Prevents using a ticket from Event A to enter Event B.
3. **Double-Scan Prevention**: Immediate rejection with exact timestamp of first scan.

---

## 👥 Role-Based Access Control (RBAC)

| Capability | Attendee | Staff | Organizer | Admin |
| :--- | :---: | :---: | :---: | :---: |
| Browse & Search Events | ✅ | ✅ | ✅ | ✅ |
| Purchase Tickets & Apply Promo | ✅ | ✅ | ✅ | ✅ |
| View "My Tickets" & Download QR | ✅ | ✅ | ✅ | ✅ |
| Scan QR Tickets (Assigned Events) | ❌ | ✅ | ✅ | ✅ |
| Create & Publish Events | ❌ | ❌ | ✅ | ✅ |
| Manage Ticket Types & Capacities | ❌ | ❌ | ✅ | ✅ |
| Issue Refunds & Export Attendee CSV | ❌ | ❌ | ✅ | ✅ |
| Unpublish Any Event Platform-wide | ❌ | ❌ | ❌ | ✅ |

---

## 🚀 How to Run & Test Phase 1

1. Start the development server:
   ```bash
   npm run dev
   ```
2. Open the app in your browser (defaults to port 3000).
3. Use the **Role Switcher** in the top navigation bar to test permissions as:
   - **Sarah Chen (Organizer)**
   - **Alex Rivera (Attendee)**
   - **Marcus (Staff)**
   - **Platform Admin**
4. Explore the **Phase 1 Architecture Explorer & Concurrency Tester**:
   - Run the live **50 Concurrent Purchases vs 10 Tickets** stress test.
   - Verify the cryptographic HMAC QR validator against valid and counterfeit tokens.
   - Inspect the live transactional database schema state.
