import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ProductNameConflictException,
  ProductNotFoundException,
  ProductSkuConflictException,
} from '../common/exceptions/domain.exceptions';
import { ProductBuilder } from '../common/test-utils/product.builder';
import { Decimal } from 'decimal.js';
import { Prisma } from '@prisma/client';

const PRODUCT_ID = 'prod-uuid-001';

const rawProduct = {
  id: PRODUCT_ID,
  sku: 'SKU-001',
  name: 'Vaso Mágico',
  slug: 'vaso-magico',
  description: 'Um belo vaso',
  priceInCents: new Decimal(49.9),
  compareAtPrice: null,
  stockQuantity: 10,
  isActive: true,
  isFeatured: false,
  weightGrams: 300,
  lengthCm: new Decimal(15),
  widthCm: new Decimal(15),
  heightCm: new Decimal(20),
  material: 'PLA',
  filamentType: 'PLA',
  filamentColor: 'Cinza',
  printHours: null,
  imageUrls: [],
  categoryId: null,
  category: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  product: {
    create:     jest.fn(),
    findFirst:  jest.fn(),
    findUnique: jest.fn(),
    findMany:   jest.fn(),
    count:      jest.fn(),
    update:     jest.fn(),
    delete:     jest.fn(),
  },
};

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    jest.resetAllMocks(); // reset implementations between tests
  });

  // ── create ───────────────────────────────────────────────
  describe('create', () => {
    it('lança ProductNameConflictException quando nome já existe', async () => {
      const dto = new ProductBuilder().withName('Duplicado').build();
      mockPrisma.product.findFirst.mockResolvedValue(rawProduct);
      await expect(service.create(dto)).rejects.toThrow(ProductNameConflictException);
    });

    it('cria produto com sucesso e retorna envelope { data }', async () => {
      const dto = new ProductBuilder().withName('Novo Produto').build();
      mockPrisma.product.findFirst.mockResolvedValue(null);
      mockPrisma.product.create.mockResolvedValue({ ...rawProduct, name: 'Novo Produto' });

      const result = await service.create(dto);
      expect(result).toHaveProperty('data');
      expect(result.data.name).toBe('Novo Produto');
      expect(mockPrisma.product.create).toHaveBeenCalled();
    });

    it('lança ProductSkuConflictException em erro P2002 do Prisma', async () => {
      const dto = new ProductBuilder().build();
      mockPrisma.product.findFirst.mockResolvedValue(null);

      const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002', clientVersion: '5.0.0',
      });
      mockPrisma.product.create.mockRejectedValue(p2002);

      await expect(service.create(dto)).rejects.toThrow(ProductSkuConflictException);
    });

    it('propaga outros erros inesperados', async () => {
      const dto = new ProductBuilder().build();
      mockPrisma.product.findFirst.mockResolvedValue(null);
      mockPrisma.product.create.mockRejectedValue(new Error('DB connection lost'));
      await expect(service.create(dto)).rejects.toThrow('DB connection lost');
    });
  });

  // ── findAll ──────────────────────────────────────────────
  describe('findAll', () => {
    beforeEach(() => {
      mockPrisma.product.findMany.mockResolvedValue([rawProduct]);
      mockPrisma.product.count.mockResolvedValue(1);
    });

    it('retorna lista paginada sem filtros', async () => {
      const result = await service.findAll({});
      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.lastPage).toBe(1);
    });

    it('converte priceInCents para price numérico', async () => {
      const result = await service.findAll({});
      expect(typeof result.items[0].price).toBe('number');
      expect(result.items[0].price).toBe(49.9);
    });

    it('passa filtros de busca corretamente ao Prisma', async () => {
      await service.findAll({ search: 'vaso', categoryId: 2, isActive: true });
      const call = mockPrisma.product.findMany.mock.calls[0][0];
      expect(call.where.OR).toBeDefined();
      expect(call.where.categoryId).toBe(2);
      expect(call.where.isActive).toBe(true);
    });

    it('calcula lastPage corretamente para múltiplas páginas', async () => {
      mockPrisma.product.count.mockResolvedValue(45);
      const result = await service.findAll({ page: 2, limit: 10 });
      expect(result.meta.lastPage).toBe(5);
    });
  });

  // ── findOne ──────────────────────────────────────────────
  describe('findOne', () => {
    it('retorna produto com price normalizado', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(rawProduct);
      const result = await service.findOne(PRODUCT_ID);
      expect(result.price).toBe(49.9);
      expect(result.id).toBe(PRODUCT_ID);
    });

    it('lança ProductNotFoundException quando produto não existe', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);
      await expect(service.findOne('inexistente')).rejects.toThrow(ProductNotFoundException);
    });
  });

  // ── findBySlug ───────────────────────────────────────────
  describe('findBySlug', () => {
    it('retorna produto pelo slug', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(rawProduct);
      const result = await service.findBySlug('vaso-magico');
      expect(result.slug).toBe('vaso-magico');
    });

    it('lança ProductNotFoundException quando slug não existe', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);
      await expect(service.findBySlug('nao-existe')).rejects.toThrow(ProductNotFoundException);
    });
  });

  // ── update ───────────────────────────────────────────────
  describe('update', () => {
    it('atualiza produto existente e retorna price normalizado', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(rawProduct);
      mockPrisma.product.findFirst.mockResolvedValue(null); // slug único
      mockPrisma.product.update.mockResolvedValue({ ...rawProduct, name: 'Vaso Premium' });

      const result = await service.update(PRODUCT_ID, { name: 'Vaso Premium' });
      expect(result.name).toBe('Vaso Premium');
      expect(mockPrisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: PRODUCT_ID } }),
      );
    });

    it('lança ProductNotFoundException quando produto não existe', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);
      await expect(service.update('inexistente', {})).rejects.toThrow(ProductNotFoundException);
    });

    it('lança ProductSkuConflictException em erro P2002 no update', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(rawProduct);
      mockPrisma.product.findFirst.mockResolvedValue(null);
      const p2002 = new Prisma.PrismaClientKnownRequestError('Unique', { code: 'P2002', clientVersion: '5.0.0' });
      mockPrisma.product.update.mockRejectedValue(p2002);
      await expect(service.update(PRODUCT_ID, { sku: 'DUPLICATE-SKU' })).rejects.toThrow(ProductSkuConflictException);
    });
  });

  // ── remove (soft delete via isActive=false) ──────────────
  describe('remove', () => {
    it('desativa produto (soft delete) quando chamado', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(rawProduct);
      mockPrisma.product.findFirst.mockResolvedValue(null);
      mockPrisma.product.update.mockResolvedValue({ ...rawProduct, isActive: false });

      await service.remove(PRODUCT_ID);
      expect(mockPrisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: PRODUCT_ID }, data: { isActive: false } }),
      );
    });

    it('lança ProductNotFoundException quando produto não existe', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);
      await expect(service.remove('inexistente')).rejects.toThrow(ProductNotFoundException);
    });
  });

  // ── decimal precision ────────────────────────────────────
  it('decimal.js garante precisão numérica (0.1 + 0.2 = 0.3)', () => {
    expect(new Decimal('0.1').plus('0.2').toNumber()).toBe(0.3);
  });
});
