import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';

const mockConfig = {
  get: jest.fn().mockReturnValue('test-jwt-secret'),
};

const mockPrisma = {
  user:     { findUnique: jest.fn() },
  customer: { create:    jest.fn() },
};

const baseUser = {
  id: 'user-001',
  email: 'joao@email.com',
  name: 'João Silva',
  role: 'CUSTOMER',
  isActive: true,
  customer: { id: 'cust-001' },
};

const payload = { sub: 'user-001', email: 'joao@email.com', role: 'CUSTOMER' };

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    // PassportStrategy chama super() no constructor e exige secretOrKey
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: ConfigService,  useValue: mockConfig  },
        { provide: PrismaService,  useValue: mockPrisma  },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    jest.clearAllMocks();
  });

  it('retorna dados do usuário quando token é válido e customer existe', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(baseUser);

    const result = await strategy.validate(payload);
    expect(result.id).toBe('user-001');
    expect(result.customerId).toBe('cust-001');
    expect(result.role).toBe('CUSTOMER');
    expect(mockPrisma.customer.create).not.toHaveBeenCalled();
  });

  it('auto-cria Customer quando usuário não tem customer vinculado', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser, customer: null });
    mockPrisma.customer.create.mockResolvedValue({ id: 'cust-novo' });

    const result = await strategy.validate(payload);
    expect(mockPrisma.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'user-001', email: 'joao@email.com' }),
      }),
    );
    expect(result.customerId).toBe('cust-novo');
  });

  it('lança UnauthorizedException quando usuário não existe', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
  });

  it('lança UnauthorizedException quando usuário está inativo', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser, isActive: false });
    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
  });
});
