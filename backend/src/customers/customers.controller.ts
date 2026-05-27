import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';

@ApiTags('customers')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Dados do cliente logado' })
  getMe(@CurrentUser() user: CurrentUserData) {
    return this.customersService.getMe(user.customerId!);
  }

  @Get('me/orders')
  @ApiOperation({ summary: 'Pedidos do cliente logado' })
  getMyOrders(@CurrentUser() user: CurrentUserData) {
    return this.customersService.getMyOrders(user.customerId!);
  }

  @Get('me/addresses')
  @ApiOperation({ summary: 'Endereços do cliente logado' })
  getAddresses(@CurrentUser() user: CurrentUserData) {
    return this.customersService.getAddresses(user.customerId!);
  }

  @Post('me/addresses')
  @ApiOperation({ summary: 'Cadastrar endereço' })
  addAddress(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateAddressDto,
  ) {
    return this.customersService.addAddress(user.customerId!, dto);
  }

  @Patch('me/addresses/:id/default')
  @ApiOperation({ summary: 'Definir endereço padrão' })
  setDefault(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.customersService.setDefaultAddress(user.customerId!, id);
  }
}
