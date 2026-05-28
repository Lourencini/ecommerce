import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import slugify from 'slugify';

@Injectable()
export class CategoriesService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.category.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
            include: {
                _count: { select: { products: true } },
            },
        });
    }

    async findAllAdmin() {
        return this.prisma.category.findMany({
            orderBy: { name: 'asc' },
            include: {
                _count: { select: { products: true } },
            },
        });
    }

    async create(dto: CreateCategoryDto) {
        const slug = slugify(dto.name, { lower: true, strict: true });
        const exists = await this.prisma.category.findUnique({ where: { slug } });
        if (exists) throw new ConflictException(`Categoria com slug "${slug}" já existe`);

        return this.prisma.category.create({
            data: {
                name: dto.name,
                slug,
                description: dto.description,
                imageUrl: dto.imageUrl,
                icon: dto.icon,
            },
        });
    }

    async update(id: number, dto: UpdateCategoryDto) {
        const category = await this.prisma.category.findUnique({ where: { id } });
        if (!category) throw new NotFoundException('Categoria não encontrada');

        const data: any = { ...dto };
        if (dto.name) {
            data.slug = slugify(dto.name, { lower: true, strict: true });
        }

        return this.prisma.category.update({ where: { id }, data });
    }

    async remove(id: number) {
        const category = await this.prisma.category.findUnique({
            where: { id },
            include: { _count: { select: { products: true } } },
        });
        if (!category) throw new NotFoundException('Categoria não encontrada');
        if ((category as any)._count.products > 0) {
            // Soft-delete: only deactivate if products are linked
            return this.prisma.category.update({ where: { id }, data: { isActive: false } });
        }
        return this.prisma.category.delete({ where: { id } });
    }
}
