import { Test, TestingModule } from '@nestjs/testing';
import { AdminSettingsController } from './admin-settings.controller';
import { AdminSettingsService } from './admin-settings.service';

const mockAdminSettingsService = {
  getPaymentsConfig:    jest.fn(),
  updatePaymentsConfig: jest.fn(),
  testConnection:       jest.fn(),
};

describe('AdminSettingsController', () => {
  let controller: AdminSettingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminSettingsController],
      providers: [{ provide: AdminSettingsService, useValue: mockAdminSettingsService }],
    }).compile();

    controller = module.get<AdminSettingsController>(AdminSettingsController);
    jest.clearAllMocks();
  });

  it('getPayments — retorna config mascarada do service', async () => {
    const config = { accessTokenMasked: 'TEST-****', isTokenSet: true, isWebhookSet: false, environment: 'sandbox' };
    mockAdminSettingsService.getPaymentsConfig.mockResolvedValue(config);
    const result = await controller.getPayments();
    expect(mockAdminSettingsService.getPaymentsConfig).toHaveBeenCalled();
    expect(result.isTokenSet).toBe(true);
  });

  it('updatePayments — passa accessToken e webhookSecret ao service', async () => {
    const config = { isTokenSet: true, isWebhookSet: true, environment: 'sandbox', accessTokenMasked: 'TEST-****' };
    mockAdminSettingsService.updatePaymentsConfig.mockResolvedValue(config);
    const result = await controller.updatePayments({ accessToken: 'TEST-new', webhookSecret: 'secret' });
    expect(mockAdminSettingsService.updatePaymentsConfig).toHaveBeenCalledWith({ accessToken: 'TEST-new', webhookSecret: 'secret' });
    expect(result.isTokenSet).toBe(true);
  });

  it('testConnection — retorna resultado do teste de conexão', async () => {
    const testResult = { ok: true, accountEmail: 'test@mp.com', environment: 'sandbox', message: 'Conectado!' };
    mockAdminSettingsService.testConnection.mockResolvedValue(testResult);
    const result = await controller.testConnection();
    expect(mockAdminSettingsService.testConnection).toHaveBeenCalled();
    expect(result.ok).toBe(true);
    expect(result.accountEmail).toBe('test@mp.com');
  });
});
