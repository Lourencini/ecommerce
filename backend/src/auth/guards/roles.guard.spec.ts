import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';

const makeContext = (role: string) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as any;
    guard = new RolesGuard(reflector);
  });

  it('permite acesso quando nenhuma role é exigida', () => {
    reflector.getAllAndOverride.mockReturnValue(null);
    expect(guard.canActivate(makeContext('CUSTOMER'))).toBe(true);
  });

  it('permite acesso quando usuário tem a role correta', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);
    expect(guard.canActivate(makeContext('ADMIN'))).toBe(true);
  });

  it('bloqueia acesso quando usuário não tem a role exigida', () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);
    expect(guard.canActivate(makeContext('CUSTOMER'))).toBe(false);
  });
});
