import { Controller, Get, Patch, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminSettingsService } from './admin-settings.service';

@ApiTags('admin-settings')
@Controller('admin/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth('access-token')
export class AdminSettingsController {
  constructor(private readonly settingsService: AdminSettingsService) {}

  @Get('payments')
  @ApiOperation({ summary: '[ADMIN] Retorna configuração do Mercado Pago (mascarada)' })
  getPayments() {
    return this.settingsService.getPaymentsConfig();
  }

  @Patch('payments')
  @ApiOperation({ summary: '[ADMIN] Atualiza Access Token e/ou Webhook Secret do Mercado Pago' })
  updatePayments(
    @Body() body: { accessToken?: string; webhookSecret?: string },
  ) {
    return this.settingsService.updatePaymentsConfig(body);
  }

  @Post('payments/test')
  @ApiOperation({ summary: '[ADMIN] Testa a conexão com o Mercado Pago' })
  testConnection() {
    return this.settingsService.testConnection();
  }
}
