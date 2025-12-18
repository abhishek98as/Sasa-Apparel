'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageLoader } from '@/components/ui/loading';
import { formatNumber } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface StyleProgress {
  _id: string;
  code: string;
  name: string;
  totalReceived: number;
  inProduction: number;
  completed: number;
  totalShipped: number;
  pending: number;
}

export default function VendorProgressPage() {
  const [styles, setStyles] = useState<StyleProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/vendor/dashboard');
      const result = await response.json();
      if (result.success) {
        setStyles(result.data.styles);
      }
    } catch (error) {
      console.error('Failed to fetch progress data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="animate-fade-in">
      <Header
        title="Production Progress"
        subtitle="Track the progress of your orders"
      />

      <div className="p-6 space-y-6">
        {/* Overview Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Overall Progress</CardTitle>
          </CardHeader>
          <CardContent>
            {styles.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={styles} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="code"
                    tick={{ fontSize: 12 }}
                    width={80}
                  />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="totalReceived" fill="#df6358" name="Received" />
                  <Bar dataKey="inProduction" fill="#f59e0b" name="In Production" />
                  <Bar dataKey="completed" fill="#3b82f6" name="Completed" />
                  <Bar dataKey="totalShipped" fill="#22c55e" name="Shipped" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-surface-500">
                No progress data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Style Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {styles.map((style) => {
            const progress =
              style.totalReceived > 0
                ? Math.round((style.totalShipped / style.totalReceived) * 100)
                : 0;

            return (
              <Card key={style._id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-semibold">{style.name}</h4>
                      <p className="text-sm text-surface-500">{style.code}</p>
                    </div>
                    <Badge
                      variant={progress === 100 ? 'success' : progress > 50 ? 'warning' : 'info'}
                    >
                      {progress}%
                    </Badge>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 bg-surface-100 rounded-full overflow-hidden mb-4">
                    <div
                      className="h-full bg-accent-500 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2 bg-surface-50 rounded">
                      <p className="text-surface-500">Received</p>
                      <p className="font-semibold">{formatNumber(style.totalReceived)}</p>
                    </div>
                    <div className="p-2 bg-amber-50 rounded">
                      <p className="text-surface-500">In Production</p>
                      <p className="font-semibold text-amber-600">
                        {formatNumber(style.inProduction)}
                      </p>
                    </div>
                    <div className="p-2 bg-blue-50 rounded">
                      <p className="text-surface-500">Completed</p>
                      <p className="font-semibold text-blue-600">
                        {formatNumber(style.completed)}
                      </p>
                    </div>
                    <div className="p-2 bg-accent-50 rounded">
                      <p className="text-surface-500">Shipped</p>
                      <p className="font-semibold text-accent-600">
                        {formatNumber(style.totalShipped)}
                      </p>
                    </div>
                  </div>

                  {style.pending > 0 && (
                    <div className="mt-3 p-2 bg-primary-50 rounded text-center">
                      <span className="text-sm text-primary-700">
                        {formatNumber(style.pending)} pieces pending delivery
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {styles.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-surface-500">
              No styles assigned to your account yet.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

