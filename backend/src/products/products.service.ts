import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import {
    ProductNotFoundException,
    ProductSkuConflictException,
} from '../common/exceptions/domain.exceptions';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
    private readonly logger = new Logger(ProductsService.name);

    constructor(private prisma: PrismaService) { }

    async create(createProductDto: CreateProductDto) {
        try {
            return await this.prisma.product.create({
                data: {
                    ...createProductDto,
                    priceInCents: createProductDto.price,
                    compareAtPrice: createProductDto.compareAtPrice,
                },
            });
        } catch (error) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002'
            ) {
                throw new ProductSkuConflictException(createProductDto.sku);
            }
            throw error;
        }
    }

    async findAll(query: ProductQueryDto) {
        const {
            page = 1,
            limit = 20,
            search,
            categoryId,
            isActive,
            isFeatured,
        } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.ProductWhereInput = {
            ...(categoryId && { categoryId }),
            ...(isActive !== undefined && { isActive }),
            ...(isFeatured !== undefined && { isFeatured }),
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { sku: { contains: search, mode: 'insensitive' } },
                ],
            }),
        };

        const [items, total] = await Promise.all([
            this.prisma.product.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { category: true },
            }),
            this.prisma.product.count({ where }),
        ]);

        return {
            items,
            meta: {
                total,
                page,
                lastPage: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: string) {
        const product = await this.prisma.product.findUnique({
            where: { id },
            include: { category: true },
        });

        if (!product) {
            throw new ProductNotFoundException(id);
        }

        return product;
    }

    async update(id: string, updateProductDto: UpdateProductDto) {
        // Verifica se existe
        await this.findOne(id);

        try {
            return await this.prisma.product.update({
                where: { id },
                data: {
                    ...updateProductDto,
                    ...(updateProductDto.price !== undefined && {
                        priceInCents: updateProductDto.price,
                    }),
                },
            });
        } catch (error) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002'
            ) {
                throw new ProductSkuConflictException(updateProductDto.sku!);
            }
            throw error;
        }
    }

    async remove(id: string) {
        await this.findOne(id);
        // Inativa em vez de deletar fisicamente (Soft Delete padrão no e-commerce)
        return this.prisma.product.update({
            where: { id },
            data: { isActive: false },
        });
    }
}
