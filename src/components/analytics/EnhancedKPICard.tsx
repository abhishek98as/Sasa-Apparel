"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface KPICardProps {
  id: string;
  label: string;
  value: number | string;
  unit?: string;
  trend?: number;
  trendDirection?: 'up' | 'down' | 'neutral';
  sparkline?: number[];
  tooltip?: string;
  isCurrency?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

export function EnhancedKPICard({
  id,
  label,
  value,
  unit,
  trend,
  trendDirection,
  sparkline,
  tooltip,
  isCurrency,
  loading,
  onClick
}: KPICardProps) {
  const formattedValue = isCurrency
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: unit || 'INR', maximumFractionDigits: 0 }).format(Number(value))
    : typeof value === 'number'
    ? new Intl.NumberFormat('en-IN').format(value)
    : value;

  const getTrendIcon = () => {
    if (!trendDirection || trendDirection === 'neutral') return <Minus className="h-4 w-4" />;
    if (trendDirection === 'up') return <TrendingUp className="h-4 w-4" />;
    return <TrendingDown className="h-4 w-4" />;
  };

  const getTrendColor = () => {
    if (!trendDirection || trendDirection === 'neutral') return 'text-muted-foreground';
    if (trendDirection === 'up') return 'text-green-600';
    return 'text-red-600';
  };

  return (
    <div onClick={onClick} className={onClick ? "cursor-pointer" : ""}>
      <Card className="transition-all hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {label}
          </CardTitle>
          {trend !== undefined && (
            <div className={cn("flex items-center gap-1 text-xs font-medium", getTrendColor())}>
              {getTrendIcon()}
              <span>{Math.abs(trend).toFixed(1)}%</span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
              <div className="h-3 w-16 bg-muted animate-pulse rounded" />
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold">{formattedValue}</div>
              {!isCurrency && unit && (
                <p className="text-xs text-muted-foreground mt-1">{unit}</p>
              )}
              {tooltip && (
                <p className="text-xs text-muted-foreground mt-1">{tooltip}</p>
              )}
              {sparkline && sparkline.length > 0 && (
                <div className="mt-3">
                  <MiniSparkline data={sparkline} />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MiniSparkline({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg className="w-full h-8" viewBox="0 0 100 100" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        points={points}
        className="text-primary"
      />
    </svg>
  );
}
