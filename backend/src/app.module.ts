import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
// Módulos do Step 2 — adicionados progressivamente
// import { ProductsModule } from './products/products.module';
// import { OrdersModule } from './orders/orders.module';
// import { ShippingModule } from './shipping/shipping.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
        PrismaModule,
        // ProductsModule,
        // OrdersModule,
        // ShippingModule,
    ],
})
export class AppModule { }
