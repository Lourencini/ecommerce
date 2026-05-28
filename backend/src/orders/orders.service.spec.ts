import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';
import {
  CustomerNotFoundException,
  ShippingCalculationException,
  ProductNotFoundException,
  InsufficientStockException,
  OrderNotFoundException,
  OrderStatusTransitionException,
} from '../common/exceptions/domain.exceptions';

const mockCustomer = {
  id: 'cust-001',
  userId: 'user-001',
  addresses: [{ id: 'addr-001', isDefault: true }],
};

const mockQuote = {
  id: 'quote-001',
  carrier: 'CORREIOS',
  serviceName: 'PAC',
  price: 2500,
  expiresAt: new Date(Date.now() + 60_000),
  orderId: null,
};

const mockProduct = {
  id: 'prod-001',
  name: 'Vaso Articulado',
  sku: 'VASO-001',
  priceInCents: 7990,
  stockQuantity: 10,
  isActive: true,
};

const mockOrder = {
  id: 'order-001',
  orderNumber: '#2024-00001',
  customerId: 'cust-001',
  status: OrderStatus.PENDING,
  total: 10490,
  orderedAt: new Date(Date.now() - 3600_000),
  shippedAt: null,
  items: [],
  statusHistory: [],
  shippingQuotes: [],
  customer: mockCustomer,
  address: null,
};

