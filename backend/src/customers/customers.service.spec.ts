import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { PrismaService } from '../prisma/prisma.service';

const CUSTOMER_ID = 'cust-uuid-001';
const ADDRESS_ID = 1;

const mockCustomer = {
  id: CUSTOMER_ID,
  name: 'Maria Silva',
  email: 'maria@email.com',
  phone: null,
  addresses: [],
};

const mockAddress = {
  id: ADDRESS_ID,
  customerId: CUSTOMER_ID,
  street: 'Rua das Flores',
  number: '123',
  complement: null,
  neighborhood: 'Centro',
  city: 'São Paulo',
  state: 'SP',
  zipCode: '01310100',
  isDefault: false,
  label: null,
  createdAt: new Date(),
  orders: [],
};

const mockPrisma = {
  customer: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  order: {
    findMany: jest.fn(),
  },
  address: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
};

describe('CustomersService', () => {
  let service: CustomersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    jest.clearAllMocks();
  });

  // ── getMe ────────────────────────────────────────────────
  describe('getMe', () => {
    it('retorna o cliente com endereços quando encontrado', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(mockCustomer);
      const result = await service.getMe(CUSTOMER_ID);
      expect(result).toEqual(mockCustomer);
      expect(mockPrisma.customer.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: CUSTOMER_ID } }),
      );
    });

    it('lança NotFoundException quando cliente não existe', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);
      await expect(service.getMe(CUSTOMER_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ── updateMe ─────────────────────────────────────────────
  describe('updateMe', () => {
    it('atualiza nome e telefone do cliente', async () => {
      const updated = { ...mockCustomer, name: 'Maria Santos', phone: '11999999999' };
      mockPrisma.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrisma.customer.update.mockResolvedValue(updated);

      const result = await service.updateMe(CUSTOMER_ID, { name: 'Maria Santos', phone: '11999999999' });
      expect(result.name).toBe('Maria Santos');
      expect(mockPrisma.customer.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: CUSTOMER_ID } }),
      );
    });

    it('lança NotFoundException quando cliente não existe', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);
      await expect(service.updateMe(CUSTOMER_ID, { name: 'X' })).rejects.toThrow(NotFoundException);
      expect(mockPrisma.customer.update).not.toHaveBeenCalled();
    });

    it('ignora campos undefined no update', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrisma.customer.update.mockResolvedValue(mockCustomer);
      await service.updateMe(CUSTOMER_ID, {});
      expect(mockPrisma.customer.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: {} }),
      );
    });
  });

  // ── getMyOrders ──────────────────────────────────────────
  describe('getMyOrders', () => {
    it('retorna pedidos do cliente ordenados por data', async () => {
      const orders = [{ id: 'ord-1' }, { id: 'ord-2' }];
      mockPrisma.order.findMany.mockResolvedValue(orders);
      const result = await service.getMyOrders(CUSTOMER_ID);
      expect(result).toEqual(orders);
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { customerId: CUSTOMER_ID } }),
      );
    });

    it('retorna lista vazia quando não há pedidos', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      const result = await service.getMyOrders(CUSTOMER_ID);
      expect(result).toHaveLength(0);
    });
  });

  // ── getAddresses ─────────────────────────────────────────
  describe('getAddresses', () => {
    it('retorna lista de endereços do cliente', async () => {
      mockPrisma.address.findMany.mockResolvedValue([mockAddress]);
      const result = await service.getAddresses(CUSTOMER_ID);
      expect(result).toHaveLength(1);
      expect(mockPrisma.address.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { customerId: CUSTOMER_ID } }),
      );
    });
  });

  // ── addAddress ───────────────────────────────────────────
  describe('addAddress', () => {
    const dto = {
      street: 'Av. Paulista', number: '1000', neighborhood: 'Bela Vista',
      city: 'São Paulo', state: 'SP', zipCode: '01311000', isDefault: false,
    };

    it('cria endereço sem remover padrão existente quando isDefault=false', async () => {
      mockPrisma.address.create.mockResolvedValue({ ...mockAddress, ...dto });
      await service.addAddress(CUSTOMER_ID, dto);
      expect(mockPrisma.address.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.address.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ customerId: CUSTOMER_ID }) }),
      );
    });

    it('remove padrão dos outros endereços ao criar com isDefault=true', async () => {
      const defaultDto = { ...dto, isDefault: true };
      mockPrisma.address.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.address.create.mockResolvedValue({ ...mockAddress, isDefault: true });

      await service.addAddress(CUSTOMER_ID, defaultDto);
      expect(mockPrisma.address.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { customerId: CUSTOMER_ID }, data: { isDefault: false } }),
      );
    });
  });

  // ── deleteAddress ────────────────────────────────────────
  describe('deleteAddress', () => {
    it('lança NotFoundException quando endereço não pertence ao cliente', async () => {
      mockPrisma.address.findFirst.mockResolvedValue(null);
      await expect(service.deleteAddress(CUSTOMER_ID, ADDRESS_ID)).rejects.toThrow(NotFoundException);
    });

    it('faz soft delete quando há pedidos vinculados', async () => {
      mockPrisma.address.findFirst.mockResolvedValue({ ...mockAddress, orders: [{ id: 'ord-1' }] });
      mockPrisma.address.update.mockResolvedValue({ ...mockAddress, label: '[excluído]' });

      await service.deleteAddress(CUSTOMER_ID, ADDRESS_ID);
      expect(mockPrisma.address.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { label: '[excluído]', isDefault: false } }),
      );
      expect(mockPrisma.address.delete).not.toHaveBeenCalled();
    });

    it('deleta fisicamente quando não há pedidos vinculados', async () => {
      mockPrisma.address.findFirst.mockResolvedValue({ ...mockAddress, orders: [] });
      mockPrisma.address.delete.mockResolvedValue(mockAddress);

      await service.deleteAddress(CUSTOMER_ID, ADDRESS_ID);
      expect(mockPrisma.address.delete).toHaveBeenCalledWith({ where: { id: ADDRESS_ID } });
    });
  });

  // ── setDefaultAddress ────────────────────────────────────
  describe('setDefaultAddress', () => {
    it('define endereço como padrão removendo o anterior', async () => {
      mockPrisma.address.findFirst.mockResolvedValue(mockAddress);
      mockPrisma.address.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.address.update.mockResolvedValue({ ...mockAddress, isDefault: true });

      const result = await service.setDefaultAddress(CUSTOMER_ID, ADDRESS_ID);
      expect(mockPrisma.address.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { customerId: CUSTOMER_ID }, data: { isDefault: false } }),
      );
      expect(mockPrisma.address.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: ADDRESS_ID }, data: { isDefault: true } }),
      );
      expect(result.isDefault).toBe(true);
    });

    it('lança NotFoundException quando endereço não pertence ao cliente', async () => {
      mockPrisma.address.findFirst.mockResolvedValue(null);
      await expect(service.setDefaultAddress(CUSTOMER_ID, ADDRESS_ID)).rejects.toThrow(NotFoundException);
    });
  });
});
