'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { PageLoader } from '@/components/ui/loading';
import { useToast } from '@/components/ui/toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Plus,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  MinusCircle,
  AlertCircle,
  Download,
  User,
} from 'lucide-react';

interface Tailor {
  _id: string;
  name: string;
  phone?: string;
}

interface PaymentEntry {
  _id: string;
  tailorId: string;
  entryType: 'earning' | 'payout' | 'advance' | 'deduction';
  amount: number;
  balanceAfter: number;
  description?: string;
  jobId?: string;
  createdBy: { name: string };
  createdAt: string;
}

interface BalanceSummary {
  _id: string;
  balance: number;
}

export default function PaymentsPage() {
  const { showToast } = useToast();
  const [tailors, setTailors] = useState<Tailor[]>([]);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [balances, setBalances] = useState<BalanceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTailor, setSelectedTailor] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    tailorId: '',
    entryType: 'earning' as PaymentEntry['entryType'],
    amount: 0,
    description: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTailors();
    fetchBalances();
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [selectedTailor]);

  const fetchTailors = async () => {
    try {
      const response = await fetch('/api/tailors?active=true');
      const result = await response.json();
      if (result.success) setTailors(result.data);
    } catch (error) {
      console.error('Failed to fetch tailors:', error);
    }
  };

  const fetchBalances = async () => {
    try {
      const response = await fetch('/api/tailor-payments?summary=true');
      const result = await response.json();
      if (result.success) setBalances(result.data);
    } catch (error) {
      console.error('Failed to fetch balances:', error);
    }
  };

  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      const url = selectedTailor
        ? `/api/tailor-payments?tailorId=${selectedTailor}`
        : '/api/tailor-payments';
      const response = await fetch(url);
      const result = await response.json();
      if (result.success) setPayments(result.data);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      showToast('Failed to load payments', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getTailorName = (id: string) => tailors.find((t) => t._id === id)?.name || 'Unknown';

  const getTailorBalance = (id: string) => {
    const bal = balances.find((b) => b._id === id);
    return bal?.balance ?? 0;
  };

  const getEntryTypeIcon = (type: string) => {
    switch (type) {
      case 'earning':
        return <ArrowUpRight className="w-4 h-4 text-green-600" />;
      case 'payout':
        return <ArrowDownLeft className="w-4 h-4 text-blue-600" />;
      case 'advance':
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
      case 'deduction':
        return <MinusCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getEntryTypeBadge = (type: string) => {
    const variants: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
      earning: 'success',
      payout: 'info',
      advance: 'warning',
      deduction: 'danger',
    };
    return <Badge variant={variants[type] || 'neutral'}>{type}</Badge>;
  };

  const handleSubmit = async () => {
    if (!formData.tailorId || formData.amount <= 0) {
      showToast('Please select a tailor and enter a valid amount', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/tailor-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        showToast('Payment entry recorded', 'success');
        setShowAddModal(false);
        setFormData({ tailorId: '', entryType: 'earning', amount: 0, description: '' });
        fetchPayments();
        fetchBalances();
      } else {
        showToast(result.error || 'Failed to record payment', 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportLedger = () => {
    const filtered = selectedTailor
      ? payments.filter((p) => p.tailorId === selectedTailor)
      : payments;

    const csv = [
      ['Date', 'Tailor', 'Type', 'Amount', 'Balance After', 'Description', 'Created By'].join(','),
      ...filtered.map((p) =>
        [
          new Date(p.createdAt).toLocaleDateString(),
          getTailorName(p.tailorId),
          p.entryType,
          p.amount,
          p.balanceAfter,
          `"${p.description || ''}"`,
          p.createdBy?.name || '',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-ledger-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Stats
  const totalOutstanding = balances.reduce((sum, b) => sum + (b.balance > 0 ? b.balance : 0), 0);
  const tailorsWithBalance = balances.filter((b) => b.balance !== 0).length;

  if (isLoading && tailors.length === 0) {
    return <PageLoader />;
  }

  return (
    <div className="animate-fade-in">
      <Header
        title="Tailor Payments"
        subtitle="Track earnings, payouts, and outstanding balances"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={exportLedger}>
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4" />
              Add Entry
            </Button>
          </div>
        }
      />

      <div className="p-4 sm:p-6 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="py-4 flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Wallet className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                  {formatCurrency(totalOutstanding)}
                </p>
                <p className="text-sm text-surface-500">Total Outstanding</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                  {tailorsWithBalance}
                </p>
                <p className="text-sm text-surface-500">Tailors with Balance</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ArrowUpRight className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                  {payments.length}
                </p>
                <p className="text-sm text-surface-500">Total Entries</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Outstanding Summary by Tailor */}
        <Card>
          <CardHeader>
            <CardTitle>Outstanding by Tailor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {tailors.map((tailor) => {
                const balance = getTailorBalance(tailor._id);
                return (
                  <div
                    key={tailor._id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedTailor === tailor._id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800'
                    }`}
                    onClick={() =>
                      setSelectedTailor(selectedTailor === tailor._id ? '' : tailor._id)
                    }
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{tailor.name}</p>
                        {tailor.phone && (
                          <p className="text-xs text-surface-500">{tailor.phone}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-bold ${
                            balance > 0
                              ? 'text-green-600'
                              : balance < 0
                              ? 'text-red-600'
                              : 'text-surface-500'
                          }`}
                        >
                          {formatCurrency(balance)}
                        </p>
                        {balance > 0 && (
                          <p className="text-xs text-surface-500">Due to tailor</p>
                        )}
                        {balance < 0 && (
                          <p className="text-xs text-surface-500">Advance given</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Ledger Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-3 justify-between">
              <CardTitle>
                Payment Ledger
                {selectedTailor && (
                  <span className="ml-2 text-sm font-normal text-surface-500">
                    - {getTailorName(selectedTailor)}
                  </span>
                )}
              </CardTitle>
              {selectedTailor && (
                <Button size="sm" variant="ghost" onClick={() => setSelectedTailor('')}>
                  Clear Filter
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Tailor</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Balance After</th>
                    <th>Description</th>
                    <th>By</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-surface-500">
                        No payment entries found
                      </td>
                    </tr>
                  ) : (
                    payments.map((payment) => (
                      <tr key={payment._id}>
                        <td>{formatDate(payment.createdAt)}</td>
                        <td className="font-medium">{getTailorName(payment.tailorId)}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            {getEntryTypeIcon(payment.entryType)}
                            {getEntryTypeBadge(payment.entryType)}
                          </div>
                        </td>
                        <td
                          className={`font-semibold ${
                            payment.entryType === 'earning' ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {payment.entryType === 'earning' ? '+' : '-'}
                          {formatCurrency(payment.amount)}
                        </td>
                        <td
                          className={`font-medium ${
                            payment.balanceAfter >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {formatCurrency(payment.balanceAfter)}
                        </td>
                        <td className="text-surface-500 max-w-xs truncate">
                          {payment.description || '-'}
                        </td>
                        <td>{payment.createdBy?.name || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Entry Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setFormData({ tailorId: '', entryType: 'earning', amount: 0, description: '' });
        }}
        title="Add Payment Entry"
      >
        <div className="space-y-4">
          <Select
            label="Tailor"
            value={formData.tailorId}
            onChange={(e) => setFormData({ ...formData, tailorId: e.target.value })}
            options={[
              { value: '', label: 'Select a tailor...' },
              ...tailors.map((t) => ({ value: t._id, label: t.name })),
            ]}
          />

          <Select
            label="Entry Type"
            value={formData.entryType}
            onChange={(e) =>
              setFormData({ ...formData, entryType: e.target.value as PaymentEntry['entryType'] })
            }
            options={[
              { value: 'earning', label: 'Earning (Job completed)' },
              { value: 'payout', label: 'Payout (Payment given)' },
              { value: 'advance', label: 'Advance (Pre-payment)' },
              { value: 'deduction', label: 'Deduction' },
            ]}
          />

          <Input
            label="Amount (₹)"
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
            min={0}
            step={0.01}
          />

          <Input
            label="Description (optional)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="e.g., Payment for July work..."
          />

          {formData.tailorId && (
            <div className="p-3 bg-surface-50 dark:bg-surface-800 rounded-lg">
              <p className="text-sm text-surface-500">
                Current Balance:{' '}
                <span className="font-semibold">
                  {formatCurrency(getTailorBalance(formData.tailorId))}
                </span>
              </p>
              {formData.amount > 0 && (
                <p className="text-sm text-surface-500 mt-1">
                  New Balance:{' '}
                  <span className="font-semibold">
                    {formatCurrency(
                      getTailorBalance(formData.tailorId) +
                        (formData.entryType === 'earning'
                          ? formData.amount
                          : -formData.amount)
                    )}
                  </span>
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowAddModal(false);
                setFormData({ tailorId: '', entryType: 'earning', amount: 0, description: '' });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              isLoading={isSubmitting}
              disabled={!formData.tailorId || formData.amount <= 0}
            >
              Add Entry
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
