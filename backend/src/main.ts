import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { join, resolve } from 'path';
import * as express from 'express';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
 
    // ── Headers de Segurança (Helmet) ──────────────────────
    app.use(helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
    }));

    // ── Arquivos Estáticos (Uploads) ──────────────────────
    let uploadsPath = resolve(process.cwd(), 'uploads');
    
    // Se não existir na raiz (caso o CWD esteja em /dist ou outro lugar), tentamos um nível acima
    if (!require('fs').existsSync(uploadsPath)) {
        uploadsPath = resolve(__dirname, '..', 'uploads');
    }

    app.useStaticAssets(uploadsPath, {
        prefix: '/uploads',
    });
    console.log(`📁 Servindo arquivos estáticos de: ${uploadsPath}`);

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
        origin: (origin, callback) => {
            const allowedOrigins = [
                process.env.FRONTEND_URL || 'http://localhost:3000',
                'http://localhost:3000'
            ];
            
            // Permite local, origens do .env e qualquer subdomínio do devtunnels.ms ou loca.lt
            if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.devtunnels.ms') || origin.endsWith('.loca.lt')) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Tunnel-Skip-AntiPhishing-Scan'],
        credentials: true,
    });

    // ── Swagger (OpenAPI) ───────────────────────────────────
    const config = new DocumentBuilder()
        .setTitle('WB Maker — API')
        .setDescription('API do sistema de e-commerce WB Maker')
        .setVersion('1.0')
        .setContact('WB Maker Team', 'https://e3dprint.com', 'engineering@e3dprint.com')
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
