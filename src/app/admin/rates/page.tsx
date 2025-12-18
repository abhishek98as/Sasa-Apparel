'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@/components/ui/table';
import { PageLoader } from '@/components/ui/loading';
import { useToast } from '@/components/ui/toast';
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils';
import { Plus, TrendingUp, DollarSign, Percent } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface Vendor {
  _id: string;
  name: string;
}

interface Style {
  _id: string;
  code: string;
  name: string;
  vendorId: string;
}

interface Rate {
  _id: string;
  styleId: string;
  style?: Style;
  vendorId: string;
  vendor?: Vendor;
  vendorRate: number;
  effectiveDate: string;
}

interface ProfitData {
  styleWiseProfit: {
    styleCode: string;
    styleName: string;
    vendorName: string;
    vendorRate: number;
    totalShipped: number;
    totalTailoringCost: number;
    expectedRevenue: number;
    grossMargin: number;
    pcsCompleted: number;
  }[];
  vendorWiseData: {
    vendorName: string;
    totalShipped: number;
    shipmentCount: number;
  }[];
  totals: {
    totalShipped: number;
    totalRevenue: number;
    totalTailoringCost: number;
    totalMargin: number;
  };
}

const COLORS = ['#df6358', '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

export default function RatesPage() {
  const { showToast } = useToast();
  const [rates, setRates] = useState<Rate[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [styles, setStyles] = useState<Style[]>([]);
  const [filteredStyles, setFilteredStyles] = useState<Style[]>([]);
  const [profitData, setProfitData] = useState<ProfitData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    vendorId: '',
    styleId: '',
    vendorRate: 0,
    effectiveDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (formData.vendorId) {
      setFilteredStyles(styles.filter((s) => s.vendorId === formData.vendorId));
    } else {
      setFilteredStyles(styles);
    }
  }, [formData.vendorId, styles]);

  const fetchData = async () => {
    try {
      const [ratesRes, vendorsRes, stylesRes, profitRes] = await Promise.all([
        fetch('/api/rates'),
        fetch('/api/vendors?active=true'),
        fetch('/api/styles?active=true'),
        fetch('/api/profit'),
      ]);
      const [ratesData, vendorsData, stylesData, profitResult] = await Promise.all([
        ratesRes.json(),
        vendorsRes.json(),
        stylesRes.json(),
        profitRes.json(),
      ]);

      if (ratesData.success) setRates(ratesData.data);
      if (vendorsData.success) setVendors(vendorsData.data);
      if (stylesData.success) {
        setStyles(stylesData.data);
        setFilteredStyles(stylesData.data);
      }
      if (profitResult.success) setProfitData(profitResult.data);
    } catch (error) {
      showToast('Failed to fetch data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = () => {
    setFormData({
      vendorId: '',
      styleId: '',
      vendorRate: 0,
      effectiveDate: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        showToast(result.message, 'success');
        setIsModalOpen(false);
        fetchData();
      } else {
        showToast(result.error, 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <PageLoader />;
  }

  const marginPercentage = profitData?.totals.totalRevenue
    ? ((profitData.totals.totalMargin / profitData.totals.totalRevenue) * 100).toFixed(1)
    : '0';

  return (
    <div className="animate-fade-in">
      <Header
        title="Rates & Profit"
        subtitle="Manage vendor rates and view profit analytics"
        actions={
          <Button onClick={handleOpenModal}>
            <Plus className="w-4 h-4" />
            Set Rate
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-surface-500">Expected Revenue</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(profitData?.totals.totalRevenue || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-surface-500">Tailoring Cost</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(profitData?.totals.totalTailoringCost || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-accent-600" />
                </div>
                <div>
                  <p className="text-sm text-surface-500">Gross Margin</p>
                  <p className="text-xl font-bold text-accent-600">
                    {formatCurrency(profitData?.totals.totalMargin || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Percent className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm text-surface-500">Margin %</p>
                  <p className="text-xl font-bold">{marginPercentage}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Style-wise Profit */}
          <Card>
            <CardHeader>
              <CardTitle>Style-wise Margin</CardTitle>
            </CardHeader>
            <CardContent>
              {profitData?.styleWiseProfit && profitData.styleWiseProfit.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={profitData.styleWiseProfit.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="styleCode" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Bar dataKey="expectedRevenue" fill="#3b82f6" name="Revenue" />
                    <Bar dataKey="totalTailoringCost" fill="#f59e0b" name="Cost" />
                    <Bar dataKey="grossMargin" fill="#22c55e" name="Margin" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-surface-500">
                  No profit data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vendor Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Vendor-wise Shipments</CardTitle>
            </CardHeader>
            <CardContent>
              {profitData?.vendorWiseData && profitData.vendorWiseData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={profitData.vendorWiseData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="totalShipped"
                      nameKey="vendorName"
                      label={({ vendorName, percent }) =>
                        `${vendorName} (${(percent * 100).toFixed(0)}%)`
                      }
                      labelLine={false}
                    >
                      {profitData.vendorWiseData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-surface-500">
                  No vendor data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Rates Table */}
        <Card>
          <CardHeader>
            <CardTitle>Vendor Rates</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Style</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Rate (₹/pc)</TableHead>
                  <TableHead>Effective Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.length === 0 ? (
                  <TableEmpty message="No rates configured" colSpan={4} />
                ) : (
                  rates.map((rate) => (
                    <TableRow key={rate._id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{rate.style?.name}</p>
                          <p className="text-xs text-surface-500">
                            {rate.style?.code}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{rate.vendor?.name}</TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(rate.vendorRate)}
                      </TableCell>
                      <TableCell>{formatDate(rate.effectiveDate)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Profit Table */}
        <Card>
          <CardHeader>
            <CardTitle>Style-wise Profit Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Style</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Shipped</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Tailoring Cost</TableHead>
                  <TableHead>Margin</TableHead>
                  <TableHead>Margin %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!profitData?.styleWiseProfit.length ? (
                  <TableEmpty message="No profit data" colSpan={8} />
                ) : (
                  profitData.styleWiseProfit.map((item, index) => {
                    const marginPct = item.expectedRevenue
                      ? ((item.grossMargin / item.expectedRevenue) * 100).toFixed(1)
                      : '0';
                    return (
                      <TableRow key={index}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.styleName}</p>
                            <p className="text-xs text-surface-500">
                              {item.styleCode}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{item.vendorName}</TableCell>
                        <TableCell>
                          {item.vendorRate ? formatCurrency(item.vendorRate) : '-'}
                        </TableCell>
                        <TableCell>{formatNumber(item.totalShipped)}</TableCell>
                        <TableCell>
                          {formatCurrency(item.expectedRevenue || 0)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(item.totalTailoringCost || 0)}
                        </TableCell>
                        <TableCell
                          className={
                            item.grossMargin >= 0
                              ? 'text-accent-600 font-semibold'
                              : 'text-red-600 font-semibold'
                          }
                        >
                          {formatCurrency(item.grossMargin || 0)}
                        </TableCell>
                        <TableCell>{marginPct}%</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Set Vendor Rate"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Vendor"
            value={formData.vendorId}
            onChange={(e) =>
              setFormData({ ...formData, vendorId: e.target.value, styleId: '' })
            }
            options={vendors.map((v) => ({ value: v._id, label: v.name }))}
            placeholder="Select vendor"
            required
          />

          <Select
            label="Style"
            value={formData.styleId}
            onChange={(e) =>
              setFormData({ ...formData, styleId: e.target.value })
            }
            options={filteredStyles.map((s) => ({
              value: s._id,
              label: `${s.code} - ${s.name}`,
            }))}
            placeholder="Select style"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Rate (₹ per piece)"
              type="number"
              min="0"
              step="0.01"
              value={formData.vendorRate}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  vendorRate: parseFloat(e.target.value) || 0,
                })
              }
              required
            />
            <Input
              label="Effective Date"
              type="date"
              value={formData.effectiveDate}
              onChange={(e) =>
                setFormData({ ...formData, effectiveDate: e.target.value })
              }
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Save Rate
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

