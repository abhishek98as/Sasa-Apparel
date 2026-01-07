'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StockCard } from '@/components/inventory/StockCard';
import { TransactionForm } from '@/components/inventory/TransactionForm';
import { PurchaseOrderForm } from '@/components/inventory/PurchaseOrderForm';
import { PageLoader } from '@/components/ui/loading';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { Package, TrendingUp, AlertTriangle, ShoppingCart } from 'lucide-react';
import Link from 'next/link';

export default function InventoryOverviewPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stockReport, setStockReport] = useState<any>(null);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [isPOFormOpen, setIsPOFormOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [reportRes, itemsRes] = await Promise.all([
        fetch('/api/inventory/stock-report'),
        fetch('/api/inventory/items?lowStock=true')
      ]);

      const [reportData, itemsData] = await Promise.all([
        reportRes.json(),
        itemsRes.json()
      ]);

      if (reportData.success) setStockReport(reportData.data);
      if (itemsData.success) setLowStockItems(itemsData.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <PageLoader />;

  return (
    <div className="animate-fade-in">
      <Header
        title="Inventory Management"
        subtitle="Overview of stock levels, value, and alerts"
      />

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                  <Package className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm text-surface-500">Total Inventory Value</p>
                  <p className="text-2xl font-bold">{formatCurrency(stockReport?.totalInventoryValue || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-surface-500">Total Categories</p>
                  <p className="text-2xl font-bold">{stockReport?.stockByCategory?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-surface-500">Low Stock Alerts</p>
                  <p className="text-2xl font-bold text-orange-600">{lowStockItems.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setIsTransactionFormOpen(true)}>
            <Package className="w-4 h-4 mr-2" />
            Record Transaction
          </Button>
          <Button onClick={() => setIsPOFormOpen(true)} variant="secondary">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Create Purchase Order
          </Button>
          <Link href="/admin/inventory/items">
            <Button variant="ghost">View All Items</Button>
          </Link>
        </div>

        {/* Low Stock Alerts */}
        {lowStockItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                Low Stock Alerts ({lowStockItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {lowStockItems.slice(0, 6).map((item) => (
                  <StockCard
                    key={item._id}
                    item={item}
                    onAddStock={(itemId) => setIsTransactionFormOpen(true)}
                  />
                ))}
              </div>
              {lowStockItems.length > 6 && (
                <div className="mt-4 text-center">
                  <Link href="/admin/inventory/items?lowStock=true">
                    <Button variant="ghost" size="sm">
                      View All {lowStockItems.length} Low Stock Items
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stock by Category */}
        {stockReport?.stockByCategory && (
          <Card>
            <CardHeader>
              <CardTitle>Stock by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stockReport.stockByCategory.map((category: any) => (
                  <div
                    key={category._id}
                    className="flex items-center justify-between p-3 bg-surface-50 dark:bg-surface-800 rounded-lg"
                  >
                    <div>
                      <p className="font-medium capitalize">{category._id}</p>
                      <p className="text-sm text-surface-500">
                        {formatNumber(category.totalItems)} items • {formatNumber(category.totalStock)} units
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary-600">{formatCurrency(category.totalValue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <TransactionForm
        isOpen={isTransactionFormOpen}
        onClose={() => setIsTransactionFormOpen(false)}
        onSuccess={fetchData}
      />

      <PurchaseOrderForm
        isOpen={isPOFormOpen}
        onClose={() => setIsPOFormOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
