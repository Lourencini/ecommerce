import { Test, TestingModule } from '@nestjs/testing';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { UserRole } from '@prisma/client';

const mockAdminUsersService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create:  jest.fn(),
  update:  jest.fn(),
};

const mockUser = { id: 'u1', name: 'Admin', email: 'a@a.com', role: UserRole.ADMIN, isActive: true };

describe('AdminUsersController', () => {
  let controller: AdminUsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminUsersController],
      providers: [{ provide: AdminUsersService, useValue: mockAdminUsersService }],
    }).compile();

    controller = module.get<AdminUsersController>(AdminUsersController);
    jest.clearAllMocks();
  });

  it('findAll — repassa parâmetros de filtro ao service', async () => {
    mockAdminUsersService.findAll.mockResolvedValue({ data: [mockUser], total: 1, pages: 1 });
    // Controller recebe page/limit como numbers (ParseIntPipe já converte), isActive como string
    const result = await controller.findAll(2, 5, 'João', UserRole.ADMIN, 'true');
    expect(mockAdminUsersService.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, limit: 5, search: 'João', role: UserRole.ADMIN, isActive: true }),
    );
    expect(result.total).toBe(1);
  });

  it('findAll — usa defaults quando parâmetros não são informados', async () => {
    mockAdminUsersService.findAll.mockResolvedValue({ data: [], total: 0, pages: 0 });
    await controller.findAll(1, 20);
    expect(mockAdminUsersService.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 20 }),
    );
  });

  it('findOne — delega id ao service', async () => {
    mockAdminUsersService.findOne.mockResolvedValue(mockUser);
    const result = await controller.findOne('u1');
    expect(mockAdminUsersService.findOne).toHaveBeenCalledWith('u1');
    expect(result).toEqual(mockUser);
  });

  it('create — delega dto ao service', async () => {
    const dto = { name: 'Novo', email: 'novo@email.com', password: 'Abc@123', role: UserRole.CUSTOMER };
    mockAdminUsersService.create.mockResolvedValue({ ...mockUser, ...dto });
    await controller.create(dto);
    expect(mockAdminUsersService.create).toHaveBeenCalledWith(dto);
  });

  it('update — delega id e dto ao service', async () => {
    mockAdminUsersService.update.mockResolvedValue({ ...mockUser, isActive: false });
    await controller.update('u1', { isActive: false });
    expect(mockAdminUsersService.update).toHaveBeenCalledWith('u1', { isActive: false });
  });
});
