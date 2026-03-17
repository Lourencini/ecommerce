import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { CalculateShippingDto } from './dto/calculate-shipping.dto';
import { CreateShippingQuoteDto } from './dto/create-shipping-quote.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('shipping')
@Controller('shipping')
export class ShippingController {
    constructor(private readonly shippingService: ShippingService) { }

    @Post('calculate')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Calcular frete para um destino' })
    @ApiResponse({ status: 200, description: 'Opções de frete retornadas.' })
    @ApiResponse({ status: 422, description: 'CEP inválido (RFC 7807).' })
    @ApiResponse({ status: 502, description: 'Erro na transportadora.' })
    calculate(@Body() calculateShippingDto: CalculateShippingDto) {
        return this.shippingService.calculate(calculateShippingDto);
    }

    @Post('quote')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Salvar uma cotação selecionada' })
    saveQuote(@Body() createShippingQuoteDto: CreateShippingQuoteDto) {
        return this.shippingService.saveQuote(createShippingQuoteDto);
    }
}
