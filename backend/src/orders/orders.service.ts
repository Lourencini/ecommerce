import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  CustomerNotFoundException,
  OrderNotFoundException,
  ProductNotFoundException,
  ShippingCalculationException,
  InsufficientStockException,
  OrderStatusTransitionException,
} from '../common/exceptions/domain.exceptions';
import { OrderStatus } from '@prisma/client';
import { Decimal } from 'decimal.js';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(private prisma: PrismaService) {}

  async create(createOrderDto: CreateOrderDto, customerId: string) {
    // Validar cliente
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: { addresses: { where: { isDefault: true } } },
    });
    if (!customer) throw new CustomerNotFoundException(customerId);

    const address = customer.addresses[0];

    // Validar cotação de frete
    const quote = await this.prisma.shippingQuote.findUnique({
      where: { id: createOrderDto.shippingQuoteId },
    });
    if (!quote || new Date() > quote.expiresAt) {
      throw new ShippingCalculationException('Cotação de frete inválida ou expirada.');
    }

    return this.prisma.$transaction(async (tx) => {
      let subtotal = new Decimal(0);
      const orderItems = [];

      for (const itemDto of createOrderDto.items) {
        const product = await tx.product.findUnique({
          where: { id: itemDto.productId },
        });

        if (!product || !product.isActive) {
          throw new ProductNotFoundException(itemDto.productId);
        }

        if (product.stockQuantity < itemDto.quantity) {
          throw new InsufficientStockException(
            product.name,
            itemDto.quantity,
            product.stockQuantity,
          );
        }

        const unitPrice = new Decimal(product.priceInCents as any);
        const itemSubtotal = unitPrice.times(itemDto.quantity);
        subtotal = subtotal.plus(itemSubtotal);

        orderItems.push({
          productId: product.id,
          quantity: itemDto.quantity,
          unitPrice,
          totalPrice: itemSubtotal,
          productName: product.name,
          productSku: product.sku,
        });

        await tx.product.update({
          where: { id: product.id },
          data: { stockQuantity: product.stockQuantity - itemDto.quantity },
        });
      }

      const totalShipping = new Decimal(quote.price as any);
      const total = subtotal.plus(totalShipping);
      const year = new Date().getFullYear();
      const orderNumber = `#${year}-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;

      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          addressId: address?.id,
          totalProducts: subtotal,
          totalShipping,
          total,
          shippingService: `${quote.carrier} - ${quote.serviceName}`,
          notes: createOrderDto.notes,
          items: { create: orderItems },
          statusHistory: {
            create: {
              toStatus: OrderStatus.PENDING,
              note: 'Pedido criado.',
            },
          },
        },
        include: { items: true, statusHistory: true },
      });

      await tx.shippingQuote.update({
        where: { id: quote.id },
        data: { orderId: order.id },
      });

      return order;
    });
  }

  async findOne(id: string, user?: CurrentUserData) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        customer: true,
        address: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
        shippingQuotes: true,
      },
    });

    if (!order) throw new OrderNotFoundException(id);

    // Cliente só pode ver os próprios pedidos
    if (user && user.role !== 'ADMIN' && order.customerId !== user.customerId) {
      throw new ForbiddenException('Acesso negado.');
    }

    return order;
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}) {
    const { page = 1, limit = 15, status, search, dateFrom, dateTo } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) where.status = status;

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { customer: true, items: true },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async trackOrder(orderNumber: string, email: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        orderNumber,
        customer: { email },
      },
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!order) throw new NotFoundException('Pedido não encontrado.');
    return order;
  }

  async setTrackingCode(id: string, trackingCode: string) {
    await this.findOne(id);
    return this.prisma.order.update({
      where: { id },
      data: { trackingCode },
    });
  }

  async updateStatus(id: string, newStatus: OrderStatus, note?: string) {
    const order = await this.findOne(id);

    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      CONFIRMED: [OrderStatus.PRINTING, OrderStatus.CANCELLED],
      PRINTING: [OrderStatus.READY, OrderStatus.CANCELLED],
      READY: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      SHIPPED: [OrderStatus.DELIVERED],
      DELIVERED: [OrderStatus.REFUNDED],
      CANCELLED: [],
      REFUNDED: [],
    };

    if (!validTransitions[order.status].includes(newStatus)) {
      throw new OrderStatusTransitionException(order.status, newStatus);
    }

    const updates: any = { status: newStatus };
    if (newStatus === OrderStatus.PRINTING) updates.printingStartedAt = new Date();
    if (newStatus === OrderStatus.SHIPPED) updates.shippedAt = new Date();
    if (newStatus === OrderStatus.DELIVERED) updates.deliveredAt = new Date();
    if (newStatus === OrderStatus.CANCELLED) updates.cancelledAt = new Date();

    return this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id },
        data: updates,
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          fromStatus: order.status,
          toStatus: newStatus,
          note: note || `Status atualizado para ${newStatus}`,
        },
      });

      return updatedOrder;
    });
  }

  async getCycleTimeMetrics() {
    const orders = await this.prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.SHIPPED, OrderStatus.DELIVERED] },
        shippedAt: { not: null },
      },
      select: { orderedAt: true, shippedAt: true },
    });

    if (orders.length === 0) return { averageHours: 0 };

    const totalDiffMs = orders.reduce((acc, order) => {
      return acc + (order.shippedAt!.getTime() - order.orderedAt.getTime());
    }, 0);

    const averageHours = totalDiffMs / (1000 * 60 * 60) / orders.length;
    return { averageHours: parseFloat(averageHours.toFixed(2)) };
  }

  async getSummaryMetrics() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalOrders,
      pendingOrders,
      monthlyOrders,
      lowStockProducts,
      cycleTime,
    ] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({
        where: { status: { in: [OrderStatus.PENDING, OrderStatus.CONFIRMED] } },
      }),
      this.prisma.order.findMany({
        where: {
          createdAt: { gte: startOfMonth },
          paymentStatus: 'PAID',
        },
        select: { total: true },
      }),
      this.prisma.product.count({
        where: { isActive: true, stockQuantity: { lte: 5 } },
      }),
      this.getCycleTimeMetrics(),
    ]);

    const monthlyRevenue = monthlyOrders.reduce(
      (acc, o) => acc + Number(o.total),
      0,
    );

    return {
      totalOrders,
      pendingOrders,
      monthlyRevenue,
      lowStockProducts,
      cycleTimeAvgHours: cycleTime.averageHours,
    };
  }
}
