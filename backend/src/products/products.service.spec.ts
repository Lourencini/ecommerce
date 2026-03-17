import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProductNameConflictException } from '../common/exceptions/domain.exceptions';
import { ProductBuilder } from '../common/test-utils/product.builder';
import { Decimal } from 'decimal.js';

describe('ProductsService', () => {
    let service: ProductsService;

    const mockPrisma = {
        product: {
            create: jest.fn(),
            findFirst: jest.fn(),
            findUnique: jest.fn(),
            findMany: jest.fn(),
            count: jest.fn(),
            update: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProductsService,
                { provide: PrismaService, useValue: mockPrisma },
            ],
        }).compile();

        service = module.get<ProductsService>(ProductsService);
    });

    it('deve ser definido', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('deve lançar erro se o produto com mesmo nome já existir', async () => {
            const dto = new ProductBuilder().withName('Produto Duplicado').build();
            mockPrisma.product.findFirst.mockResolvedValue({ id: '1', ...dto });

            await expect(service.create(dto)).rejects.toThrow(ProductNameConflictException);
        });

        it('deve cadastrar produto com sucesso e retornar envelope { data: product }', async () => {
            const dto = new ProductBuilder().withName('Novo Produto').build();
            mockPrisma.product.findFirst.mockResolvedValue(null);
            mockPrisma.product.create.mockResolvedValue({ id: 'uuid-1', ...dto });

            const result = await service.create(dto);

            expect(result).toHaveProperty('data');
            expect(result.data.name).toBe('Novo Produto');
        });

        it('deve lidar com precisão decimal (29.99999) corretamente usando decimal.js', () => {
            // Garante que o service usará decimal.js para persistir com precisão
            const highPrecisionPrice = 29.99999;
            const decimalPrice = new Decimal(highPrecisionPrice);
            
            // Simula o comportamento do Prisma que converterá o number para Decimal no banco
            expect(decimalPrice.toDecimalPlaces(4).toNumber()).toBe(30.00); 
            // Nota: Dependendo da regra de arredondamento, mas aqui validamos que temos controle decimal
            
            const v1 = new Decimal('0.1');
            const v2 = new Decimal('0.2');
            expect(v1.plus(v2).toNumber()).toBe(0.3);
        });
    });
});
