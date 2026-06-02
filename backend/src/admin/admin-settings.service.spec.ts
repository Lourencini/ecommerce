import { Test, TestingModule } from '@nestjs/testing';
import { AdminSettingsService } from './admin-settings.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  setting: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
};

describe('AdminSettingsService', () => {
  let service: AdminSettingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminSettingsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AdminSettingsService>(AdminSettingsService);
    jest.clearAllMocks();
  });

  // ── getPaymentsConfig ────────────────────────────────────
  describe('getPaymentsConfig', () => {
    it('retorna isTokenSet=false quando nenhum token está salvo', async () => {
      mockPrisma.setting.findUnique.mockResolvedValue(null);
      const result = await service.getPaymentsConfig();
      expect(result.isTokenSet).toBe(false);
      expect(result.isWebhookSet).toBe(false);
      expect(result.accessTokenMasked).toBeNull();
      expect(result.environment).toBeNull();
    });

    it('retorna token mascarado e ambiente sandbox para token TEST-', async () => {
      mockPrisma.setting.findUnique
        .mockResolvedValueOnce({ key: 'mp_access_token', value: 'TEST-abc123456789xyz' })
        .mockResolvedValueOnce(null);

      const result = await service.getPaymentsConfig();
      expect(result.isTokenSet).toBe(true);
      expect(result.environment).toBe('sandbox');
      expect(result.accessTokenMasked).toContain('****');
      expect(result.accessTokenMasked).not.toBe('TEST-abc123456789xyz');
    });

    it('retorna ambiente production para token APP_USR-', async () => {
      mockPrisma.setting.findUnique
        .mockResolvedValueOnce({ key: 'mp_access_token', value: 'APP_USR-123456789' })
        .mockResolvedValueOnce({ key: 'mp_webhook_secret', value: 'secret123' });

      const result = await service.getPaymentsConfig();
      expect(result.environment).toBe('production');
      expect(result.isWebhookSet).toBe(true);
    });

    it('mascara token curto com apenas ****', async () => {
      mockPrisma.setting.findUnique
        .mockResolvedValueOnce({ key: 'mp_access_token', value: 'short' })
        .mockResolvedValueOnce(null);

      const result = await service.getPaymentsConfig();
      expect(result.accessTokenMasked).toBe('****');
    });
  });

  // ── updatePaymentsConfig ─────────────────────────────────
  describe('updatePaymentsConfig', () => {
    it('salva access token quando fornecido', async () => {
      mockPrisma.setting.upsert.mockResolvedValue({});
      mockPrisma.setting.findUnique.mockResolvedValue(null);

      await service.updatePaymentsConfig({ accessToken: 'TEST-newtoken' });
      expect(mockPrisma.setting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { key: 'mp_access_token' }, create: expect.objectContaining({ value: 'TEST-newtoken' }) }),
      );
    });

    it('salva webhook secret quando fornecido', async () => {
      mockPrisma.setting.upsert.mockResolvedValue({});
      mockPrisma.setting.findUnique.mockResolvedValue(null);

      await service.updatePaymentsConfig({ webhookSecret: 'my-secret' });
      expect(mockPrisma.setting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { key: 'mp_webhook_secret' } }),
      );
    });

    it('não chama upsert quando campos estão vazios', async () => {
      mockPrisma.setting.findUnique.mockResolvedValue(null);
      await service.updatePaymentsConfig({});
      expect(mockPrisma.setting.upsert).not.toHaveBeenCalled();
    });

    it('retorna config atualizada após salvar', async () => {
      mockPrisma.setting.upsert.mockResolvedValue({});
      mockPrisma.setting.findUnique
        .mockResolvedValueOnce({ key: 'mp_access_token', value: 'TEST-newtoken' })
        .mockResolvedValueOnce(null);

      const result = await service.updatePaymentsConfig({ accessToken: 'TEST-newtoken' });
      expect(result.isTokenSet).toBe(true);
    });
  });

  // ── testConnection ───────────────────────────────────────
  describe('testConnection', () => {
    beforeEach(() => {
      global.fetch = jest.fn() as any;
    });

    it('retorna erro quando nenhum token está configurado', async () => {
      mockPrisma.setting.findUnique.mockResolvedValue(null);
      const result = await service.testConnection();
      expect(result.ok).toBe(false);
      expect(result.message).toContain('Nenhum Access Token');
    });

    it('retorna ok=true com email da conta quando token é válido', async () => {
      mockPrisma.setting.findUnique.mockResolvedValue({ value: 'TEST-valid-token' });
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 200,
        json: () => Promise.resolve({ email: 'test@testuser.com', site_id: 'MLB' }),
      });

      const result = await service.testConnection();
      expect(result.ok).toBe(true);
      expect(result.accountEmail).toBe('test@testuser.com');
      expect(result.environment).toBe('sandbox');
    });

    it('retorna ok=false com mensagem de token inválido quando recebe 401', async () => {
      mockPrisma.setting.findUnique.mockResolvedValue({ value: 'TEST-invalid' });
      (global.fetch as jest.Mock).mockResolvedValue({ status: 401, json: () => Promise.resolve({}) });

      const result = await service.testConnection();
      expect(result.ok).toBe(false);
      expect(result.message).toContain('inválido');
    });

    it('retorna ok=false quando fetch lança erro de rede', async () => {
      mockPrisma.setting.findUnique.mockResolvedValue({ value: 'TEST-tok' });
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await service.testConnection();
      expect(result.ok).toBe(false);
      expect(result.message).toContain('rede');
    });
  });

  // ── getRawToken / getRawWebhookSecret ────────────────────
  describe('getRawToken e getRawWebhookSecret', () => {
    it('retorna o valor do token do banco', async () => {
      mockPrisma.setting.findUnique.mockResolvedValue({ value: 'APP_USR-123' });
      expect(await service.getRawToken()).toBe('APP_USR-123');
    });

    it('retorna null quando token não está salvo', async () => {
      mockPrisma.setting.findUnique.mockResolvedValue(null);
      expect(await service.getRawToken()).toBeNull();
    });

    it('retorna o webhook secret do banco', async () => {
      mockPrisma.setting.findUnique.mockResolvedValue({ value: 'my-secret' });
      expect(await service.getRawWebhookSecret()).toBe('my-secret');
    });
  });
});
