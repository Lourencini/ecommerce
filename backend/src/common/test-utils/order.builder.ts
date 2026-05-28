import { CreateOrderDto } from '../../orders/dto/create-order.dto';

/**
 * OrderBuilder
 * Simplifica a montagem de pedidos para injecao rapida em testes.
 * customerId e injetado pelo JWT na rota real — aqui e so para testes unitarios.
 */
export class OrderBuilder {
  private order: CreateOrderDto & { _customerId?: string };

  constructor() {
    this.order = {
      shippingQuoteId: 101,
      items: [
        {
          productId: 'p-456-def',
          quantity: 1,
        },
      ],
    };
  }

  /** Define o customerId para uso em mocks de servico (nao faz parte do DTO real) */
  withCustomer(customerId: string): OrderBuilder {
    this.order._customerId = customerId;
    return this;
  }

  withItems(items: Array<{ productId: string; quantity: number }>): OrderBuilder {
    this.order.items = items;
    return this;
  }

  addExtraItem(productId: string, quantity: number): OrderBuilder {
    this.order.items.push({ productId, quantity });
    return this;
  }

  withShippingQuote(quoteId: number): OrderBuilder {
    this.order.shippingQuoteId = quoteId;
    return this;
  }

  build(): CreateOrderDto {
    return this.order;
  }

  /** Retorna o customerId simulado (para passar direto ao service em testes) */
  getCustomerId(): string {
    return this.order._customerId ?? 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  }
}
