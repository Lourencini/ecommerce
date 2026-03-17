import {
    HttpException,
    HttpStatus,
} from '@nestjs/common';

/**
 * Exceções de domínio estruturadas para o e-commerce.
 * Todas extendem HttpException e são capturadas pelo HttpExceptionFilter (RFC 7807).
 */

export class ProductNotFoundException extends HttpException {
    constructor(id: string) {
        super(
            { message: `Produto com ID "${id}" não encontrado.` },
            HttpStatus.NOT_FOUND,
        );
    }
}

export class ProductSkuConflictException extends HttpException {
    constructor(sku: string) {
        super(
            { message: `SKU "${sku}" já existe. Escolha um SKU único.` },
            HttpStatus.CONFLICT,
        );
    }
}

export class OrderNotFoundException extends HttpException {
    constructor(id: string) {
        super(
            { message: `Pedido com ID "${id}" não encontrado.` },
            HttpStatus.NOT_FOUND,
        );
    }
}

export class OrderStatusTransitionException extends HttpException {
    constructor(from: string, to: string) {
        super(
            {
                message: `Transição de status inválida: "${from}" → "${to}".`,
            },
            HttpStatus.UNPROCESSABLE_ENTITY,
        );
    }
}

export class ShippingCalculationException extends HttpException {
    constructor(reason: string) {
        super(
            { message: `Falha no cálculo de frete: ${reason}` },
            HttpStatus.BAD_GATEWAY,
        );
    }
}

export class InvalidZipCodeException extends HttpException {
    constructor(zipCode: string) {
        super(
            { message: `CEP "${zipCode}" é inválido ou não encontrado.` },
            HttpStatus.UNPROCESSABLE_ENTITY,
        );
    }
}

export class CustomerNotFoundException extends HttpException {
    constructor(id: string) {
        super(
            { message: `Cliente com ID "${id}" não encontrado.` },
            HttpStatus.NOT_FOUND,
        );
    }
}

export class InsufficientStockException extends HttpException {
    constructor(productName: string, requested: number, available: number) {
        super(
            {
                message: `Estoque insuficiente para "${productName}". Solicitado: ${requested}, disponível: ${available}.`,
            },
            HttpStatus.CONFLICT,
        );
    }
}
