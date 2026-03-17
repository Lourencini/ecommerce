import {
    IsString,
    IsNotEmpty,
    Matches,
    IsNumber,
    IsPositive,
    IsInt,
    Min,
    IsArray,
    ValidateNested,
    ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ShippingProductItemDto {
    @ApiProperty({ description: 'ID ou SKU do produto para rastreabilidade', example: 'PROD-123' })
    @IsString()
    @IsNotEmpty()
    productId: string;

    @ApiProperty({ example: 2, description: 'Quantidade do produto na caixa' })
    @IsInt()
    @Min(1)
    @Type(() => Number)
    quantity: number;

    @ApiProperty({ example: 450, description: 'Peso individual em gramas' })
    @IsInt()
    @Min(1)
    @Type(() => Number)
    weightGrams: number;

    @ApiProperty({ example: 15.0 })
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsPositive()
    @Type(() => Number)
    lengthCm: number;

    @ApiProperty({ example: 10.0 })
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsPositive()
    @Type(() => Number)
    widthCm: number;

    @ApiProperty({ example: 5.0 })
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsPositive()
    @Type(() => Number)
    heightCm: number;
}


export class CalculateShippingDto {
    @ApiProperty({ example: '01310100', description: 'CEP de destino (8 dígitos, só números)' })
    @IsString()
    @IsNotEmpty()
    // Validação rigorosa do formato do CEP brasileiro
    @Matches(/^[0-9]{8}$/, { message: 'zipCodeDest deve conter exatamente 8 números.' })
    zipCodeDest: string;

    @ApiProperty({ type: [ShippingProductItemDto] })
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => ShippingProductItemDto)
    products: ShippingProductItemDto[];
}
