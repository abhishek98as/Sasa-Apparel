'use client';

import { Header } from '@/components/layout/header';

export default function QCPage() {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <Header title="Quality Control" subtitle="Checklists, inspections, and defect tracking" />
      <div className="card p-4 space-y-2">
        <p className="text-sm text-surface-600">
          QC endpoints are live at `/api/qc/checklists` and `/api/qc/inspections`. Use this page to wire checklist
          editors, inspection forms, photos, and rework assignments.
        </p>
      </div>
    </div>
  );
}

