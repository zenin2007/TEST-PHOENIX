import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'primary': return 'btn-primary';
      case 'danger': return 'btn-danger';
      case 'ghost': return 'btn-ghost';
      default: return 'btn-secondary';
    }
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '0.4rem 0.85rem', fontSize: '0.785rem' },
    md: { padding: '0.55rem 1.15rem', fontSize: '0.85rem' },
    lg: { padding: '0.75rem 1.5rem', fontSize: '0.95rem' },
  };

  return (
    <button
      className={`${getVariantClass()} ${className}`}
      style={sizeStyles[size]}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <span className="spinner-subtle" />
          <span>Loading...</span>
        </span>
      ) : (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
          {icon && <span>{icon}</span>}
          <span>{children}</span>
        </span>
      )}
    </button>
  );
};
