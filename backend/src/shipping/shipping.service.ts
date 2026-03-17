import { Injectable, Logger } from '@nestjs/common';
import { CreateShippingQuoteDto } from './dto/create-shipping-quote.dto';
import { CalculateShippingDto, ShippingProductItemDto } from './dto/calculate-shipping.dto';
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
     * Calcula peso real vs peso volumétrico com precisão Decimal
     */
    async calculate(dto: CalculateShippingDto) {
        this.logger.log(`Calculando frete volumétrico para o CEP: ${dto.zipCodeDest}`);

        if (dto.zipCodeDest === '00000000') {
            throw new InvalidZipCodeException(dto.zipCodeDest);
        }

        // 1. Calcular totais da caixa usando Decimal estritamente
        let totalWeightGrams = new Decimal(0);
        let totalVolumeCm3 = new Decimal(0);

        // Dimensões estimadas da caixa de envio
        let boxLengthCm = new Decimal(0);
        let boxWidthCm = new Decimal(0);
        let boxHeightCm = new Decimal(0);

        for (const item of dto.products) {
            const qty = new Decimal(item.quantity);

            // Soma pesos reais
            const itemWeight = new Decimal(item.weightGrams).times(qty);
            totalWeightGrams = totalWeightGrams.plus(itemWeight);

            // Soma volume (C * L * A * Qtd)
            const l = new Decimal(item.lengthCm as number);
            const w = new Decimal(item.widthCm as number);
            const h = new Decimal(item.heightCm as number);
            const itemVolume = l.times(w).times(h).times(qty);
            totalVolumeCm3 = totalVolumeCm3.plus(itemVolume);

            // Heurística simples de caixa de envio (o maior lado domina, empilha a altura)
            if (l.greaterThan(boxLengthCm)) boxLengthCm = l;
            if (w.greaterThan(boxWidthCm)) boxWidthCm = w;
            boxHeightCm = boxHeightCm.plus(h.times(qty));
        }

        // 2. Peso Volumétrico (Fator Correios = 6000)
        // Formula: (C * L * A) / 6000 = KG Volumétrico
        const volumetricWeightKg = totalVolumeCm3.dividedBy(6000);
        const realWeightKg = totalWeightGrams.dividedBy(1000);

        // O peso cobrado é sempre o maior entre o real e o volumétrico
        const chargeableWeightKg = Decimal.max(realWeightKg, volumetricWeightKg);

        if (chargeableWeightKg.greaterThan(30)) {
            throw new ShippingCalculationException('Peso taxável excede o limite de 30kg da transportadora.');
        }

        // 3. Simulação de API externa
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Cálculo fake baseado no formato decimal exato
        const destRegion = parseInt(dto.zipCodeDest[0], 10);
        const distanceFactor = new Decimal(Math.abs(destRegion - 0) || 1);

        const basePrice = new Decimal(15.0);
        const weightTax = chargeableWeightKg.times(5.5); // R$ 5,50 por KG taxável

        // PAC e SEDEX math operations with strictly Decimal to avoid float issues
        const pacPrice = basePrice
            .plus(weightTax)
            .times(distanceFactor.times('1.2'))
            .toDecimalPlaces(4);

        const sedexPrice = basePrice
            .plus(weightTax)
            .times(distanceFactor.times('2.5'))
            .toDecimalPlaces(4);

        const pacDeadline = 5 + distanceFactor.toNumber() * 2;
        const sedexDeadline = 2 + distanceFactor.toNumber();

        return [
            {
                serviceName: 'PAC',
                carrier: 'Correios',
                price: pacPrice.toNumber(), // Retornado como number pro DTO, salvo como Decimal no banco
                deadlineDays: pacDeadline,
                metadata: {
                    realWeightKg: realWeightKg.toDecimalPlaces(3).toNumber(),
                    volumetricWeightKg: volumetricWeightKg.toDecimalPlaces(3).toNumber(),
                    chargeableWeightKg: chargeableWeightKg.toDecimalPlaces(3).toNumber(),
                }
            },
            {
                serviceName: 'SEDEX',
                carrier: 'Correios',
                price: sedexPrice.toNumber(),
                deadlineDays: sedexDeadline,
                metadata: {
                    realWeightKg: realWeightKg.toDecimalPlaces(3).toNumber(),
                    volumetricWeightKg: volumetricWeightKg.toDecimalPlaces(3).toNumber(),
                    chargeableWeightKg: chargeableWeightKg.toDecimalPlaces(3).toNumber(),
                }
            },
        ];
    }

    async saveQuote(dto: CreateShippingQuoteDto) {
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
                price: dto.price, // Salvo no banco como Decimal(19,4)
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

        if (!quote) throw new ShippingCalculationException('Cotação não encontrada.');
        if (new Date() > quote.expiresAt) throw new ShippingCalculationException('Cotação expirada.');

        return quote;
    }
}
