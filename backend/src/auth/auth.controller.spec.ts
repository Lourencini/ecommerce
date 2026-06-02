import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const mockAuthService = {
  register: jest.fn(),
  login:    jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('delega ao AuthService e retorna token', async () => {
      const dto = { name: 'Teste', email: 't@t.com', password: 'Senha@123' };
      mockAuthService.register.mockResolvedValue({ accessToken: 'jwt.token' });
      const result = await controller.register(dto);
      expect(result.accessToken).toBeDefined();
      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
    });
  });

  describe('login', () => {
    it('delega ao AuthService e retorna token', async () => {
      const dto = { email: 't@t.com', password: 'Senha@123' };
      mockAuthService.login.mockResolvedValue({ accessToken: 'jwt.token' });
      const result = await controller.login(dto);
      expect(result.accessToken).toBeDefined();
      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
    });
  });
});
