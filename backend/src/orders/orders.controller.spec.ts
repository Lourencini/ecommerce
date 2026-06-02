import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

const mockOrdersService = {
  create:            jest.fn(),
  findAll:           jest.fn(),
  findOne:           jest.fn(),
  updateStatus:      jest.fn(),
  setTrackingCode:   jest.fn(),
  trackOrder:        jest.fn(),
  getCycleTimeMetrics: jest.fn(),
  getSummaryMetrics:   jest.fn(),
};

const mockUser = { id: 'u1', customerId: 'c1', role: 'CUSTOMER', email: 'u@u.com', name: 'User' };

describe('OrdersController', () => {
  let controller: OrdersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: mockOrdersService }],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    jest.clearAllMocks();
  });

  it('create — delega ao service com customerId do usuário', async () => {
    const dto = { shippingQuoteId: 1, items: [{ productId: 'p1', quantity: 1 }] };
    mockOrdersService.create.mockResolvedValue({ id: 'ord-1' });
    await controller.create(dto as any, mockUser as any);
    expect(mockOrdersService.create).toHaveBeenCalledWith(dto, 'c1');
  });

  it('findAll — retorna lista paginada', async () => {
    mockOrdersService.findAll.mockResolvedValue({ data: [], total: 0, pages: 0 });
    const result = await controller.findAll();
    expect(mockOrdersService.findAll).toHaveBeenCalled();
    expect(result).toEqual({ data: [], total: 0, pages: 0 });
  });

  it('findAll — passa parâmetros de filtro ao service', async () => {
    mockOrdersService.findAll.mockResolvedValue({ data: [], total: 0, pages: 0 });
    await controller.findAll('2', '5', 'SHIPPED', 'João', '2024-01-01', '2024-12-31');
    expect(mockOrdersService.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, limit: 5, status: 'SHIPPED', search: 'João' }),
    );
  });

  it('findOne — passa usuário ao service para verificação de ownership', async () => {
    mockOrdersService.findOne.mockResolvedValue({ id: 'ord-1' });
    await controller.findOne('ord-1', mockUser as any);
    expect(mockOrdersService.findOne).toHaveBeenCalledWith('ord-1', mockUser);
  });

  it('updateStatus — delega status e nota ao service', async () => {
    mockOrdersService.updateStatus.mockResolvedValue({ status: 'CONFIRMED' });
    await controller.updateStatus('ord-1', { status: 'CONFIRMED' as any, note: 'ok' });
    expect(mockOrdersService.updateStatus).toHaveBeenCalledWith('ord-1', 'CONFIRMED', 'ok');
  });

  it('getMetrics — retorna cycle time', async () => {
    mockOrdersService.getCycleTimeMetrics.mockResolvedValue({ averageHours: 24 });
    const result = await controller.getMetrics();
    expect(result.averageHours).toBe(24);
  });

  it('getSummary — retorna KPIs do dashboard', async () => {
    mockOrdersService.getSummaryMetrics.mockResolvedValue({ totalOrders: 10, pendingOrders: 2 });
    const result = await controller.getSummary();
    expect(result.totalOrders).toBe(10);
  });
});
