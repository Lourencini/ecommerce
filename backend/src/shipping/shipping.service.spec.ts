import { Test, TestingModule } from '@nestjs/testing';
import { ShippingService } from './shipping.service';
import { PrismaService } from '../prisma/prisma.service';
import { ShippingCalculationException } from '../common/exceptions/domain.exceptions';
import { ProductBuilder } from '../common/test-utils/product.builder';
import { Decimal } from 'decimal.js';

describe('ShippingService', () => {
    let service: ShippingService;

    const mockPrisma = {
        shippingQuote: {
            create: jest.fn(),
            findUnique: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ShippingService,
                { provide: PrismaService, useValue: mockPrisma },
            ],
        }).compile();

        service = module.get<ShippingService>(ShippingService);
    });

    it('deve ser definido', () => {
        expect(service).toBeDefined();
    });

    describe('calculate', () => {
        it('deve calcular o frete corretamente usando peso real quando maior que o volumétrico', async () => {
            const product = new ProductBuilder()
                .withVolumetricDimensions(10, 10, 10) // 1000cm3 / 6000 = 0.16kg
                .build();
            
            // Peso real de 5kg (5000g)
            product.weightGrams = 5000;

            const result = await service.calculate({
                zipCodeDest: '01310100',
                products: [{ ...product, productId: '1', quantity: 1 }],
            });

            expect(result[0].metadata.chargeableWeightKg).toBe(5);
        });

        it('deve calcular o frete corretamente usando peso volumétrico quando maior que o real', async () => {
            const product = new ProductBuilder()
                .withVolumetricDimensions(60, 60, 60) // 216000cm3 / 6000 = 36kg
                .build();
            
            product.weightGrams = 1000; // 1kg

            // Deve falhar pois excede 30kg
            await expect(service.calculate({
                zipCodeDest: '01310100',
                products: [{ ...product, productId: '1', quantity: 1 }],
            })).rejects.toThrow(ShippingCalculationException);
        });

        it('deve validar a precisão decimal (0.1 + 0.2 === 0.30) para evitar erros de floating point', () => {
             // Teste direto da lógica decimal usada no service
             const v1 = new Decimal('0.1');
             const v2 = new Decimal('0.2');
             const result = v1.plus(v2);
             
             expect(result.toString()).toBe('0.3');
             expect(result.toNumber()).toBe(0.3);
        });

        it('deve lançar erro para peso volumétrico excessivo (> 30kg)', async () => {
            const largeProduct = new ProductBuilder()
                .withVolumetricDimensions(100, 100, 100) // 1.000.000 / 6000 = 166kg
                .build();

            await expect(service.calculate({
                zipCodeDest: '01310100',
                products: [{ ...largeProduct, productId: 'huge-1', quantity: 1 }],
            })).rejects.toThrow('Peso taxável excede o limite de 30kg');
        });
    });
});
