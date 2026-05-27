import { PrismaClient, OrderStatus, UserRole } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // ── Usuário Admin ────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin@123', 12);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@e3dprint.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@e3dprint.com',
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
    },
  });

  console.log('✅ Admin criado — email: admin@e3dprint.com  senha: Admin@123');

  // ── Usuário Cliente de Teste ─────────────────────────────────
  const customerPassword = await bcrypt.hash('Cliente@123', 12);
  const customerUser = await prisma.user.upsert({
    where: { email: 'cliente@e3dprint.com' },
    update: {},
    create: {
      name: 'João da Silva',
      email: 'cliente@e3dprint.com',
      passwordHash: customerPassword,
      role: UserRole.CUSTOMER,
    },
  });

  // ── Categorias ───────────────────────────────────────────────
  const categoryMiniatures = await prisma.category.upsert({
    where: { slug: 'miniaturas' },
    update: {},
    create: {
      name: 'Miniaturas',
      slug: 'miniaturas',
      description: 'Miniaturas para RPG, Wargame e coleção',
      isActive: true,
    },
  });

  const categoryFunctional = await prisma.category.upsert({
    where: { slug: 'pecas-funcionais' },
    update: {},
    create: {
      name: 'Peças Funcionais',
      slug: 'pecas-funcionais',
      description: 'Peças de reposição e componentes funcionais',
      isActive: true,
    },
  });

  const categoryDecoration = await prisma.category.upsert({
    where: { slug: 'decoracao' },
    update: {},
    create: {
      name: 'Decoração',
      slug: 'decoracao',
      description: 'Objetos decorativos e arte impressa em 3D',
      isActive: true,
    },
  });

  console.log('✅ Categorias criadas');

  // ── Produtos ─────────────────────────────────────────────────
  const product1 = await prisma.product.upsert({
    where: { sku: 'MIN-DRG-001' },
    update: {},
    create: {
      sku: 'MIN-DRG-001',
      name: 'Dragão Ancião — Miniatura RPG',
      slug: 'dragao-anciao-miniatura-rpg',
      description:
        'Impressão em resina de alta resolução. Ideal para D&D e Pathfinder. ' +
        'Camada de 0.05mm.',
      priceInCents: new Decimal('89.9000'),
      compareAtPrice: new Decimal('120.0000'),
      weightGrams: 45,
      lengthCm: new Decimal('12.00'),
      widthCm: new Decimal('8.00'),
      heightCm: new Decimal('15.00'),
      stockQuantity: 10,
      isActive: true,
      isFeatured: true,
      filamentType: 'Resina',
      filamentColor: 'Cinza',
      printHours: new Decimal('6.50'),
      imageUrls: [],
      categoryId: categoryMiniatures.id,
    },
  });

  const product2 = await prisma.product.upsert({
    where: { sku: 'FUN-SUA-001' },
    update: {},
    create: {
      sku: 'FUN-SUA-001',
      name: 'Suporte Articulado para Monitor',
      slug: 'suporte-articulado-monitor',
      description:
        'Suporte impresso em PLA+ reforçado. Suporta até 5kg. ' +
        'Compatível com VESA 75x75mm e 100x100mm.',
      priceInCents: new Decimal('45.0000'),
      weightGrams: 180,
      lengthCm: new Decimal('15.00'),
      widthCm: new Decimal('10.00'),
      heightCm: new Decimal('5.00'),
      stockQuantity: 25,
      isActive: true,
      isFeatured: false,
      filamentType: 'PLA+',
      filamentColor: 'Preto',
      printHours: new Decimal('4.20'),
      imageUrls: [],
      categoryId: categoryFunctional.id,
    },
  });

  const product3 = await prisma.product.upsert({
    where: { sku: 'DEC-VAS-001' },
    update: {},
    create: {
      sku: 'DEC-VAS-001',
      name: 'Vaso Geométrico — Série Mínima',
      slug: 'vaso-geometrico-serie-minima',
      description:
        'Design geométrico moderno. Impresso em PLA silk. ' +
        'Indicado para plantas pequenas ou como objeto decorativo.',
      priceInCents: new Decimal('32.5000'),
      weightGrams: 120,
      lengthCm: new Decimal('12.00'),
      widthCm: new Decimal('12.00'),
      heightCm: new Decimal('18.00'),
      stockQuantity: 50,
      isActive: true,
      isFeatured: true,
      filamentType: 'PLA Silk',
      filamentColor: 'Dourado',
      printHours: new Decimal('3.80'),
      imageUrls: [],
      categoryId: categoryDecoration.id,
    },
  });

  console.log('✅ Produtos criados');

  // ── Cliente vinculado ao User ─────────────────────────────────
  const customer = await prisma.customer.upsert({
    where: { email: 'cliente@e3dprint.com' },
    update: { userId: customerUser.id },
    create: {
      userId: customerUser.id,
      name: 'João da Silva',
      email: 'cliente@e3dprint.com',
      phone: '11999990000',
      addresses: {
        create: {
          label: 'Casa',
          street: 'Rua das Flores',
          number: '123',
          complement: 'Apto 45',
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310100',
          isDefault: true,
        },
      },
    },
    include: { addresses: true },
  });

  console.log('✅ Cliente de teste criado — email: cliente@e3dprint.com  senha: Cliente@123');

  // ── Pedido de Teste ───────────────────────────────────────────
  const address = customer.addresses[0];
  const existingOrder = await prisma.order.findUnique({
    where: { orderNumber: '#2026-00001' },
  });

  if (!existingOrder) {
    const order = await prisma.order.create({
      data: {
        orderNumber: '#2026-00001',
        customerId: customer.id,
        addressId: address.id,
        status: OrderStatus.CONFIRMED,
        paymentStatus: 'PAID',
        totalProducts: new Decimal('121.9000'),
        totalShipping: new Decimal('18.5000'),
        discount: new Decimal('0.0000'),
        total: new Decimal('140.4000'),
        shippingService: 'Correios PAC',
        items: {
          create: [
            {
              productId: product1.id,
              quantity: 1,
              unitPrice: new Decimal('89.9000'),
              totalPrice: new Decimal('89.9000'),
              productName: product1.name,
              productSku: product1.sku,
            },
            {
              productId: product3.id,
              quantity: 1,
              unitPrice: new Decimal('32.0000'),
              totalPrice: new Decimal('32.0000'),
              productName: product3.name,
              productSku: product3.sku,
            },
          ],
        },
        statusHistory: {
          create: [
            { toStatus: OrderStatus.PENDING, note: 'Pedido criado.' },
            {
              fromStatus: OrderStatus.PENDING,
              toStatus: OrderStatus.CONFIRMED,
              note: 'Pagamento confirmado via Pix.',
            },
          ],
        },
      },
    });
    console.log('✅ Pedido de teste criado:', order.orderNumber);
  } else {
    console.log('🟡 Pedido de teste já existe, pulando...');
  }

  console.log('\n🎉 Seed concluído!');
  console.log('─────────────────────────────────────────');
  console.log('👤 Admin:   admin@e3dprint.com   | Admin@123');
  console.log('👤 Cliente: cliente@e3dprint.com | Cliente@123');
  console.log('─────────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
