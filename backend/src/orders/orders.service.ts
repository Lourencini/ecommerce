import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class OrdersService {
    private readonly logger = new Logger(OrdersService.name);

    constructor(private prisma: PrismaService) { }

    async create(createOrderDto: CreateOrderDto) {
        // 1. Validar Cliente
        const customer = await this.prisma.customer.findUnique({
            where: { id: createOrderDto.customerId },
            include: { addresses: { where: { isDefault: true } } },
        });
        if (!customer) throw new CustomerNotFoundException(createOrderDto.customerId);

        const address = customer.addresses[0];

        // 2. Validar Cotação de Frete
        const quote = await this.prisma.shippingQuote.findUnique({
            where: { id: createOrderDto.shippingQuoteId },
        });
        if (!quote || new Date() > quote.expiresAt) {
            throw new ShippingCalculationException('Cotação de frete inválida ou expirada.');
        }

        // 3. Iniciar Transação do Pedido
        return this.prisma.$transaction(async (tx) => {
            let subtotal = new Decimal(0);
            const orderItems = [];

            // Validar Produtos e Estoque
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

                // Deduzir estoque
                await tx.product.update({
                    where: { id: product.id },
                    data: { stockQuantity: product.stockQuantity - itemDto.quantity },
                });
            }

            const totalShipping = new Decimal(quote.price as any);
            const total = subtotal.plus(totalShipping);
            const orderNumber = `#${new Date().getFullYear()}-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;

            // 4. Criar Pedido com Audit Trail (Status History)
            const order = await tx.order.create({
                data: {
                    orderNumber,
                    customerId: customer.id,
                    addressId: address?.id,
                    status: OrderStatus.PENDING,
                    totalProducts: subtotal,
                    totalShipping,
                    total,
                    shippingService: quote.carrier + ' - ' + quote.serviceName,
                    items: { create: orderItems },
                    statusHistory: {
                        create: {
                            toStatus: OrderStatus.PENDING,
                            note: 'Pedido criado via integração de cotação de frete.',
                        },
                    },
                },
                include: { items: true, statusHistory: true },
            });

            // Vincular a cotação ao pedido para histórico
            await tx.shippingQuote.update({
                where: { id: quote.id },
                data: { orderId: order.id },
            });

            return order;
        });
    }

    async findOne(id: string) {
        const order = await this.prisma.order.findUnique({
            where: { id },
            include: {
                items: true,
                customer: true,
                address: true,
                statusHistory: { orderBy: { createdAt: 'desc' } },
                shippingQuotes: true,
            },
        });

        if (!order) throw new OrderNotFoundException(id);
        return order;
    }

    async findAll() {
        return this.prisma.order.findMany({
            orderBy: { createdAt: 'desc' },
            include: { customer: true },
        });
    }

    // Lógica rigorosa de atualização de status do e-commerce
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

        // Atualiza KPIs logísticos baseados no status
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
            select: {
                orderedAt: true,
                shippedAt: true,
            }
        });

        if (orders.length === 0) return { averageHours: 0 };

        const totalDiffMs = orders.reduce((acc, order) => {
            const diff = order.shippedAt.getTime() - order.orderedAt.getTime();
            return acc + diff;
        }, 0);

        const averageHours = (totalDiffMs / (1000 * 60 * 60)) / orders.length;
        return { averageHours: parseFloat(averageHours.toFixed(2)) };
    }
}
