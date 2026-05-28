import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

const mockUser = {
  id: 'user-uuid-001',
  name: 'João Silva',
  email: 'joao@email.com',
  passwordHash: '',
  role: 'CUSTOMER',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  customer: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const hash = await bcrypt.hash('senha123', 10);
    mockUser.passwordHash = hash;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  // ── register ───────────────────────────────────────────────────

  describe('register', () => {
    it('deve registrar usuário com sucesso e retornar accessToken', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const newUser = { ...mockUser, id: 'new-user-uuid' };
        return cb({
          user: { create: jest.fn().mockResolvedValue(newUser) },
          customer: { create: jest.fn().mockResolvedValue({}) },
        });
      });

      const result = await service.register({
        name: 'João Silva',
        email: 'joao@email.com',
        password: 'senha123',
      });

      expect(result).toHaveProperty('accessToken');
      expect(mockJwt.sign).toHaveBeenCalled();
    });

    it('deve lançar ConflictException quando e-mail já cadastrado', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.register({ name: 'Outro', email: 'joao@email.com', password: '123' }),
      ).rejects.toThrow(ConflictException);
    });

    it('deve fazer hash da senha antes de salvar', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      let capturedPasswordHash = '';

      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const fakeCreate = jest.fn().mockImplementation(async ({ data }: any) => {
          capturedPasswordHash = data.passwordHash;
          return { ...mockUser };
        });
        return cb({
          user: { create: fakeCreate },
          customer: { create: jest.fn().mockResolvedValue({}) },
        });
      });

      await service.register({ name: 'Maria', email: 'maria@test.com', password: 'minha_senha' });

      expect(capturedPasswordHash).not.toBe('minha_senha');
      expect(await bcrypt.compare('minha_senha', capturedPasswordHash)).toBe(true);
    });

    it('deve criar Customer vinculado ao User na mesma transação', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const customerCreate = jest.fn().mockResolvedValue({});

      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          user: { create: jest.fn().mockResolvedValue(mockUser) },
          customer: { create: customerCreate },
        });
      });

      await service.register({ name: 'Test', email: 'test@test.com', password: '123456' });
      expect(customerCreate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: mockUser.id }) }),
      );
    });
  });

  // ── login ──────────────────────────────────────────────────────

  describe('login', () => {
    it('deve retornar accessToken com credenciais válidas', async () => {
      const hash = await bcrypt.hash('senha123', 10);
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: hash });

      const result = await service.login({ email: 'joao@email.com', password: 'senha123' });

      expect(result).toHaveProperty('accessToken', 'mock.jwt.token');
    });

    it('deve lançar UnauthorizedException com senha incorreta', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.login({ email: 'joao@email.com', password: 'senhaErrada' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException quando usuário não existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'inexistente@email.com', password: '123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException para usuário inativo', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(
        service.login({ email: 'joao@email.com', password: 'senha123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve gerar JWT com sub, email e role no payload', async () => {
      const hash = await bcrypt.hash('senha123', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        passwordHash: hash,
        role: 'ADMIN',
      });

      await service.login({ email: 'admin@email.com', password: 'senha123' });

      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockUser.id,
          email: 'joao@email.com',
          role: 'ADMIN',
        }),
      );
    });
  });
});
