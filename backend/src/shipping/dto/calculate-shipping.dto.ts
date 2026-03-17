import {
    IsString,
    IsNotEmpty,
    Matches,
    IsNumber,
    IsPositive,
    IsInt,
    Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CalculateShippingDto {
    @ApiProperty({ example: '01310100', description: 'CEP de destino (8 dígitos, só números)' })
    @IsString()
    @IsNotEmpty()
    // Validação rigorosa do formato do CEP brasileiro
    @Matches(/^[0-9]{8}$/, { message: 'zipCodeDest deve conter exatamente 8 números.' })
    zipCodeDest: string;

    @ApiProperty({ example: 450, description: 'Peso total em gramas' })
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
