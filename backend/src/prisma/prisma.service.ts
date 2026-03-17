import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);

    async onModuleInit() {
        await this.$connect();
        this.logger.log('✅ Conectado ao banco de dados');
    }

    async onModuleDestroy() {
        await this.$disconnect();
        this.logger.log('Desconectado do banco de dados');
    }

    /**
     * Limpa o banco para testes de integração (apenas em test env)
     */
    async cleanDatabase() {
        if (process.env.NODE_ENV !== 'test') {
            throw new Error('cleanDatabase() só pode ser usado em ambiente de teste');
        }
        const tableNames = [
            'shipping_quotes',
            'order_status_history',
            'order_items',
            'orders',
            'addresses',
            'customers',
            'products',
            'categories',
        ];
        for (const tableName of tableNames) {
            await this.$executeRawUnsafe(`TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE;`);
        }
    }
}
