import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserAdminDto } from './dto/create-user-admin.dto';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';
import { UserRole } from '@prisma/client';

export interface UsersListParams {
  page: number;
  limit: number;
  search?: string;
  role?: UserRole;
  isActive?: boolean;
}

@Injectable()
export class AdminUsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: UsersListParams) {
    const { page, limit, search, role, isActive } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name:  { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role)     where.role     = role;
    if (isActive !== undefined) where.isActive = isActive;

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          customer: {
            select: {
              id: true,
              phone: true,
              _count: { select: { orders: true } },
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        customer: {
          select: {
            id: true,
            phone: true,
            document: true,
            addresses: {
              orderBy: { isDefault: 'desc' },
            },
            orders: {
              orderBy: { createdAt: 'desc' },
              take: 10,
              select: {
                id: true,
                orderNumber: true,
                status: true,
                total: true,
                createdAt: true,
                paymentMethod: true,
                items: {
                  select: {
                    productName: true,
                    quantity: true,
                    totalPrice: true,
                  },
                },
              },
            },
            _count: { select: { orders: true } },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('Usuário não encontrado.');

    // Calcular total gasto
    const totalSpent = user.customer
      ? await this.prisma.order.aggregate({
          where: { customerId: user.customer.id },
          _sum: { total: true },
        })
      : null;

    return {
      ...user,
      customer: user.customer
        ? { ...user.customer, totalSpent: totalSpent?._sum?.total ?? 0 }
        : null,
    };
  }

  async create(dto: CreateUserAdminDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('E-mail já cadastrado.');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          passwordHash,
          role: dto.role ?? 'CUSTOMER',
        },
      });
      // Criar Customer vinculado automaticamente
      await tx.customer.create({
        data: { userId: user.id, name: user.name, email: user.email },
      });
      return user;
    });
  }

  async update(id: string, dto: UpdateUserAdminDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name     !== undefined && { name:     dto.name }),
        ...(dto.role     !== undefined && { role:     dto.role }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      select: {
        id: true, name: true, email: true,
        role: true, isActive: true, updatedAt: true,
      },
    });

    // Sincronizar nome no Customer se alterado
    if (dto.name && user.customer) {
      await this.prisma.customer.updateMany({
        where: { userId: id },
        data: { name: dto.name },
      });
    }

    return updated;
  }
}
