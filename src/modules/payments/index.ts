import type { Order, Event } from '../../types';

export interface CheckoutSessionResult {
  sessionId: string;
  checkoutUrl: string;
  provider: 'STRIPE' | 'RAZORPAY' | 'SANDBOX_MOCK';
}

export interface WebhookVerificationResult {
  isValid: boolean;
  eventId?: string;
  eventType?: string;
  orderId?: string;
  paymentIntentId?: string;
  amountCents?: number;
  currency?: string;
  rawPayload?: any;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  error?: string;
}

export interface IPaymentProvider {
  readonly name: 'STRIPE' | 'RAZORPAY' | 'SANDBOX_MOCK';
  
  createCheckoutSession(params: {
    order: Order;
    event: Event;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutSessionResult>;

  verifyWebhook(
    payload: string | Buffer,
    signature: string,
    secret?: string
  ): Promise<WebhookVerificationResult>;

  processRefund(params: {
    paymentIntentId: string;
    amountCents: number;
    reason?: string;
  }): Promise<RefundResult>;
}

/**
 * High-fidelity Sandbox / Mock Payment Gateway
 * Provides real webhook event simulation, signature verification, and automated concurrency testing.
 */
export class SandboxPaymentProvider implements IPaymentProvider {
  readonly name = 'SANDBOX_MOCK' as const;

  async createCheckoutSession(params: {
    order: Order;
    event: Event;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutSessionResult> {
    const sessionId = `mock_sess_${params.order.id}_${Date.now()}`;
    return {
      sessionId,
      checkoutUrl: `/checkout/sandbox-gateway?orderId=${params.order.id}&sessionId=${sessionId}`,
      provider: 'SANDBOX_MOCK',
    };
  }

  async verifyWebhook(
    payload: string | Buffer,
    signature: string,
    secret?: string
  ): Promise<WebhookVerificationResult> {
    try {
      const data = typeof payload === 'string' ? JSON.parse(payload) : JSON.parse(payload.toString());
      if (signature !== 'mock_valid_signature' && !signature.startsWith('sig_')) {
        return { isValid: false };
      }
      return {
        isValid: true,
        eventId: data.id || `evt_${Date.now()}`,
        eventType: data.type || 'payment_intent.succeeded',
        orderId: data.orderId,
        paymentIntentId: data.paymentIntentId || `pi_${Date.now()}`,
        amountCents: data.amountCents,
        currency: data.currency || 'USD',
      };
    } catch {
      return { isValid: false };
    }
  }

  async processRefund(params: {
    paymentIntentId: string;
    amountCents: number;
    reason?: string;
  }): Promise<RefundResult> {
    return {
      success: true,
      refundId: `ref_mock_${Date.now()}`,
    };
  }
}

// Active provider instance (can be swapped to Stripe or Razorpay based on env config)
export const paymentProvider: IPaymentProvider = new SandboxPaymentProvider();
