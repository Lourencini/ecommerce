import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-preference')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Gerar preferência de pagamento no MercadoPago' })
  createPreference(@Body('orderId') orderId: string) {
    return this.paymentsService.createPreference(orderId);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook de notificações do MercadoPago (IPN)' })
  handleWebhook(
    @Body() body: any,
    @Headers('x-signature') signature?: string,
  ) {
    return this.paymentsService.handleWebhook(body, signature);
  }
}
