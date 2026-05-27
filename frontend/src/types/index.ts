// ============================================================
// Tipos globais do E-commerce 3D Print
// ============================================================

// --- Enums ---

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PRINTING'
  | 'READY'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export type UserRole = 'ADMIN' | 'CUSTOMER';

// --- Categoria ---

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
}

// --- Produto ---

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  stockQuantity: number;
  isActive: boolean;
  isFeatured: boolean;
  material?: string;
  filamentType?: string;
  filamentColor?: string;
  printHours?: number;
  imageUrls: string[];
  categoryId?: number;
  category?: Category;
  createdAt: string;
  updatedAt: string;
}

// --- Usuário / Auth ---

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
}

// --- Cliente ---

export interface Address {
  id: number;
  label?: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  document?: string;
  addresses: Address[];
}

// --- Frete ---

export interface ShippingOption {
  carrier: string;
  serviceName: string;
  price: number;
  deadlineDays: number;
}

export interface ShippingQuote {
  id: number;
  carrier: string;
  serviceName: string;
  price: number;
  deadline: number;
  expiresAt: string;
}

// --- Carrinho ---

export interface CartItem {
  productId: string;
  sku: string;
  name: string;
  price: number;
  quantity: number;
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  imageUrl: string;
}

// --- Pedido ---

export interface OrderItem {
  id: number;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderStatusHistory {
  id: number;
  fromStatus?: OrderStatus;
  toStatus: OrderStatus;
  note?: string;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customer?: Customer;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  totalProducts: number;
  totalShipping: number;
  discount: number;
  total: number;
  shippingService?: string;
  trackingCode?: string;
  orderedAt: string;
  printingStartedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  items: OrderItem[];
  statusHistory: OrderStatusHistory[];
  createdAt: string;
}

// --- Paginação ---

export interface PaginatedResponse<T> {
  data: T[];
  items: T[];
  meta: {
    total: number;
    page: number;
    lastPage: number;
  };
}

// --- API Genérico ---

export interface ApiError {
  statusCode: number;
  message: string;
  detail?: string;
}
