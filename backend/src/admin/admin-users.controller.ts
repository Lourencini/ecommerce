import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  ParseBoolPipe,
  Optional,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminUsersService } from './admin-users.service';
import { CreateUserAdminDto } from './dto/create-user-admin.dto';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';

@ApiTags('admin/users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly service: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar usuários (admin)' })
  @ApiQuery({ name: 'page',     required: false })
  @ApiQuery({ name: 'limit',    required: false })
  @ApiQuery({ name: 'search',   required: false })
  @ApiQuery({ name: 'role',     required: false, enum: UserRole })
  @ApiQuery({ name: 'isActive', required: false })
  findAll(
    @Query('page',  new DefaultValuePipe(1),  ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('role')   role?: UserRole,
    @Query('isActive') isActive?: string,
  ) {
    const isActiveFilter =
      isActive === 'true'  ? true :
      isActive === 'false' ? false :
      undefined;

    return this.service.findAll({ page, limit, search, role, isActive: isActiveFilter });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do usuário (admin)' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar usuário (admin)' })
  create(@Body() dto: CreateUserAdminDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar usuário (admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateUserAdminDto) {
    return this.service.update(id, dto);
  }
}
