import {
    IsString,
    IsNotEmpty,
    IsNumber,
    IsPositive,
    IsOptional,
    IsBoolean,
    IsArray,
    IsUrl,
    MaxLength,
    Min,
    IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductDto {
    @ApiProperty({ example: 'MIN-DRG-001' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    sku: string;

    @ApiProperty({ example: 'Dragão Ancião — Miniatura RPG' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name: string;

    /**
     * Descrição sanitizada via XssSanitizePipe no controller.
     * Nunca persiste HTML ou scripts.
     */
    @ApiPropertyOptional({ example: 'Impressão em resina 0.05mm.' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({
        description: 'Preço em reais (ex: 89.90). Armazenado como Decimal(19,4).',
        example: 89.9,
    })
    @IsNumber({ maxDecimalPlaces: 4 })
    @IsPositive()
    @Type(() => Number)
    price: number;

    @ApiPropertyOptional({ example: 120.0 })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 4 })
    @IsPositive()
    @Type(() => Number)
    compareAtPrice?: number;

    @ApiProperty({ description: 'Peso em gramas', example: 45 })
    @IsInt()
    @Min(1)
    @Type(() => Number)
    weightGrams: number;

    @ApiProperty({ example: 12.0 })
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsPositive()
    @Type(() => Number)
    lengthCm: number;

    @ApiProperty({ example: 8.0 })
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsPositive()
    @Type(() => Number)
    widthCm: number;

    @ApiProperty({ example: 15.0 })
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsPositive()
    @Type(() => Number)
    heightCm: number;

    @ApiPropertyOptional({ example: 10 })
    @IsOptional()
    @IsInt()
    @Min(0)
    @Type(() => Number)
    stockQuantity?: number;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({ example: false })
    @IsOptional()
    @IsBoolean()
    isFeatured?: boolean;

    @ApiPropertyOptional({ example: 'PLA+' })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    filamentType?: string;

    @ApiPropertyOptional({ example: 'Preto' })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    filamentColor?: string;

    @ApiPropertyOptional({ example: 4.5 })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsPositive()
    @Type(() => Number)
    printHours?: number;

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    @IsUrl({}, { each: true })
    imageUrls?: string[];

    @ApiPropertyOptional({ example: 1 })
    @IsOptional()
    @IsInt()
    @IsPositive()
    @Type(() => Number)
    categoryId?: number;
}
