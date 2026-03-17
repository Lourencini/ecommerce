import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

/**
 * Todos os campos do CreateProductDto são opcionais no update.
 * PartialType do @nestjs/swagger preserva os decorators do Swagger.
 */
export class UpdateProductDto extends PartialType(CreateProductDto) { }
