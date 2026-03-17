import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // ── Headers de Segurança (Helmet) ──────────────────────
    app.use(helmet());

    // ── Prefixo global da API ───────────────────────────────
    app.setGlobalPrefix('api/v1');

    // ── Validação global com class-validator ────────────────
    // whitelist: remove campos não declarados no DTO
    // forbidNonWhitelisted: lança erro se campo não esperado
    // transform: converte automaticamente os tipos
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }),
    );

    // ── CORS ────────────────────────────────────────────────
    app.enableCors({
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    });

    // ── Swagger (OpenAPI) ───────────────────────────────────
    const config = new DocumentBuilder()
        .setTitle('E-commerce 3D Print — API')
        .setDescription('API do sistema de e-commerce para impressão 3D')
        .setVersion('1.0')
        .setContact('E-3D Print Team', 'https://e3dprint.com', 'engineering@e3dprint.com')
        .addTag('products', 'Gerenciamento de produtos')
        .addTag('orders', 'Gerenciamento de pedidos')
        .addTag('shipping', 'Cálculo e cotação de frete')
        .addTag('customers', 'Gerenciamento de clientes')
        .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    const port = process.env.PORT || 3001;
    await app.listen(port);

    console.log(`🚀 Backend rodando em: http://localhost:${port}/api/v1`);
    console.log(`📖 Swagger em: http://localhost:${port}/api/docs`);
}

bootstrap();
