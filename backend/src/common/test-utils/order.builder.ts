import { CreateOrderDto } from '../../orders/dto/create-order.dto';

/**
 * OrderBuilder
 * Simplifica a montagem de pedidos transacionais (com arrays de itens embutidos, 
 * remetente e ids do cliente) para injeção rápida em rotas de testes e QA do modulo logístico.
 */
export class OrderBuilder {
    private order: CreateOrderDto;

    constructor() {
        this.order = {
            customerId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', // customer padrão do mock
            shippingQuoteId: 101, // id hipotético
            items: [
                {
                    productId: 'p-456-def',
                    quantity: 1,
                }
            ]
        };
    }

    withCustomer(customerId: string): OrderBuilder {
        this.order.customerId = customerId;
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
}
