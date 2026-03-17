import {
    IsOptional,
    IsBoolean,
    IsString,
    IsInt,
    IsPositive,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class ProductQueryDto {
    @ApiPropertyOptional({ description: 'Filtrar por categoria', example: 1 })
    @IsOptional()
    @IsInt()
    @IsPositive()
    @Type(() => Number)
    categoryId?: number;

    @ApiPropertyOptional({ description: 'Busca por nome ou SKU' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({ default: false })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    isFeatured?: boolean;

    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @IsInt()
    @IsPositive()
    @Type(() => Number)
    page?: number = 1;

    @ApiPropertyOptional({ default: 20 })
    @IsOptional()
    @IsInt()
    @IsPositive()
    @Type(() => Number)
    limit?: number = 20;
}
