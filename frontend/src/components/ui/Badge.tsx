import type { OrderStatus } from '@/types';

type BadgeVariant = 'default' | 'stock' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClass: Record<BadgeVariant, string> = {
  default: 'badge',
  stock: 'badge badge-stock',
  success: 'badge badge-success',
  warning: 'badge badge-warning',
  danger: 'badge badge-danger',
  info: 'badge badge-info',
  neutral: 'badge badge-neutral',
};

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span className={`${variantClass[variant]} ${className}`}>
      {children}
    </span>
  );
}

// Converte OrderStatus para variante de badge
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const map: Record<OrderStatus, { label: string; variant: BadgeVariant }> = {
    PENDING: { label: 'Pendente', variant: 'warning' },
    CONFIRMED: { label: 'Confirmado', variant: 'info' },
    PRINTING: { label: 'Em Impressão', variant: 'info' },
    READY: { label: 'Pronto', variant: 'success' },
    SHIPPED: { label: 'Enviado', variant: 'success' },
    DELIVERED: { label: 'Entregue', variant: 'success' },
    CANCELLED: { label: 'Cancelado', variant: 'danger' },
    REFUNDED: { label: 'Reembolsado', variant: 'neutral' },
  };

  const { label, variant } = map[status] ?? { label: status, variant: 'default' };
  return <Badge variant={variant}>{label}</Badge>;
}
