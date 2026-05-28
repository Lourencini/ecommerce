import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
// DTOs são classes agora — importadas para type-checking nos testes
import { PrismaService } from '../prisma/prisma.service';

const mockCategory = {
  id: 1,
  name: 'Miniaturas RPG',
  slug: 'miniaturas-rpg',
  description: 'Miniaturas para RPG de mesa',
  imageUrl: null,
  icon: '🎲',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: { products: 3 },
};

const mockPrisma = {
  category: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('CategoriesService', () => {
  let service: CategoriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    jest.clearAllMocks();
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  // ── findAll ────────────────────────────────────────────────────

  describe('findAll', () => {
    it('retorna apenas categorias ativas', async () => {
      mockPrisma.category.findMany.mockResolvedValue([mockCategory]);

      const result = await service.findAll();

      expect(mockPrisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
      expect(result).toHaveLength(1);
    });
  });

  // ── findAllAdmin ───────────────────────────────────────────────

  describe('findAllAdmin', () => {
    it('retorna todas as categorias (ativas e inativas)', async () => {
      const inactive = { ...mockCategory, id: 2, isActive: false };
      mockPrisma.category.findMany.mockResolvedValue([mockCategory, inactive]);

      const result = await service.findAllAdmin();

      expect(mockPrisma.category.findMany).toHaveBeenCalledWith(
        expect.not.objectContaining({ where: expect.anything() }),
      );
      expect(result).toHaveLength(2);
    });
  });

  // ── create ─────────────────────────────────────────────────────

  describe('create', () => {
    it('deve gerar slug a partir do nome', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);
      mockPrisma.category.create.mockResolvedValue(mockCategory);

      await service.create({ name: 'Miniaturas RPG' });

      expect(mockPrisma.category.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ slug: 'miniaturas-rpg' }),
        }),
      );
    });

    it('deve gerar slug em lowercase e sem caracteres especiais', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);
      mockPrisma.category.create.mockResolvedValue({ ...mockCategory, slug: 'pecas-de-xadrez' });

      await service.create({ name: 'Peças de Xadrez!' });

      expect(mockPrisma.category.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ slug: 'pecas-de-xadrez' }),
        }),
      );
    });

    it('deve lançar ConflictException quando slug já existe', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);

      await expect(service.create({ name: 'Miniaturas RPG' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('deve salvar description, imageUrl e icon quando fornecidos', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);
      mockPrisma.category.create.mockResolvedValue(mockCategory);

      await service.create({
        name: 'Teste',
        description: 'Desc',
        imageUrl: 'https://cdn.test/img.jpg',
        icon: '🎯',
      });

      expect(mockPrisma.category.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: 'Desc',
            imageUrl: 'https://cdn.test/img.jpg',
            icon: '🎯',
          }),
        }),
      );
    });
  });

  // ── update ─────────────────────────────────────────────────────

  describe('update', () => {
    it('deve lançar NotFoundException quando categoria não existe', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(service.update(999, { name: 'Novo Nome' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve regenerar slug quando nome é alterado', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);
      mockPrisma.category.update.mockResolvedValue({ ...mockCategory, name: 'Novo Nome', slug: 'novo-nome' });

      await service.update(1, { name: 'Novo Nome' });

      expect(mockPrisma.category.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ slug: 'novo-nome' }),
        }),
      );
    });

    it('não regenera slug quando nome não é alterado', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);
      mockPrisma.category.update.mockResolvedValue({ ...mockCategory, description: 'Nova desc' });

      await service.update(1, { description: 'Nova desc' });

      const callData = mockPrisma.category.update.mock.calls[0][0].data;
      expect(callData.slug).toBeUndefined();
    });

    it('deve atualizar isActive para false (desativar)', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);
      mockPrisma.category.update.mockResolvedValue({ ...mockCategory, isActive: false });

      await service.update(1, { isActive: false });

      expect(mockPrisma.category.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isActive: false }),
        }),
      );
    });
  });

  // ── remove ─────────────────────────────────────────────────────

  describe('remove', () => {
    it('deve lançar NotFoundException quando categoria não existe', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });

    it('deve fazer soft-delete (desativar) quando categoria tem produtos', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({
        ...mockCategory,
        _count: { products: 5 },
      });
      mockPrisma.category.update.mockResolvedValue({ ...mockCategory, isActive: false });

      await service.remove(1);

      expect(mockPrisma.category.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: false } }),
      );
      expect(mockPrisma.category.delete).not.toHaveBeenCalled();
    });

    it('deve fazer hard-delete quando categoria não tem produtos', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({
        ...mockCategory,
        _count: { products: 0 },
      });
      mockPrisma.category.delete.mockResolvedValue(mockCategory);

      await service.remove(1);

      expect(mockPrisma.category.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockPrisma.category.update).not.toHaveBeenCalled();
    });
  });
});
