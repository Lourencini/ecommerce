import {
  IsInt,
  IsPositive,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateOrderItemDto } from './create-order-item.dto';

export class CreateOrderDto {
  // customerId agora vem do JWT — não precisa mais ser enviado no body
  // Mantemos apenas como opcional para compatibilidade com admin criar pedido manual

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
