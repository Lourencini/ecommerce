import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private mp: MercadoPagoConfig;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private email: EmailService,
  ) {
    this.mp = new MercadoPagoConfig({
      accessToken: this.config.get<string>('MERCADOPAGO_ACCESS_TOKEN', ''),
      options: { timeout: 5000 },
    });
  }

  private validateSignature(body: any, signature: string, requestId: string): boolean {
    const secret = this.config.get<string>('MERCADOPAGO_WEBHOOK_SECRET', '');
    if (!secret) return true; // pular validação se não configurado

    const ts   = signature.match(/ts=([^,]+)/)?.[1];
    const v1   = signature.match(/v1=([^,]+)/)?.[1];
    if (!ts || !v1) return false;

    const message  = `id:${body?.data?.id};request-id:${requestId};ts:${ts};`;
    const expected = crypto.createHmac('sha256', secret).update(message).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  }

  async createPreference(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, customer: true },
    });

    if (!order) throw new NotFoundException('Pedido não encontrado.');

    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    const preference = new Preference(this.mp);

    const result = await preference.create({
      body: {
        external_reference: order.id,
        items: order.items.map((item) => ({
          id: item.productId,
          title: item.productName,
          quantity: item.quantity,
          unit_price: Number(item.unitPrice),
          currency_id: 'BRL',
        })),
        payer: {
          name: order.customer.name,
          email: order.customer.email,
        },
        back_urls: {
          success: `${frontendUrl}/checkout/success`,
          failure: `${frontendUrl}/checkout/failure`,
          pending: `${frontendUrl}/checkout/pending`,
        },
        notification_url: `${this.config.get('API_URL', 'http://localhost:3001/api/v1')}/payments/webhook`,
        metadata: { order_id: order.id, order_number: order.orderNumber },
      },
    });

    // Salvar o ID da preferência no pedido
    await this.prisma.order.update({
      where: { id: orderId },
      data: { paymentIntentId: result.id },
    });

    return {
      preferenceId: result.id,
      initPoint: result.init_point,
      sandboxInitPoint: result.sandbox_init_point,
    };
  }

  async handleWebhook(body: any, signature?: string, requestId?: string) {
    this.logger.log(`[Webhook MP] type=${body.type} id=${body.data?.id}`);

    if (signature && requestId && !this.validateSignature(body, signature, requestId)) {
      this.logger.warn('[Webhook MP] Assinatura inválida — requisição ignorada');
      return { received: true };
    }

    if (body.type !== 'payment') return { received: true };

    const paymentId = body.data?.id;
    if (!paymentId) return { received: true };

    try {
      const payment = new Payment(this.mp);
      const paymentData = await payment.get({ id: paymentId });

      const orderId = paymentData.metadata?.order_id;
      if (!orderId) return { received: true };

      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true, customer: true },
      });
      if (!order) return { received: true };

      const status = paymentData.status;

      if (status === 'approved') {
        await this.prisma.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: 'PAID',
            paymentMethod: paymentData.payment_type_id ?? null,
          },
        });
        this.logger.log(`[Webhook MP] Pedido ${order.orderNumber} PAGO`);

        try {
          await this.email.sendOrderConfirmation({
            to: order.customer.email,
            customerName: order.customer.name,
            orderNumber: order.orderNumber,
            items: order.items.map((i) => ({
              name: i.productName,
              quantity: i.quantity,
              unitPrice: Number(i.unitPrice),
            })),
            total: Number(order.total),
            shippingService: order.shippingService ?? '',
          });
        } catch (mailErr) {
          this.logger.error(`[Webhook MP] Falha ao enviar e-mail: ${mailErr}`);
        }
      } else if (status === 'rejected' || status === 'cancelled') {
        await this.prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: 'FAILED' },
        });
        this.logger.log(`[Webhook MP] Pedido ${order.orderNumber} FALHOU (${status})`);
      }
    } catch (err) {
      this.logger.error(`[Webhook MP] Erro ao processar pagamento: ${err}`);
    }

    return { received: true };
  }
}
