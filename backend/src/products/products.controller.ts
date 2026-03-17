import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    UsePipes,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { XssSanitizePipe } from '../common/pipes/xss-sanitize.pipe';

@ApiTags('products')
@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    @Post()
    @ApiOperation({ summary: 'Criar um novo produto' })
    @ApiResponse({ status: 201, description: 'Produto criado com sucesso.' })
    @UsePipes(new XssSanitizePipe()) // Sanitiza descrição contra XSS
    create(@Body() createProductDto: CreateProductDto) {
        return this.productsService.create(createProductDto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar produtos com paginação e filtros' })
    findAll(@Query() query: ProductQueryDto) {
        return this.productsService.findAll(query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Buscar produto por ID (UUID)' })
    findOne(@Param('id') id: string) {
        return this.productsService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Atualizar dados de um produto' })
    @UsePipes(new XssSanitizePipe()) // Sanitização XSS no update também
    update(
        @Param('id') id: string,
        @Body() updateProductDto: UpdateProductDto,
    ) {
        return this.productsService.update(id, updateProductDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Inativar (soft-delete) um produto' })
    remove(@Param('id') id: string) {
        return this.productsService.remove(id);
    }
}
