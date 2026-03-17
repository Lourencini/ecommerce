import {
    IsString,
    IsNotEmpty,
    IsInt,
    IsPositive,
    IsArray,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderItemDto {
    @ApiProperty({ example: 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6' })
    @IsString()
    @IsNotEmpty()
    productId: string;

    @ApiProperty({ example: 2 })
    @IsInt()
    @IsPositive()
    @Type(() => Number)
    quantity: number;
}
