import { CreateProductDto } from '../../products/dto/create-product.dto';

/**
 * ProductBuilder
 * Padroniza a criação de massas de dados para testes End-to-End (E2E) ou Unitários.
 * Facilita a variação paramétrica sem expor o formato hardcoded do objeto em múltiplos scripts.
 */
export class ProductBuilder {
    private product: CreateProductDto;

    constructor() {
        this.product = {
            name: 'Vaso Abstrato 3D Premium',
            description: 'Vaso impresso em alta resolução (0.1mm) ideal para suculentas.',
            sku: `VS-PREMIUM-${Math.floor(Math.random() * 10000)}`,
            price: 149.90, // Decimal compatibility
            compareAtPrice: 199.90,
            stockQuantity: 10,
            categoryId: 1, // uuid filler
            lengthCm: 15,
            widthCm: 15,
            heightCm: 25,
            weightGrams: 300,
            filamentType: 'PLA Silk',
            filamentColor: 'Cobre',
            isActive: true,
            imageUrls: ['https://example.com/vaso-cobre-1.jpg'],
        };
    }

    withName(name: string): ProductBuilder {
        this.product.name = name;
        return this;
    }

    withPrice(price: number): ProductBuilder {
        this.product.price = price;
        return this;
    }

    outOfStock(): ProductBuilder {
        this.product.stockQuantity = 0;
        return this;
    }

    withVolumetricDimensions(lengthCm: number, widthCm: number, heightCm: number): ProductBuilder {
        this.product.lengthCm = lengthCm;
        this.product.widthCm = widthCm;
        this.product.heightCm = heightCm;
        return this;
    }

    build(): CreateProductDto {
        return this.product;
    }
}
