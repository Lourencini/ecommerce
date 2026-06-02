import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { AdminSettingsService } from '../admin/admin-settings.service';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private email: EmailService,
    private settings: AdminSettingsService,
  ) {}

  private async getMpClient(): Promise<{ mp: MercadoPagoConfig; token: string }> {
    const dbToken = await this.settings.getRawToken();
    const token   = dbToken || this.config.get<string>('MERCADOPAGO_ACCESS_TOKEN', '');
    const mp      = new MercadoPagoConfig({ accessToken: token, options: { timeout: 5000 } });
    return { mp, token };
  }

  private async getWebhookSecret(): Promise<string> {
    const dbSecret = await this.settings.getRawWebhookSecret();
    return dbSecret || this.config.get<string>('MERCADOPAGO_WEBHOOK_SECRET', '');
  }

  private validateSignature(body: any, signature: string, requestId: string, secret: string): boolean {
    if (!secret) return true;

    const ts = signature.match(/ts=([^,]+)/)?.[1];
    const v1 = signature.match(/v1=([^,]+)/)?.[1];
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

    const { mp, token } = await this.getMpClient();

    if (!token) {
      throw new UnprocessableEntityException(
        'Gateway de pagamento não configurado. Configure o Access Token do Mercado Pago no painel admin.',
      );
    }

    const frontendUrl    = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const apiUrl         = this.config.get<string>('API_URL',      'http://localhost:3001/api/v1');
    const isLocalhost = frontendUrl.includes('localhost') || apiUrl.includes('localhost');

    // auto_return exige back_urls.success publicamente acessível — desabilita em localhost
    const autoReturn = isLocalhost ? undefined : ('approved' as const);

    const nameParts   = order.customer.name.trim().split(/\s+/);
    const payerName   = nameParts[0];
    const payerSurname = nameParts.slice(1).join(' ') || payerName;

    const items = order.items.map((item) => ({
      id:          item.productId,
      title:       item.productName,
      quantity:    item.quantity,
      unit_price:  parseFloat(Number(item.unitPrice).toFixed(2)),
      currency_id: 'BRL',
    }));

    this.logger.log(`[MP] Payload → payer: ${JSON.stringify({ name: payerName, surname: payerSurname, email: order.customer.email })}`);
    this.logger.log(`[MP] Payload → items: ${JSON.stringify(items)}`);

    try {
      const preference = new Preference(mp);
      const result = await preference.create({
        body: {
          external_reference: order.id,
          items,
          payer: {
            name:    payerName,
            surname: payerSurname,
            email:   order.customer.email,
          },
          back_urls: {
            success: `${frontendUrl}/checkout/success`,
            failure: `${frontendUrl}/checkout/failure`,
            pending: `${frontendUrl}/checkout/pending`,
          },
          ...(autoReturn && { auto_return: autoReturn }),
          notification_url: isLocalhost ? undefined : `${apiUrl}/payments/webhook`,
          metadata: { order_id: order.id, order_number: order.orderNumber },
        },
      });

      await this.prisma.order.update({
        where: { id: orderId },
        data:  { paymentIntentId: result.id },
      });

      return {
        preferenceId:     result.id,
        initPoint:        result.init_point,
        sandboxInitPoint: result.sandbox_init_point,
      };
    } catch (err: any) {
      const errInfo = { message: err?.message, status: err?.status, cause: err?.cause };
      this.logger.error(`[MP] Erro completo: ${JSON.stringify(errInfo)}`);

      const causes = Array.isArray(err?.cause)
        ? err.cause.map((c: any) => c.description || c.message || JSON.stringify(c)).join(' | ')
        : (err?.cause?.message ?? err?.cause ?? '');

      const mpMessage = (causes as string) || err?.message || 'Erro desconhecido';
      throw new UnprocessableEntityException(`Erro ao processar pagamento: ${mpMessage}`);
    }
  }

  async handleWebhook(body: any, signature?: string, requestId?: string) {
    this.logger.log(`[Webhook MP] type=${body.type} id=${body.data?.id}`);

    if (signature && requestId) {
      const secret = await this.getWebhookSecret();
      if (!this.validateSignature(body, signature, requestId, secret)) {
        this.logger.warn('[Webhook MP] Assinatura inválida — requisição ignorada');
        return { received: true };
      }
    }

    if (body.type !== 'payment') return { received: true };

    const paymentId = body.data?.id;
    if (!paymentId) return { received: true };

    try {
      const { mp } = await this.getMpClient();
      const payment = new Payment(mp);
      const paymentData = await payment.get({ id: paymentId });

      const orderId = paymentData.metadata?.order_id;
      if (!orderId) return { received: true };

      const order = await this.prisma.order.findUnique({
        where:   { id: orderId },
        include: { items: true, customer: true },
      });
      if (!order) return { received: true };

      const status = paymentData.status;

      if (status === 'approved') {
        await this.prisma.order.update({
          where: { id: orderId },
          data:  { paymentStatus: 'PAID', paymentMethod: paymentData.payment_type_id ?? null },
        });
        this.logger.log(`[Webhook MP] Pedido ${order.orderNumber} PAGO`);

        try {
          await this.email.sendOrderConfirmation({
            to:             order.customer.email,
            customerName:   order.customer.name,
            orderNumber:    order.orderNumber,
            items:          order.items.map((i) => ({
              name:       i.productName,
              quantity:   i.quantity,
              unitPrice:  Number(i.unitPrice),
            })),
            total:          Number(order.total),
            shippingService: order.shippingService ?? '',
          });
        } catch (mailErr) {
          this.logger.error(`[Webhook MP] Falha ao enviar e-mail: ${mailErr}`);
        }
      } else if (status === 'rejected' || status === 'cancelled') {
        await this.prisma.order.update({
          where: { id: orderId },
          data:  { paymentStatus: 'FAILED' },
        });
        this.logger.log(`[Webhook MP] Pedido ${order.orderNumber} FALHOU (${status})`);
      }
    } catch (err) {
      this.logger.error(`[Webhook MP] Erro ao processar pagamento: ${err}`);
    }

    return { received: true };
  }
}
