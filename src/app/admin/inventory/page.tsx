'use client';

import { Header } from '@/components/layout/header';

export default function InventoryPage() {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <Header title="Inventory" subtitle="Raw materials, accessories, and stock movements" />
      <div className="card p-4">
        <p className="text-sm text-surface-600">
          Inventory APIs are available under `/api/inventory/items`, `/api/inventory/movements`, and `/api/inventory/reorder`.
          Connect the UI here to list items, record movements, wastage, and reorder suggestions.
        </p>
      </div>
    </div>
  );
}

