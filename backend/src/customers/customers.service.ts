import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async getMe(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: { addresses: { orderBy: { isDefault: 'desc' } } },
    });

    if (!customer) throw new NotFoundException('Cliente não encontrado.');
    return customer;
  }

  async getMyOrders(customerId: string) {
    return this.prisma.order.findMany({
      where: { customerId },
      orderBy: { orderedAt: 'desc' },
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  async addAddress(customerId: string, dto: CreateAddressDto) {
    // Se for padrão, remover flag dos demais
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { customerId },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.create({
      data: {
        ...dto,
        customerId,
      },
    });
  }

  async getAddresses(customerId: string) {
    return this.prisma.address.findMany({
      where: { customerId },
      orderBy: { isDefault: 'desc' },
    });
  }

  async setDefaultAddress(customerId: string, addressId: number) {
    // Verificar se o endereço pertence ao cliente
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, customerId },
    });

    if (!address) throw new NotFoundException('Endereço não encontrado.');

    await this.prisma.address.updateMany({
      where: { customerId },
      data: { isDefault: false },
    });

    return this.prisma.address.update({
      where: { id: addressId },
      data: { isDefault: true },
    });
  }
}
