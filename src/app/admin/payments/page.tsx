'use client';

import { Header } from '@/components/layout/header';

export default function PaymentsPage() {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <Header title="Tailor Payments" subtitle="Ledger, payouts, advances, and deductions" />
      <div className="card p-4">
        <p className="text-sm text-surface-600">
          Payment tracking endpoints are available at `/api/tailor-payments`. Build ledger tables and outstanding
          summaries here to surface payment history and balances.
        </p>
      </div>
    </div>
  );
}

