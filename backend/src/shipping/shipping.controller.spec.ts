import { Test, TestingModule } from '@nestjs/testing';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';

const mockShippingService = {
  calculate: jest.fn(),
  saveQuote: jest.fn(),
};

describe('ShippingController', () => {
  let controller: ShippingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShippingController],
      providers: [{ provide: ShippingService, useValue: mockShippingService }],
    }).compile();

    controller = module.get<ShippingController>(ShippingController);
    jest.clearAllMocks();
  });

  it('calculate — delega dto ao service e retorna opções de frete', async () => {
    const dto = { zipCodeDest: '01310100', products: [{ productId: 'p1', quantity: 1, weightGrams: 500, lengthCm: 10, widthCm: 10, heightCm: 5 }] };
    const options = [{ carrier: 'Correios', serviceName: 'SEDEX', price: 29.9, deadlineDays: 3 }];
    mockShippingService.calculate.mockResolvedValue(options);

    const result = await controller.calculate(dto as any);
    expect(mockShippingService.calculate).toHaveBeenCalledWith(dto);
    expect(result).toEqual(options);
  });

  it('saveQuote — delega dto ao service e retorna cotação salva', async () => {
    const dto = { zipCodeDest: '01310100', weightGrams: 500, lengthCm: 10, widthCm: 10, heightCm: 5, price: 29.9, deadlineDays: 3, serviceName: 'SEDEX', carrier: 'Correios' };
    const quote = { id: 1, ...dto, expiresAt: new Date() };
    mockShippingService.saveQuote.mockResolvedValue(quote);

    const result = await controller.saveQuote(dto as any);
    expect(mockShippingService.saveQuote).toHaveBeenCalledWith(dto);
    expect(result.id).toBe(1);
  });
});
