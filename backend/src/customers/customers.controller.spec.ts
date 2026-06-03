import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

const mockCustomersService = {
  getMe:             jest.fn(),
  updateMe:          jest.fn(),
  getMyOrders:       jest.fn(),
  getAddresses:      jest.fn(),
  addAddress:        jest.fn(),
  setDefaultAddress: jest.fn(),
  deleteAddress:     jest.fn(),
};

const makeUser = (customerId?: string) => ({
  id: 'user-001', email: 'u@u.com', name: 'User', role: 'CUSTOMER', customerId,
});

describe('CustomersController', () => {
  let controller: CustomersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [{ provide: CustomersService, useValue: mockCustomersService }],
    }).compile();

    controller = module.get<CustomersController>(CustomersController);
    jest.clearAllMocks();
  });

  // ── requireCustomer guard (sincronamente via endpoint) ───
  describe('requireCustomer', () => {
    it('lança ForbiddenException quando usuário não tem customerId', () => {
      const user = makeUser(undefined) as any;
      // requireCustomer é síncrono — lança antes de chamar o service
      expect(() => controller.getMe(user)).toThrow(ForbiddenException);
    });

    it('lança ForbiddenException em outros endpoints também', () => {
      const user = makeUser(undefined) as any;
      expect(() => controller.getAddresses(user)).toThrow(ForbiddenException);
    });
  });

  // ── endpoints ────────────────────────────────────────────
  it('getMe — delega ao service com customerId', async () => {
    const user = makeUser('cust-001');
    mockCustomersService.getMe.mockResolvedValue({ id: 'cust-001' });
    await controller.getMe(user as any);
    expect(mockCustomersService.getMe).toHaveBeenCalledWith('cust-001');
  });

  it('updateMe — passa dto e customerId ao service', async () => {
    const user = makeUser('cust-001');
    mockCustomersService.updateMe.mockResolvedValue({ id: 'cust-001', name: 'Novo' });
    await controller.updateMe(user as any, { name: 'Novo' });
    expect(mockCustomersService.updateMe).toHaveBeenCalledWith('cust-001', { name: 'Novo' });
  });

  it('getMyOrders — retorna pedidos do cliente', async () => {
    const user = makeUser('cust-001');
    mockCustomersService.getMyOrders.mockResolvedValue([{ id: 'ord-1' }]);
    const result = await controller.getMyOrders(user as any);
    expect(result).toHaveLength(1);
  });

  it('getAddresses — retorna endereços do cliente', async () => {
    const user = makeUser('cust-001');
    mockCustomersService.getAddresses.mockResolvedValue([]);
    await controller.getAddresses(user as any);
    expect(mockCustomersService.getAddresses).toHaveBeenCalledWith('cust-001');
  });

  it('addAddress — cria endereço com dto correto', async () => {
    const user = makeUser('cust-001');
    const dto = { street: 'Rua A', number: '1', neighborhood: 'B', city: 'SP', state: 'SP', zipCode: '01310100', isDefault: false };
    mockCustomersService.addAddress.mockResolvedValue({ id: 1, ...dto });
    await controller.addAddress(user as any, dto as any);
    expect(mockCustomersService.addAddress).toHaveBeenCalledWith('cust-001', dto);
  });

  it('setDefault — chama service com addressId correto', async () => {
    const user = makeUser('cust-001');
    mockCustomersService.setDefaultAddress.mockResolvedValue({ id: 5, isDefault: true });
    await controller.setDefault(user as any, 5);
    expect(mockCustomersService.setDefaultAddress).toHaveBeenCalledWith('cust-001', 5);
  });

  it('deleteAddress — chama service com addressId correto', async () => {
    const user = makeUser('cust-001');
    mockCustomersService.deleteAddress.mockResolvedValue(undefined);
    await controller.deleteAddress(user as any, 5);
    expect(mockCustomersService.deleteAddress).toHaveBeenCalledWith('cust-001', 5);
  });
});
