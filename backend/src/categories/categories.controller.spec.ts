import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

const mockCategoriesService = {
  findAll:      jest.fn(),
  findAllAdmin: jest.fn(),
  create:       jest.fn(),
  update:       jest.fn(),
  remove:       jest.fn(),
};

const mockCategory = { id: 1, name: 'Miniaturas', slug: 'miniaturas', isActive: true, _count: { products: 3 } };

describe('CategoriesController', () => {
  let controller: CategoriesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [{ provide: CategoriesService, useValue: mockCategoriesService }],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
    jest.clearAllMocks();
  });

  it('findAll — retorna lista de categorias ativas', async () => {
    mockCategoriesService.findAll.mockResolvedValue([mockCategory]);
    const result = await controller.findAll();
    expect(result).toHaveLength(1);
    expect(mockCategoriesService.findAll).toHaveBeenCalled();
  });

  it('findAllAdmin — retorna todas as categorias (incluindo inativas)', async () => {
    mockCategoriesService.findAllAdmin.mockResolvedValue([mockCategory, { ...mockCategory, id: 2, isActive: false }]);
    const result = await controller.findAllAdmin();
    expect(result).toHaveLength(2);
  });

  it('create — delega criação ao service', async () => {
    const dto = { name: 'Esculturas', description: 'Arte 3D' };
    mockCategoriesService.create.mockResolvedValue({ ...mockCategory, ...dto });
    const result = await controller.create(dto as any);
    expect(mockCategoriesService.create).toHaveBeenCalledWith(dto);
    expect(result.name).toBe('Esculturas');
  });

  it('update — delega atualização ao service com id correto', async () => {
    mockCategoriesService.update.mockResolvedValue({ ...mockCategory, name: 'Miniaturas Premium' });
    await controller.update(1, { name: 'Miniaturas Premium' } as any);
    expect(mockCategoriesService.update).toHaveBeenCalledWith(1, { name: 'Miniaturas Premium' });
  });

  it('remove — delega remoção ao service', async () => {
    mockCategoriesService.remove.mockResolvedValue(mockCategory);
    await controller.remove(1);
    expect(mockCategoriesService.remove).toHaveBeenCalledWith(1);
  });
});
