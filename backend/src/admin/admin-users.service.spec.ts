import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AdminUsersService } from './admin-users.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

const mockUser = {
  id: 'user-001',
  name: 'João Admin',
  email: 'joao@email.com',
  role: UserRole.CUSTOMER,
  isActive: true,
  createdAt: new Date('2024-01-01'),
  customer: { id: 'cust-001', phone: null, _count: { orders: 3 } },
};

const mockPrisma = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  customer: {
    create: jest.fn(),
    updateMany: jest.fn(),
  },
  order: {
    findMany: jest.fn(),
    aggregate: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('AdminUsersService', () => {
  let service: AdminUsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminUsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AdminUsersService>(AdminUsersService);
    jest.clearAllMocks();
  });

  // ── findAll ──────────────────────────────────────────────
  describe('findAll', () => {
    beforeEach(() => {
      mockPrisma.$transaction.mockResolvedValue([[mockUser], 1]);
    });

    it('retorna lista paginada sem filtros', async () => {
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.pages).toBe(1);
    });

    it('aplica filtro de busca por nome/email', async () => {
      await service.findAll({ page: 1, limit: 10, search: 'joão' });
      const [call] = mockPrisma.$transaction.mock.calls[0];
      // A chamada ao $transaction recebe um array de queries
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('calcula pages corretamente para múltiplas páginas', async () => {
      mockPrisma.$transaction.mockResolvedValue([[mockUser], 25]);
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.pages).toBe(3);
    });

    it('filtra por role quando fornecido', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0]);
      const result = await service.findAll({ page: 1, limit: 10, role: UserRole.ADMIN });
      expect(result.total).toBe(0);
    });
  });

  // ── findOne ──────────────────────────────────────────────
  describe('findOne', () => {
    it('retorna usuário completo com cliente, endereços e pedidos', async () => {
      const fullUser = {
        ...mockUser,
        customer: {
          id: 'cust-001', phone: null,
          addresses: [],
          orders: [{ id: 'ord-1', orderNumber: '#2024-001', total: 99.9, status: 'DELIVERED', createdAt: new Date() }],
        },
      };
      mockPrisma.user.findUnique.mockResolvedValue(fullUser);
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { total: 99.9 } });

      const result = await service.findOne('user-001');
      expect(result.id).toBe('user-001');
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-001' } }),
      );
    });

    it('lança NotFoundException quando usuário não existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findOne('inexistente')).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ───────────────────────────────────────────────
  describe('create', () => {
    const dto = {
      name: 'Novo Usuário', email: 'novo@email.com',
      password: 'Senha@123', role: UserRole.CUSTOMER,
    };

    it('cria usuário e customer em transação', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (cb: any) =>
        cb({
          user:     { create: jest.fn().mockResolvedValue({ ...mockUser, ...dto, id: 'new-id' }) },
          customer: { create: jest.fn().mockResolvedValue({ id: 'cust-new' }) },
        }),
      );

      const result = await service.create(dto);
      expect(result).toBeDefined();
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('lança ConflictException quando email já está em uso', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('faz hash da senha antes de salvar', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      let capturedPasswordHash = '';
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          user: { create: jest.fn().mockImplementation((args: any) => {
            capturedPasswordHash = args.data.passwordHash;
            return Promise.resolve({ ...mockUser });
          })},
          customer: { create: jest.fn().mockResolvedValue({}) },
        };
        return cb(tx);
      });

      await service.create(dto);
      expect(capturedPasswordHash).not.toBe(dto.password);
      expect(await bcrypt.compare(dto.password, capturedPasswordHash)).toBe(true);
    });
  });

  // ── update ───────────────────────────────────────────────
  describe('update', () => {
    it('atualiza campos do usuário e sincroniza nome no Customer', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, name: 'João Atualizado' });
      mockPrisma.customer.updateMany.mockResolvedValue({ count: 1 });

      await service.update('user-001', { name: 'João Atualizado' });
      expect(mockPrisma.user.update).toHaveBeenCalled();
      expect(mockPrisma.customer.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-001' }, data: { name: 'João Atualizado' } }),
      );
    });

    it('não sincroniza nome quando não foi alterado', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, isActive: false });

      await service.update('user-001', { isActive: false });
      expect(mockPrisma.customer.updateMany).not.toHaveBeenCalled();
    });

    it('lança NotFoundException quando usuário não existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.update('inexistente', {})).rejects.toThrow(NotFoundException);
    });
  });
});
