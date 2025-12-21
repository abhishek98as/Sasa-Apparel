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
    <div className={cn('stat-card group', className)}>
      {/* Decorative background element */}
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-gradient-to-br from-primary-50 to-primary-100/50 dark:from-primary-900/20 dark:to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out group-hover:scale-110" />

      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="stat-label font-medium mb-1">{title}</p>
          <p className="stat-value text-3xl tracking-tight">{value}</p>
          {change && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={cn(
                  'text-xs font-semibold px-1.5 py-0.5 rounded',
                  change.type === 'increase'
                    ? 'text-green-700 bg-green-50 dark:bg-green-900/30 dark:text-green-400'
                    : 'text-red-700 bg-red-50 dark:bg-red-900/30 dark:text-red-400'
                )}
              >
                {change.type === 'increase' ? '+' : '-'}
                {Math.abs(change.value)}%
              </span>
              <span className="text-xs text-surface-400">vs last month</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-700 text-surface-500 dark:text-surface-400 group-hover:bg-primary-600 group-hover:text-white group-hover:shadow-md transition-all duration-300">
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}

