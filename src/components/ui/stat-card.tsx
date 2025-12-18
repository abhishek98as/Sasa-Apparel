import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  className?: string;
}

export function StatCard({ title, value, icon: Icon, change, className }: StatCardProps) {
  return (
    <div className={cn('stat-card', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="stat-label">{title}</p>
          <p className="stat-value">{value}</p>
          {change && (
            <p
              className={cn(
                'stat-change',
                change.type === 'increase' ? 'text-accent-600' : 'text-red-600'
              )}
            >
              {change.type === 'increase' ? '+' : '-'}
              {Math.abs(change.value)}%
            </p>
          )}
        </div>
        {Icon && (
          <div className="p-2.5 bg-primary-50 rounded-lg">
            <Icon className="w-5 h-5 text-primary-600" />
          </div>
        )}
      </div>
    </div>
  );
}

