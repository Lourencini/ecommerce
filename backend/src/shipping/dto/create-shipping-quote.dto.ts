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

export class CreateShippingQuoteDto {
    @ApiProperty({ example: '01310100' })
    @IsString()
    @IsNotEmpty()
    @Matches(/^[0-9]{8}$/)
    zipCodeDest: string;

    @ApiProperty()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    weightGrams: number;

    @ApiProperty()
    @IsNumber()
    @IsPositive()
    @Type(() => Number)
    lengthCm: number;

    @ApiProperty()
    @IsNumber()
    @IsPositive()
    @Type(() => Number)
    widthCm: number;

    @ApiProperty()
    @IsNumber()
    @IsPositive()
    @Type(() => Number)
    heightCm: number;

    @ApiProperty({ example: 25.5 })
    @IsNumber({ maxDecimalPlaces: 4 })
    @IsPositive()
    @Type(() => Number)
    price: number;

    @ApiProperty({ example: 5 })
    @IsInt()
    @Min(1)
    @Type(() => Number)
    deadlineDays: number;

    @ApiProperty({ example: 'SEDEX' })
    @IsString()
    @IsNotEmpty()
    serviceName: string;

    @ApiProperty({ example: 'Correios' })
    @IsString()
    @IsNotEmpty()
    carrier: string;
}
