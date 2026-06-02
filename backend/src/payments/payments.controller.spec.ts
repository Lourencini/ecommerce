import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

const mockPaymentsService = {
  createPreference: jest.fn(),
  handleWebhook:    jest.fn(),
};

describe('PaymentsController', () => {
  let controller: PaymentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: PaymentsService, useValue: mockPaymentsService }],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    jest.clearAllMocks();
  });

  it('createPreference — delega orderId ao service', async () => {
    mockPaymentsService.createPreference.mockResolvedValue({ preferenceId: 'p1', initPoint: 'url' });
    const result = await controller.createPreference('order-uuid-001');
    expect(mockPaymentsService.createPreference).toHaveBeenCalledWith('order-uuid-001');
    expect(result.preferenceId).toBe('p1');
  });

  it('handleWebhook — delega body e headers ao service', async () => {
    mockPaymentsService.handleWebhook.mockResolvedValue({ received: true });
    const result = await controller.handleWebhook(
      { type: 'payment', data: { id: '123' } },
      'ts=123,v1=abc',
      'req-id-456',
    );
    expect(mockPaymentsService.handleWebhook).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'payment' }),
      'ts=123,v1=abc',
      'req-id-456',
    );
    expect(result).toEqual({ received: true });
  });
});
