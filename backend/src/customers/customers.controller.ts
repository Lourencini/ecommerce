import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';

@ApiTags('customers')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  private requireCustomer(user: CurrentUserData): string {
    if (!user.customerId) {
      throw new ForbiddenException('Este usuário não possui perfil de cliente.');
    }
    return user.customerId;
  }

  @Get('me')
  @ApiOperation({ summary: 'Dados do cliente logado' })
  getMe(@CurrentUser() user: CurrentUserData) {
    return this.customersService.getMe(this.requireCustomer(user));
  }

  @Patch('me')
  @ApiOperation({ summary: 'Atualizar nome e telefone do cliente logado' })
  updateMe(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.updateMe(this.requireCustomer(user), dto);
  }

  @Get('me/orders')
  @ApiOperation({ summary: 'Pedidos do cliente logado' })
  getMyOrders(@CurrentUser() user: CurrentUserData) {
    return this.customersService.getMyOrders(this.requireCustomer(user));
  }

  @Get('me/addresses')
  @ApiOperation({ summary: 'Endereços do cliente logado' })
  getAddresses(@CurrentUser() user: CurrentUserData) {
    return this.customersService.getAddresses(this.requireCustomer(user));
  }

  @Post('me/addresses')
  @ApiOperation({ summary: 'Cadastrar endereço' })
  addAddress(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateAddressDto,
  ) {
    return this.customersService.addAddress(this.requireCustomer(user), dto);
  }

  @Patch('me/addresses/:id/default')
  @ApiOperation({ summary: 'Definir endereço padrão' })
  setDefault(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.customersService.setDefaultAddress(this.requireCustomer(user), id);
  }

  @Delete('me/addresses/:id')
  @ApiOperation({ summary: 'Excluir endereço' })
  deleteAddress(
    @CurrentUser() user: CurrentUserData,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.customersService.deleteAddress(this.requireCustomer(user), id);
  }
}
