import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async updateMe(customerId: string, dto: UpdateCustomerDto) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Cliente não encontrado.');

    return this.prisma.customer.update({
      where: { id: customerId },
      data: {
        ...(dto.name  && { name:  dto.name }),
        ...(dto.phone && { phone: dto.phone }),
      },
    });
  }

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

  async deleteAddress(customerId: string, addressId: number) {
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, customerId },
      include: { orders: { take: 1 } },
    });

    if (!address) throw new NotFoundException('Endereço não encontrado.');

    // Não excluir se houver pedidos vinculados
    if (address.orders.length > 0) {
      // Marcar como inativo sem excluir (soft delete via label)
      return this.prisma.address.update({
        where: { id: addressId },
        data: { label: '[excluído]', isDefault: false },
      });
    }

    return this.prisma.address.delete({ where: { id: addressId } });
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
