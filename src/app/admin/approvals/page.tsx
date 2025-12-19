'use client';

import { Header } from '@/components/layout/header';

export default function ApprovalsPage() {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <Header title="Approvals" subtitle="Review and act on pending requests" />
      <div className="card p-4">
        <p className="text-sm text-surface-600">
          Approval workflow is enabled. Managers and tailors submit change requests; admins approve or reject them here.
          UI wiring to the approval API is pending display; use the API route `/api/approvals` to fetch pending items.
        </p>
      </div>
    </div>
  );
}

