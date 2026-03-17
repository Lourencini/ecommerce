import {
    IsString,
    IsNotEmpty,
    IsInt,
    IsPositive,
    IsArray,
    ValidateNested,
    ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateOrderItemDto } from './create-order-item.dto';

export class CreateOrderDto {
    @ApiProperty({ example: 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6', description: 'ID do cliente UUID' })
    @IsString()
    @IsNotEmpty()
    customerId: string;

    @ApiProperty({ example: 1, description: 'ID da cotação de frete (ShippingQuote)' })
    @IsInt()
    @IsPositive()
    @Type(() => Number)
    shippingQuoteId: number;

    @ApiProperty({ type: [CreateOrderItemDto] })
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => CreateOrderItemDto)
    items: CreateOrderItemDto[];
}
