import { Injectable, Logger } from '@nestjs/common';
import { CreateShippingQuoteDto } from './dto/create-shipping-quote.dto';
import { CalculateShippingDto } from './dto/calculate-shipping.dto';
import { PrismaService } from '../prisma/prisma.service';
import {
    InvalidZipCodeException,
    ShippingCalculationException,
} from '../common/exceptions/domain.exceptions';
import { Decimal } from 'decimal.js';

@Injectable()
export class ShippingService {
    private readonly logger = new Logger(ShippingService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Simula a API da transportadora (Correios/Melhor Envio)
     */
    async calculate(dto: CalculateShippingDto) {
        this.logger.log(`Calculando frete para o CEP: ${dto.zipCodeDest}`);

        // Validação de regra de negócio (simulando API externa retornando erro)
        if (dto.zipCodeDest === '00000000') {
            throw new InvalidZipCodeException(dto.zipCodeDest);
        }

        if (dto.weightGrams > 30000) {
            // Regra de negócio: limite de 30kg comum em transportadoras
            throw new ShippingCalculationException('Peso excede o limite de 30kg.');
        }

        // Simulando delay de rede da API externa
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Cálculo fake baseado no estado (dígito inicial do CEP)
        const destRegion = parseInt(dto.zipCodeDest[0], 10);
        const originRegion = 0; // SP (CEP 01310100)

        const distanceFactor = Math.abs(destRegion - originRegion) || 1;
        const basePrice = new Decimal(15.0);
        const weightFactor = new Decimal(dto.weightGrams).dividedBy(1000).times(5);

        // PAC
        const pacPrice = basePrice
            .plus(weightFactor)
            .times(distanceFactor * 1.2)
            .toDecimalPlaces(4);
        const pacDeadline = 5 + distanceFactor * 2;

        // Sedex
        const sedexPrice = basePrice
            .plus(weightFactor)
            .times(distanceFactor * 2.5)
            .toDecimalPlaces(4);
        const sedexDeadline = 2 + distanceFactor;

        return [
            {
                serviceName: 'PAC',
                carrier: 'Correios',
                price: Number(pacPrice),
                deadlineDays: pacDeadline,
            },
            {
                serviceName: 'SEDEX',
                carrier: 'Correios',
                price: Number(sedexPrice),
                deadlineDays: sedexDeadline,
            },
        ];
    }

    async saveQuote(dto: CreateShippingQuoteDto) {
        // Salva a cotação no banco com validade de 48h
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 48);

        return this.prisma.shippingQuote.create({
            data: {
                zipCodeOrigin: process.env.SHIPPING_ZIP_ORIGIN || '01310100',
                zipCodeDest: dto.zipCodeDest,
                weightGrams: dto.weightGrams,
                lengthCm: dto.lengthCm,
                widthCm: dto.widthCm,
                heightCm: dto.heightCm,
                price: dto.price,
                deadline: dto.deadlineDays,
                serviceName: dto.serviceName,
                carrier: dto.carrier,
                expiresAt,
            },
        });
    }

    async validateQuote(quoteId: number) {
        const quote = await this.prisma.shippingQuote.findUnique({
            where: { id: quoteId },
        });

        if (!quote) {
            throw new ShippingCalculationException('Cotação não encontrada.');
        }

        if (new Date() > quote.expiresAt) {
            throw new ShippingCalculationException('Cotação expirada.');
        }

        return quote;
    }
}
