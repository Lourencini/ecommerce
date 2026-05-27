import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;
  private from: string;

  constructor(private config: ConfigService) {
    this.resend = new Resend(config.get<string>('RESEND_API_KEY', ''));
    this.from = config.get<string>('EMAIL_FROM', 'E-3D Print <noreply@e3dprint.com>');
  }

  async sendOrderConfirmation(params: {
    to: string;
    customerName: string;
    orderNumber: string;
    items: { name: string; quantity: number; unitPrice: number }[];
    total: number;
    shippingService: string;
  }) {
    const itemsHtml = params.items
      .map(
        (item) =>
          `<tr>
            <td style="padding:8px 0; border-bottom:1px solid #e2e8f0">${item.name}</td>
            <td style="padding:8px 0; border-bottom:1px solid #e2e8f0; text-align:center">${item.quantity}</td>
            <td style="padding:8px 0; border-bottom:1px solid #e2e8f0; text-align:right">R$ ${(item.unitPrice * item.quantity).toFixed(2).replace('.', ',')}</td>
          </tr>`,
      )
      .join('');

    const html = `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff">
        <h1 style="color:#6d28d9;font-size:24px;margin-bottom:8px">E-3D Print</h1>
        <p style="color:#64748b;margin-bottom:24px">Impressões 3D Premium</p>

        <h2 style="font-size:20px;margin-bottom:4px">Pedido Confirmado! 🎉</h2>
        <p style="color:#64748b">Olá, <strong>${params.customerName}</strong>! Recebemos seu pedido.</p>

        <div style="background:#f8fafc;border-radius:12px;padding:16px;margin:24px 0">
          <p style="margin:0;font-size:14px;color:#64748b">Número do pedido</p>
          <p style="margin:4px 0 0;font-size:20px;font-weight:800;color:#6d28d9">${params.orderNumber}</p>
        </div>

        <h3 style="margin-bottom:12px">Itens do Pedido</h3>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="border-bottom:2px solid #e2e8f0">
              <th style="text-align:left;padding:8px 0;color:#64748b;font-size:13px">Produto</th>
              <th style="text-align:center;padding:8px 0;color:#64748b;font-size:13px">Qtd</th>
              <th style="text-align:right;padding:8px 0;color:#64748b;font-size:13px">Total</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>

        <div style="margin-top:16px;text-align:right">
          <p style="font-size:18px;font-weight:800;color:#6d28d9">
            Total: R$ ${params.total.toFixed(2).replace('.', ',')}
          </p>
        </div>

        <p style="background:#dbeafe;border-radius:8px;padding:12px;font-size:14px;color:#1e40af">
          🚚 Envio via <strong>${params.shippingService}</strong>.
          Você receberá um e-mail quando seu pedido for enviado com o código de rastreio.
        </p>

        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
        <p style="font-size:12px;color:#94a3b8;text-align:center">
          E-3D Print — Impressões 3D Premium<br>
          Dúvidas? Responda este e-mail.
        </p>
      </div>
    `;

    try {
      await this.resend.emails.send({
        from: this.from,
        to: params.to,
        subject: `✅ Pedido ${params.orderNumber} confirmado — E-3D Print`,
        html,
      });
      this.logger.log(`Email de confirmação enviado para ${params.to}`);
    } catch (err) {
      this.logger.error(`Falha ao enviar email: ${err}`);
    }
  }

  async sendShippingNotification(params: {
    to: string;
    customerName: string;
    orderNumber: string;
    trackingCode: string;
    carrier: string;
  }) {
    const trackingUrl = `https://www.linketrack.com/track/${params.trackingCode}`;

    const html = `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff">
        <h1 style="color:#6d28d9;font-size:24px;margin-bottom:8px">E-3D Print</h1>

        <h2 style="font-size:20px;margin-bottom:4px">Seu pedido foi enviado! 🚀</h2>
        <p style="color:#64748b">Olá, <strong>${params.customerName}</strong>!</p>

        <p>Seu pedido <strong>${params.orderNumber}</strong> saiu para entrega.</p>

        <div style="background:#d1fae5;border-radius:12px;padding:16px;margin:24px 0">
          <p style="margin:0;font-size:14px;color:#065f46">Código de Rastreio (${params.carrier})</p>
          <p style="margin:4px 0 0;font-size:22px;font-weight:800;color:#065f46;letter-spacing:2px">${params.trackingCode}</p>
        </div>

        <a href="${trackingUrl}" style="display:inline-block;background:#6d28d9;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
          Rastrear Entrega
        </a>

        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
        <p style="font-size:12px;color:#94a3b8;text-align:center">E-3D Print — Impressões 3D Premium</p>
      </div>
    `;

    try {
      await this.resend.emails.send({
        from: this.from,
        to: params.to,
        subject: `📦 Pedido ${params.orderNumber} enviado! Rastreio: ${params.trackingCode}`,
        html,
      });
      this.logger.log(`Email de envio enviado para ${params.to}`);
    } catch (err) {
      this.logger.error(`Falha ao enviar email de envio: ${err}`);
    }
  }
}
