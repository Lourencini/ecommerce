import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import {
  ProductNotFoundException,
  ProductSkuConflictException,
  ProductNameConflictException,
} from '../common/exceptions/domain.exceptions';
import { Prisma } from '@prisma/client';
import slugify from 'slugify';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private prisma: PrismaService) {}

  private generateSlug(name: string): string {
    return slugify(name, { lower: true, strict: true, locale: 'pt' });
  }

  private async uniqueSlug(name: string, excludeId?: string): Promise<string> {
    let slug = this.generateSlug(name);
    let suffix = 0;

    while (true) {
      const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
      const existing = await this.prisma.product.findFirst({
        where: {
          slug: candidate,
          ...(excludeId ? { NOT: { id: excludeId } } : {}),
        },
      });
      if (!existing) return candidate;
      suffix++;
    }
  }

  async create(createProductDto: CreateProductDto) {
    const existingByName = await this.prisma.product.findFirst({
      where: { name: createProductDto.name },
    });

    if (existingByName) {
      throw new ProductNameConflictException(createProductDto.name);
    }

    try {
      const { price, compareAtPrice, categoryId, ...rest } = createProductDto;
      const slug = await this.uniqueSlug(createProductDto.name);

      const product = await this.prisma.product.create({
        data: {
          ...rest,
          slug,
          priceInCents: price,
          compareAtPrice: compareAtPrice,
          category: categoryId ? { connect: { id: categoryId } } : undefined,
        },
      });

      return {
        data: {
          ...product,
          price: Number(product.priceInCents),
          compareAtPrice: product.compareAtPrice != null ? Number(product.compareAtPrice) : null,
        },
      };
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
          { description: { contains: search, mode: 'insensitive' } },
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

    const mappedItems = items.map((item) => ({
      ...item,
      price: Number(item.priceInCents),
      compareAtPrice: item.compareAtPrice != null ? Number(item.compareAtPrice) : null,
    }));

    return {
      items: mappedItems,
      data: mappedItems,
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

    return {
      ...product,
      price: Number(product.priceInCents),
      compareAtPrice: product.compareAtPrice != null ? Number(product.compareAtPrice) : null,
    };
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: { category: true },
    });

    if (!product) {
      throw new ProductNotFoundException(slug);
    }

    return {
      ...product,
      price: Number(product.priceInCents),
      compareAtPrice: product.compareAtPrice != null ? Number(product.compareAtPrice) : null,
    };
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    await this.findOne(id);

    try {
      const { price, compareAtPrice, categoryId, name, ...rest } =
        updateProductDto;

      const slug = name ? await this.uniqueSlug(name, id) : undefined;

      const product = await this.prisma.product.update({
        where: { id },
        data: {
          ...rest,
          ...(name && { name, slug }),
          ...(price !== undefined && { priceInCents: price }),
          ...(compareAtPrice !== undefined ? { compareAtPrice } : {}),
          category: categoryId ? { connect: { id: categoryId } } : undefined,
        },
      });

      return {
        ...product,
        price: Number(product.priceInCents),
        compareAtPrice: product.compareAtPrice != null ? Number(product.compareAtPrice) : null,
      };
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
    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
