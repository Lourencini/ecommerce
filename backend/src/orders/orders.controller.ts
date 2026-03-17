import { Controller, Get, Post, Body, Patch, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Criar um novo pedido (Consome Cotação + Estoque)' })
    @ApiResponse({ status: 201, description: 'Pedido criado com sucesso.' })
    @ApiResponse({ status: 409, description: 'Estoque insuficiente (RFC 7807).' })
    create(@Body() createOrderDto: CreateOrderDto) {
        return this.ordersService.create(createOrderDto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar todos os pedidos' })
    findAll() {
        return this.ordersService.findAll();
    }

    @Get('metrics/cycle-time')
    @ApiOperation({ summary: 'Obter média de tempo de ciclo (Pedido -> Envio)' })
    getMetrics() {
        return this.ordersService.getCycleTimeMetrics();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Buscar pedido por ID (UUID) com histórico e itens' })
    findOne(@Param('id') id: string) {
        return this.ordersService.findOne(id);
    }

    @Patch(':id/status')
    @ApiOperation({ summary: 'Atualizar status do pedido (Máquina de Estados)' })
    @ApiResponse({ status: 200, description: 'Status atualizado com sucesso.' })
    @ApiResponse({ status: 422, description: 'Transição de status inválida (RFC 7807).' })
    updateStatus(
        @Param('id') id: string,
        @Body() dto: UpdateOrderStatusDto,
    ) {
        return this.ordersService.updateStatus(id, dto.status, dto.note);
    }
}
