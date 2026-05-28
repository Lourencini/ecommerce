import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const KEYS = {
  MP_ACCESS_TOKEN:   'mp_access_token',
  MP_WEBHOOK_SECRET: 'mp_webhook_secret',
} as const;

@Injectable()
export class AdminSettingsService {
  private readonly logger = new Logger(AdminSettingsService.name);

  constructor(private prisma: PrismaService) {}

  private async get(key: string): Promise<string | null> {
    const row = await this.prisma.setting.findUnique({ where: { key } });
    return row?.value ?? null;
  }

  private async set(key: string, value: string): Promise<void> {
    await this.prisma.setting.upsert({
      where:  { key },
      update: { value },
      create: { key, value },
    });
  }

  private mask(value: string | null): string | null {
    if (!value) return null;
    if (value.length <= 12) return '****';
    return `${value.slice(0, 7)}****${value.slice(-4)}`;
  }

  async getPaymentsConfig() {
    const [token, secret] = await Promise.all([
      this.get(KEYS.MP_ACCESS_TOKEN),
      this.get(KEYS.MP_WEBHOOK_SECRET),
    ]);

    return {
      accessTokenMasked: this.mask(token),
      isTokenSet:        !!token,
      isWebhookSet:      !!secret,
      environment:       token?.startsWith('TEST-') ? 'sandbox' : token ? 'production' : null,
    };
  }

  async updatePaymentsConfig(data: { accessToken?: string; webhookSecret?: string }) {
    if (data.accessToken)    await this.set(KEYS.MP_ACCESS_TOKEN,   data.accessToken);
    if (data.webhookSecret)  await this.set(KEYS.MP_WEBHOOK_SECRET, data.webhookSecret);
    return this.getPaymentsConfig();
  }

  async testConnection(): Promise<{ ok: boolean; accountEmail?: string; environment: string; message: string }> {
    const token = await this.get(KEYS.MP_ACCESS_TOKEN);
    if (!token) {
      return { ok: false, environment: 'none', message: 'Nenhum Access Token configurado.' };
    }

    try {
      const res = await fetch('https://api.mercadopago.com/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        return { ok: false, environment: 'unknown', message: 'Token inválido ou expirado.' };
      }

      const data = await res.json() as any;
      const environment = token.startsWith('TEST-') ? 'sandbox' : 'production';

      return {
        ok: true,
        accountEmail: data.email,
        environment,
        message: `Conectado com sucesso! (${environment})`,
      };
    } catch (err: any) {
      this.logger.error(`Erro ao testar conexão MP: ${err}`);
      return { ok: false, environment: 'unknown', message: 'Erro de rede ao conectar ao Mercado Pago.' };
    }
  }

  // Usado internamente pelo PaymentsService
  async getRawToken():         Promise<string | null> { return this.get(KEYS.MP_ACCESS_TOKEN);   }
  async getRawWebhookSecret(): Promise<string | null> { return this.get(KEYS.MP_WEBHOOK_SECRET); }
}
