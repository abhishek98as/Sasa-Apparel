'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatNumber, formatCurrency } from '@/lib/utils';
import { AlertTriangle, CheckCircle, Package } from 'lucide-react';

interface StockCardProps {
  item: {
    _id: string;
    itemCode: string;
    itemName: string;
    category: string;
    unit: string;
    currentStock: number;
    reorderLevel: number;
    weightedAverageCost: number;
    totalValue: number;
  };
  onViewDetails?: (itemId: string) => void;
  onAddStock?: (itemId: string) => void;
}

export function StockCard({ item, onViewDetails, onAddStock }: StockCardProps) {
  const stockStatus = item.currentStock <= item.reorderLevel ? 'low' : 'normal';
  const stockPercentage = item.reorderLevel > 0 
    ? Math.min((item.currentStock / item.reorderLevel) * 100, 100)
    : 100;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-surface-900 dark:text-surface-50">
                {item.itemName}
              </p>
              {stockStatus === 'low' && (
                <AlertTriangle className="w-4 h-4 text-orange-500" />
              )}
              {stockStatus === 'normal' && item.currentStock > item.reorderLevel * 2 && (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
            </div>
            <p className="text-sm text-surface-500">{item.itemCode}</p>
          </div>
          <Badge variant={item.category === 'fabric' ? 'info' : 'neutral'}>
            {item.category}
          </Badge>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-surface-600 dark:text-surface-400">Current Stock</span>
            <span className={`font-semibold ${stockStatus === 'low' ? 'text-orange-600' : 'text-surface-900 dark:text-surface-50'}`}>
              {formatNumber(item.currentStock)} {item.unit}
            </span>
          </div>

          {/* Stock level indicator */}
          <div className="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                stockStatus === 'low' 
                  ? 'bg-orange-500' 
                  : 'bg-green-500'
              }`}
              style={{ width: `${stockPercentage}%` }}
            />
          </div>

          <div className="flex justify-between text-xs text-surface-500">
            <span>Reorder: {formatNumber(item.reorderLevel)}</span>
            <span>{stockStatus === 'low' ? 'Low Stock' : 'Normal'}</span>
          </div>
        </div>

        <div className="space-y-1 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-surface-600 dark:text-surface-400">WAC</span>
            <span className="font-medium">{formatCurrency(item.weightedAverageCost)}/{item.unit}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-surface-600 dark:text-surface-400">Total Value</span>
            <span className="font-semibold text-primary-600">{formatCurrency(item.totalValue)}</span>
          </div>
        </div>

        <div className="flex gap-2">
          {onViewDetails && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onViewDetails(item._id)}
              className="flex-1"
            >
              Details
            </Button>
          )}
          {onAddStock && (
            <Button
              size="sm"
              onClick={() => onAddStock(item._id)}
              className="flex-1"
            >
              <Package className="w-4 h-4 mr-1" />
              Add Stock
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

