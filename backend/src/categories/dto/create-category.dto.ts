import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
    @ApiProperty({ example: 'Miniaturas' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name: string;

    @ApiPropertyOptional({ example: 'Miniaturas para RPG e Wargame' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ example: 'https://cdn.example.com/cat.jpg' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    imageUrl?: string;

    @ApiPropertyOptional({ example: '🎲' })
    @IsOptional()
    @IsString()
    @MaxLength(10)
    icon?: string;
}
