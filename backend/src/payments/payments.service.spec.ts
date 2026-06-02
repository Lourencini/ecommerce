import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { AdminSettingsService } from '../admin/admin-settings.service';

// Mock do SDK do Mercado Pago
const mockPreferenceCreate = jest.fn();
const mockPaymentGet = jest.fn();

jest.mock('mercadopago', () => ({
  MercadoPagoConfig: jest.fn().mockImplementation(() => ({})),
  Preference: jest.fn().mockImplementation(() => ({ create: mockPreferenceCreate })),
  Payment: jest.fn().mockImplementation(() => ({ get: mockPaymentGet })),
}));

const ORDER_ID = 'order-uuid-001';

const mockOrder = {
  id: ORDER_ID,
  orderNumber: '#2024-00001',
  total: 99.9,
  totalShipping: 15,
  shippingService: 'SEDEX',
  status: 'PENDING',
  paymentStatus: 'PENDING',
  customer: { id: 'cust-001', name: 'João Silva', email: 'joao@email.com' },
  items: [
    { productId: 'prod-001', productName: 'Produto Teste', quantity: 2, unitPrice: 42.45 },
  ],
};

const mockPrisma = {
  order: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const mockConfig = {
  get: jest.fn().mockImplementation((key: string, fallback?: string) => {
    const vals: Record<string, string> = {
      FRONTEND_URL: 'http://localhost:3000',
      API_URL:      'http://localhost:3001/api/v1',
    };
    return vals[key] ?? fallback ?? '';
  }),
};

const mockEmail = { sendOrderConfirmation: jest.fn() };
const mockSettings = {
  getRawToken:         jest.fn(),
  getRawWebhookSecret: jest.fn(),
};

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService,        useValue: mockPrisma   },
        { provide: ConfigService,        useValue: mockConfig   },
        { provide: EmailService,         useValue: mockEmail    },
        { provide: AdminSettingsService, useValue: mockSettings },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    jest.clearAllMocks();
    mockSettings.getRawToken.mockResolvedValue('TEST-valid-token');
    mockSettings.getRawWebhookSecret.mockResolvedValue('webhook-secret');
  });

  // ── createPreference ─────────────────────────────────────
  describe('createPreference', () => {
    it('cria preferência com sucesso e retorna initPoint', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.order.update.mockResolvedValue(mockOrder);
      mockPreferenceCreate.mockResolvedValue({
        id: 'pref-123',
        init_point: 'https://mp.com/checkout/pref-123',
        sandbox_init_point: 'https://sandbox.mp.com/checkout/pref-123',
      });

      const result = await service.createPreference(ORDER_ID);
      expect(result.preferenceId).toBe('pref-123');
      expect(result.initPoint).toContain('pref-123');
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { paymentIntentId: 'pref-123' } }),
      );
    });

    it('lança NotFoundException quando pedido não existe', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);
      await expect(service.createPreference(ORDER_ID)).rejects.toThrow(NotFoundException);
      expect(mockPreferenceCreate).not.toHaveBeenCalled();
    });

    it('lança UnprocessableEntityException quando token não está configurado', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockSettings.getRawToken.mockResolvedValue(null);

      await expect(service.createPreference(ORDER_ID)).rejects.toThrow(UnprocessableEntityException);
    });

    it('não envia auto_return e notification_url em localhost', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.order.update.mockResolvedValue(mockOrder);
      mockPreferenceCreate.mockResolvedValue({ id: 'p1', init_point: 'url', sandbox_init_point: 'url2' });

      await service.createPreference(ORDER_ID);
      const body = mockPreferenceCreate.mock.calls[0][0].body;
      expect(body.auto_return).toBeUndefined();
      expect(body.notification_url).toBeUndefined();
    });

    it('envia auto_return e notification_url em produção', async () => {
      mockConfig.get.mockImplementation((key: string, fb?: string) => {
        if (key === 'FRONTEND_URL') return 'https://loja.com';
        if (key === 'API_URL') return 'https://api.loja.com/api/v1';
        return fb ?? '';
      });
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.order.update.mockResolvedValue(mockOrder);
      mockPreferenceCreate.mockResolvedValue({ id: 'p2', init_point: 'url', sandbox_init_point: 'url2' });

      await service.createPreference(ORDER_ID);
      const body = mockPreferenceCreate.mock.calls[0][0].body;
      expect(body.auto_return).toBe('approved');
      expect(body.notification_url).toContain('payments/webhook');
    });

    it('lança UnprocessableEntityException quando SDK lança erro', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPreferenceCreate.mockRejectedValue(new Error('MP API error'));

      await expect(service.createPreference(ORDER_ID)).rejects.toThrow(UnprocessableEntityException);
    });

    it('separa nome e sobrenome do cliente corretamente', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        customer: { ...mockOrder.customer, name: 'Maria Clara Santos' },
      });
      mockPrisma.order.update.mockResolvedValue(mockOrder);
      mockPreferenceCreate.mockResolvedValue({ id: 'p3', init_point: 'u', sandbox_init_point: 'u2' });

      await service.createPreference(ORDER_ID);
      const { payer } = mockPreferenceCreate.mock.calls[0][0].body;
      expect(payer.name).toBe('Maria');
      expect(payer.surname).toBe('Clara Santos');
    });
  });

  // ── handleWebhook ────────────────────────────────────────
  describe('handleWebhook', () => {
    it('ignora eventos que não são do tipo payment', async () => {
      const result = await service.handleWebhook({ type: 'merchant_order' });
      expect(result).toEqual({ received: true });
      expect(mockPaymentGet).not.toHaveBeenCalled();
    });

    it('ignora quando paymentId está ausente', async () => {
      const result = await service.handleWebhook({ type: 'payment', data: {} });
      expect(result).toEqual({ received: true });
    });

    it('marca pedido como PAGO e envia e-mail quando status=approved', async () => {
      mockPaymentGet.mockResolvedValue({
        status: 'approved',
        payment_type_id: 'pix',
        metadata: { order_id: ORDER_ID },
      });
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.order.update.mockResolvedValue(mockOrder);
      mockEmail.sendOrderConfirmation.mockResolvedValue(undefined);

      const result = await service.handleWebhook({ type: 'payment', data: { id: 'pay-001' } });
      expect(result).toEqual({ received: true });
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ paymentStatus: 'PAID', paymentMethod: 'pix' }) }),
      );
      expect(mockEmail.sendOrderConfirmation).toHaveBeenCalled();
    });

    it('marca pedido como FAILED quando status=rejected', async () => {
      mockPaymentGet.mockResolvedValue({
        status: 'rejected',
        metadata: { order_id: ORDER_ID },
      });
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.order.update.mockResolvedValue(mockOrder);

      await service.handleWebhook({ type: 'payment', data: { id: 'pay-002' } });
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { paymentStatus: 'FAILED' } }),
      );
      expect(mockEmail.sendOrderConfirmation).not.toHaveBeenCalled();
    });

    it('não atualiza pedido quando orderId não está no metadata', async () => {
      mockPaymentGet.mockResolvedValue({ status: 'approved', metadata: {} });
      const result = await service.handleWebhook({ type: 'payment', data: { id: 'pay-003' } });
      expect(result).toEqual({ received: true });
      expect(mockPrisma.order.findUnique).not.toHaveBeenCalled();
    });

    it('continua processamento mesmo se envio de e-mail falhar', async () => {
      mockPaymentGet.mockResolvedValue({
        status: 'approved', payment_type_id: 'credit_card',
        metadata: { order_id: ORDER_ID },
      });
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.order.update.mockResolvedValue(mockOrder);
      mockEmail.sendOrderConfirmation.mockRejectedValue(new Error('SMTP error'));

      const result = await service.handleWebhook({ type: 'payment', data: { id: 'pay-004' } });
      expect(result).toEqual({ received: true });
      expect(mockPrisma.order.update).toHaveBeenCalled();
    });
  });
});