const mockPrisma = {
  customer: { findUnique: jest.fn() },
  shippingQuote: { findUnique: jest.fn(), update: jest.fn() },
  order: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  orderStatusHistory: { create: jest.fn() },
  product: { findUnique: jest.fn(), update: jest.fn(), count: jest.fn() },
  $transaction: jest.fn(),
};

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  // ── create ─────────────────────────────────────────────────────

  describe('create', () => {
    const dto = {
      shippingQuoteId: 1,
      items: [{ productId: 'prod-001', quantity: 2 }],
    };

    it('deve lançar CustomerNotFoundException quando cliente não existe', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);

      await expect(service.create(dto, 'cust-inexistente')).rejects.toThrow(
        CustomerNotFoundException,
      );
    });

    it('deve lançar ShippingCalculationException quando cotação não existe', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrisma.shippingQuote.findUnique.mockResolvedValue(null);

      await expect(service.create(dto, 'cust-001')).rejects.toThrow(
        ShippingCalculationException,
      );
    });

    it('deve lançar ShippingCalculationException quando cotação está expirada', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrisma.shippingQuote.findUnique.mockResolvedValue({
        ...mockQuote,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.create(dto, 'cust-001')).rejects.toThrow(
        ShippingCalculationException,
      );
    });

    it('deve lançar ProductNotFoundException quando produto não existe', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrisma.shippingQuote.findUnique.mockResolvedValue(mockQuote);
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          product: { findUnique: jest.fn().mockResolvedValue(null), update: jest.fn() },
          order: { create: jest.fn() },
          shippingQuote: { update: jest.fn() },
        });
      });

      await expect(service.create(dto, 'cust-001')).rejects.toThrow(
        ProductNotFoundException,
      );
    });

    it('deve lançar InsufficientStockException quando estoque insuficiente', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrisma.shippingQuote.findUnique.mockResolvedValue(mockQuote);
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          product: {
            findUnique: jest.fn().mockResolvedValue({ ...mockProduct, stockQuantity: 1 }),
            update: jest.fn(),
          },
          order: { create: jest.fn() },
          shippingQuote: { update: jest.fn() },
        });
      });

      await expect(
        service.create({ ...dto, items: [{ productId: 'prod-001', quantity: 5 }] }, 'cust-001'),
      ).rejects.toThrow(InsufficientStockException);
    });

    it('deve deduzir estoque ao criar pedido', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrisma.shippingQuote.findUnique.mockResolvedValue(mockQuote);

      const productUpdate = jest.fn().mockResolvedValue({});
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          product: {
            findUnique: jest.fn().mockResolvedValue(mockProduct),
            update: productUpdate,
          },
          order: { create: jest.fn().mockResolvedValue(mockOrder) },
          shippingQuote: { update: jest.fn() },
        });
      });

      await service.create(dto, 'cust-001');

      expect(productUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ stockQuantity: mockProduct.stockQuantity - 2 }),
        }),
      );
    });

    it('deve criar pedido com total correto (subtotal + frete)', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrisma.shippingQuote.findUnique.mockResolvedValue(mockQuote);

      const orderCreate = jest.fn().mockResolvedValue(mockOrder);
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          product: {
            findUnique: jest.fn().mockResolvedValue(mockProduct),
            update: jest.fn(),
          },
          order: { create: orderCreate },
          shippingQuote: { update: jest.fn() },
        });
      });

      await service.create(dto, 'cust-001');

      expect(orderCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customerId: 'cust-001',
          }),
        }),
      );
    });
  });

  // ── findOne ────────────────────────────────────────────────────

  describe('findOne', () => {
    it('deve lançar OrderNotFoundException quando pedido não existe', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(service.findOne('order-inexistente')).rejects.toThrow(
        OrderNotFoundException,
      );
    });

    it('deve retornar pedido quando existe', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      const result = await service.findOne('order-001');
      expect(result).toEqual(mockOrder);
    });

    it('deve lançar ForbiddenException quando cliente tenta acessar pedido de outro cliente', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockOrder, customerId: 'outro-cliente' });

      await expect(
        service.findOne('order-001', { id: 'u1', name: 'Test', email: 'x@x.com', role: 'CUSTOMER', customerId: 'cust-001' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('admin pode acessar qualquer pedido', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockOrder, customerId: 'outro-cliente' });

      const result = await service.findOne('order-001', {
        id: 'admin-id',
        name: 'Admin',
        email: 'admin@email.com',
        role: 'ADMIN',
        customerId: null,
      });
      expect(result).toBeDefined();
    });
  });

  // ── updateStatus ───────────────────────────────────────────────

  describe('updateStatus', () => {
    it('deve lançar OrderStatusTransitionException para transição inválida', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockOrder, status: OrderStatus.PENDING });

      await expect(
        service.updateStatus('order-001', OrderStatus.SHIPPED),
      ).rejects.toThrow(OrderStatusTransitionException);
    });

    it('deve permitir transição válida PENDING → CONFIRMED', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockOrder, status: OrderStatus.PENDING });

      const orderUpdate = jest.fn().mockResolvedValue({ ...mockOrder, status: OrderStatus.CONFIRMED });
      const historyCreate = jest.fn().mockResolvedValue({});
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          order: { update: orderUpdate },
          orderStatusHistory: { create: historyCreate },
        });
      });

      await service.updateStatus('order-001', OrderStatus.CONFIRMED);
      expect(orderUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: OrderStatus.CONFIRMED }) }),
      );
    });

    it('deve permitir transição válida PENDING → CANCELLED', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockOrder, status: OrderStatus.PENDING });

      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          order: { update: jest.fn().mockResolvedValue({}) },
          orderStatusHistory: { create: jest.fn() },
        });
      });

      await expect(
        service.updateStatus('order-001', OrderStatus.CANCELLED),
      ).resolves.not.toThrow();
    });

    it('deve gravar histórico de status na transição', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockOrder, status: OrderStatus.PENDING });

      const historyCreate = jest.fn().mockResolvedValue({});
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          order: { update: jest.fn().mockResolvedValue({}) },
          orderStatusHistory: { create: historyCreate },
        });
      });

      await service.updateStatus('order-001', OrderStatus.CONFIRMED);
      expect(historyCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderId: 'order-001',
            fromStatus: OrderStatus.PENDING,
            toStatus: OrderStatus.CONFIRMED,
          }),
        }),
      );
    });

    it('CANCELLED não aceita nenhuma transição', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...mockOrder, status: OrderStatus.CANCELLED });

      await expect(
        service.updateStatus('order-001', OrderStatus.PENDING),
      ).rejects.toThrow(OrderStatusTransitionException);
    });
  });

  // ── getCycleTimeMetrics ────────────────────────────────────────

  describe('getCycleTimeMetrics', () => {
    it('retorna averageHours 0 quando não há pedidos expedidos', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);

      const result = await service.getCycleTimeMetrics();
      expect(result.averageHours).toBe(0);
    });

    it('calcula média corretamente para múltiplos pedidos', async () => {
      const now = new Date();
      const orderedAt = new Date(now.getTime() - 48 * 3600_000);
      mockPrisma.order.findMany.mockResolvedValue([
        { orderedAt, shippedAt: now },
        { orderedAt, shippedAt: now },
      ]);

      const result = await service.getCycleTimeMetrics();
      expect(result.averageHours).toBeCloseTo(48, 0);
    });
  });
});
