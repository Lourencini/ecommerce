import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
    @ApiProperty({ enum: OrderStatus, example: OrderStatus.SHIPPED })
    @IsEnum(OrderStatus, { message: 'Status de pedido inválido.' })
    status: OrderStatus;

    @ApiPropertyOptional({ example: 'Pedido postado nos Correios.' })
    @IsOptional()
    @IsString()
    note?: string;
}
