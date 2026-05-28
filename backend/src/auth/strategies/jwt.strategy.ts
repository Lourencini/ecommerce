import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;      // user.id
  email: string;
  role: string;
  customerId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'changeme-in-production'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { customer: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    }

    // Auto-criar Customer para usuários legados que não possuem um
    let customerId = user.customer?.id ?? null;
    if (!customerId) {
      const created = await this.prisma.customer.create({
        data: { userId: user.id, name: user.name, email: user.email },
      });
      customerId = created.id;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      customerId,
    };
  }
}
