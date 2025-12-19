import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  className?: string;
  onClick?: () => void;
}

export function Badge({ children, variant = 'neutral', className, onClick }: BadgeProps) {
  const variants = {
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    info: 'badge-info',
    neutral: 'badge-neutral',
  };

  return (
    <span 
      className={cn(variants[variant], className)} 
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      {children}
    </span>
  );
}

