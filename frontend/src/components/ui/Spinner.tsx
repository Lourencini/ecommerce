interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <span
      className={`spinner spinner-${size} ${className}`}
      role="status"
      aria-label="Carregando..."
    />
  );
}

export function PageSpinner() {
  return (
    <div className="page-spinner">
      <Spinner size="lg" />
      <p className="text-muted">Carregando...</p>
    </div>
  );
}
