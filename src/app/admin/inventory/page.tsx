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
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils';
import {
  Plus,
  Search,
  AlertTriangle,
  Package,
  ArrowUpCircle,
  ArrowDownCircle,
  Trash2,
  Edit,
  RefreshCw,
} from 'lucide-react';

interface InventoryItem {
  _id: string;
  name: string;
  sku: string;
  type: 'raw' | 'accessory';
  unit: 'kg' | 'piece' | 'meter';
  costPerUnit: number;
  minStock: number;
  currentStock: number;
  category?: string;
  isActive: boolean;
  createdAt: string;
}

interface ReorderSuggestion {
  _id: string;
  itemId: string;
  suggestedQty: number;
  status: 'open' | 'acknowledged' | 'ordered' | 'closed';
  generatedReason: string;
  item?: InventoryItem;
  createdAt: string;
}

interface Movement {
  _id: string;
  itemId: string;
  type: 'in' | 'out' | 'waste' | 'adjust';
  quantity: number;
  unitCost?: number;
  notes?: string;
  createdBy: { name: string };
  createdAt: string;
}

export default function InventoryPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [reorders, setReorders] = useState<ReorderSuggestion[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<'items' | 'movements' | 'reorders'>('items');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [selectedItemForMovement, setSelectedItemForMovement] = useState<InventoryItem | null>(
    null
  );

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    type: 'raw' as 'raw' | 'accessory',
    unit: 'piece' as 'kg' | 'piece' | 'meter',
    costPerUnit: 0,
    minStock: 0,
    currentStock: 0,
    category: '',
  });

  const [movementData, setMovementData] = useState({
    type: 'in' as 'in' | 'out' | 'waste' | 'adjust',
    quantity: 0,
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [itemsRes, reordersRes, movementsRes] = await Promise.all([
        fetch('/api/inventory/items'),
        fetch('/api/inventory/reorder'),
        fetch('/api/inventory/movements'),
      ]);

      const [itemsData, reordersData, movementsData] = await Promise.all([
        itemsRes.json(),
        reordersRes.json(),
        movementsRes.json(),
      ]);

      if (itemsData.success) setItems(itemsData.data);
      if (reordersData.success) setReorders(reordersData.data);
      if (movementsData.success) setMovements(movementsData.data);
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
      showToast('Failed to load inventory data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (typeFilter && item.type !== typeFilter) return false;
    if (lowStockOnly && item.currentStock >= item.minStock) return false;
    return true;
  });

  const lowStockItems = items.filter((item) => item.currentStock < item.minStock);
  const openReorders = reorders.filter((r) => r.status === 'open' || r.status === 'acknowledged');

  const handleSubmitItem = async () => {
    setIsSubmitting(true);
    try {
      const url = editItem ? `/api/inventory/items/${editItem._id}` : '/api/inventory/items';
      const method = editItem ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        showToast(editItem ? 'Item updated successfully' : 'Item created successfully', 'success');
        setShowAddModal(false);
        setEditItem(null);
        resetForm();
        fetchData();
      } else {
        showToast(result.error || 'Failed to save item', 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitMovement = async () => {
    if (!selectedItemForMovement) return;
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/inventory/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: selectedItemForMovement._id,
          ...movementData,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showToast('Stock movement recorded', 'success');
        setShowMovementModal(false);
        setSelectedItemForMovement(null);
        setMovementData({ type: 'in', quantity: 0, notes: '' });
        fetchData();
      } else {
        showToast(result.error || 'Failed to record movement', 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateReorder = async (id: string, status: string) => {
    try {
      const response = await fetch('/api/inventory/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });

      const result = await response.json();

      if (result.success) {
        showToast('Reorder status updated', 'success');
        fetchData();
      } else {
        showToast(result.error || 'Failed to update', 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      type: 'raw',
      unit: 'piece',
      costPerUnit: 0,
      minStock: 0,
      currentStock: 0,
      category: '',
    });
  };

  const openEditModal = (item: InventoryItem) => {
    setEditItem(item);
    setFormData({
      name: item.name,
      sku: item.sku,
      type: item.type,
      unit: item.unit,
      costPerUnit: item.costPerUnit,
      minStock: item.minStock,
      currentStock: item.currentStock,
      category: item.category || '',
    });
    setShowAddModal(true);
  };

  const getUnitLabel = (unit: string) => {
    const labels: Record<string, string> = {
      kg: 'Kilogram',
      piece: 'Piece',
      meter: 'Meter',
    };
    return labels[unit] || unit;
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'in':
        return <ArrowUpCircle className="w-4 h-4 text-green-600" />;
      case 'out':
        return <ArrowDownCircle className="w-4 h-4 text-blue-600" />;
      case 'waste':
        return <Trash2 className="w-4 h-4 text-red-600" />;
      default:
        return <RefreshCw className="w-4 h-4 text-amber-600" />;
    }
  };

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="animate-fade-in">
      <Header
        title="Inventory"
        subtitle="Raw materials, accessories, and stock movements"
        actions={
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" />
            Add Item
          </Button>
        }
      />

      <div className="p-4 sm:p-6 space-y-4">
        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-800 dark:text-amber-200">
                  Low Stock Alert
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  {lowStockItems.length} item(s) are below minimum stock level:{' '}
                  {lowStockItems.map((i) => i.name).join(', ')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="py-4 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                  {items.length}
                </p>
                <p className="text-sm text-surface-500">Total Items</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                  {lowStockItems.length}
                </p>
                <p className="text-sm text-surface-500">Low Stock</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <ArrowUpCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                  {items.filter((i) => i.type === 'raw').length}
                </p>
                <p className="text-sm text-surface-500">Raw Materials</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Package className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                  {openReorders.length}
                </p>
                <p className="text-sm text-surface-500">Open Reorders</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-surface-200 dark:border-surface-700">
          {[
            { key: 'items', label: 'Items' },
            { key: 'movements', label: 'Stock Movements' },
            { key: 'reorders', label: 'Reorder Suggestions' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-surface-500 hover:text-surface-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Items Tab */}
        {activeTab === 'items' && (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row gap-3 justify-between">
                <CardTitle>Inventory Items</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                    <input
                      type="text"
                      placeholder="Search items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="input pl-9 w-48"
                    />
                  </div>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="select w-32"
                  >
                    <option value="">All Types</option>
                    <option value="raw">Raw</option>
                    <option value="accessory">Accessory</option>
                  </select>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={lowStockOnly}
                      onChange={(e) => setLowStockOnly(e.target.checked)}
                      className="rounded"
                    />
                    Low Stock Only
                  </label>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>SKU</th>
                      <th>Type</th>
                      <th>Unit</th>
                      <th>Cost</th>
                      <th>Stock</th>
                      <th>Min Stock</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-8 text-surface-500">
                          No items found
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => (
                        <tr key={item._id}>
                          <td className="font-medium">{item.name}</td>
                          <td>
                            <code className="text-xs bg-surface-100 dark:bg-surface-800 px-1 rounded">
                              {item.sku}
                            </code>
                          </td>
                          <td>
                            <Badge variant={item.type === 'raw' ? 'info' : 'neutral'}>
                              {item.type}
                            </Badge>
                          </td>
                          <td>{getUnitLabel(item.unit)}</td>
                          <td>{formatCurrency(item.costPerUnit)}</td>
                          <td className="font-semibold">{formatNumber(item.currentStock)}</td>
                          <td>{formatNumber(item.minStock)}</td>
                          <td>
                            {item.currentStock < item.minStock ? (
                              <Badge variant="danger">Low Stock</Badge>
                            ) : (
                              <Badge variant="success">OK</Badge>
                            )}
                          </td>
                          <td>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedItemForMovement(item);
                                  setShowMovementModal(true);
                                }}
                              >
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEditModal(item)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Movements Tab */}
        {activeTab === 'movements' && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Stock Movements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Item</th>
                      <th>Quantity</th>
                      <th>Notes</th>
                      <th>By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-surface-500">
                          No movements recorded
                        </td>
                      </tr>
                    ) : (
                      movements.map((m) => {
                        const item = items.find((i) => i._id === m.itemId);
                        return (
                          <tr key={m._id}>
                            <td>{formatDate(m.createdAt)}</td>
                            <td>
                              <div className="flex items-center gap-2">
                                {getMovementIcon(m.type)}
                                <span className="capitalize">{m.type}</span>
                              </div>
                            </td>
                            <td>{item?.name || 'Unknown'}</td>
                            <td
                              className={`font-semibold ${
                                m.type === 'in' || m.type === 'adjust'
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {m.type === 'in' || m.type === 'adjust' ? '+' : '-'}
                              {formatNumber(m.quantity)}
                            </td>
                            <td className="text-surface-500">{m.notes || '-'}</td>
                            <td>{m.createdBy?.name || '-'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reorders Tab */}
        {activeTab === 'reorders' && (
          <Card>
            <CardHeader>
              <CardTitle>Reorder Suggestions</CardTitle>
            </CardHeader>
            <CardContent>
              {reorders.length === 0 ? (
                <div className="py-8 text-center text-surface-500">
                  No reorder suggestions at this time
                </div>
              ) : (
                <div className="space-y-3">
                  {reorders.map((r) => (
                    <div
                      key={r._id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-surface-200 dark:border-surface-700 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">
                          {r.item?.name || 'Unknown Item'}
                        </p>
                        <p className="text-sm text-surface-500">{r.generatedReason}</p>
                        <p className="text-sm mt-1">
                          Suggested Qty:{' '}
                          <span className="font-semibold">{formatNumber(r.suggestedQty)}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            r.status === 'open'
                              ? 'warning'
                              : r.status === 'acknowledged'
                              ? 'info'
                              : r.status === 'ordered'
                              ? 'success'
                              : 'neutral'
                          }
                        >
                          {r.status}
                        </Badge>
                        {r.status === 'open' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleUpdateReorder(r._id, 'acknowledged')}
                          >
                            Acknowledge
                          </Button>
                        )}
                        {r.status === 'acknowledged' && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdateReorder(r._id, 'ordered')}
                          >
                            Mark Ordered
                          </Button>
                        )}
                        {r.status === 'ordered' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleUpdateReorder(r._id, 'closed')}
                          >
                            Close
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add/Edit Item Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditItem(null);
          resetForm();
        }}
        title={editItem ? 'Edit Item' : 'Add New Item'}
      >
        <div className="space-y-4">
          <Input
            label="Item Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Cotton Fabric"
            required
          />
          <Input
            label="SKU"
            value={formData.sku}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            placeholder="e.g., FAB-001"
            required
            disabled={!!editItem}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Type"
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value as 'raw' | 'accessory' })
              }
              options={[
                { value: 'raw', label: 'Raw Material' },
                { value: 'accessory', label: 'Accessory' },
              ]}
            />
            <Select
              label="Unit"
              value={formData.unit}
              onChange={(e) =>
                setFormData({ ...formData, unit: e.target.value as 'kg' | 'piece' | 'meter' })
              }
              options={[
                { value: 'kg', label: 'Kilogram' },
                { value: 'piece', label: 'Piece' },
                { value: 'meter', label: 'Meter' },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Cost Per Unit (₹)"
              type="number"
              value={formData.costPerUnit}
              onChange={(e) =>
                setFormData({ ...formData, costPerUnit: parseFloat(e.target.value) || 0 })
              }
              min={0}
            />
            <Input
              label="Minimum Stock"
              type="number"
              value={formData.minStock}
              onChange={(e) =>
                setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })
              }
              min={0}
            />
          </div>
          {!editItem && (
            <Input
              label="Initial Stock"
              type="number"
              value={formData.currentStock}
              onChange={(e) =>
                setFormData({ ...formData, currentStock: parseInt(e.target.value) || 0 })
              }
              min={0}
            />
          )}
          <Input
            label="Category (optional)"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            placeholder="e.g., Fabric, Button, Thread"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowAddModal(false);
                setEditItem(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitItem} isLoading={isSubmitting}>
              {editItem ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Stock Movement Modal */}
      <Modal
        isOpen={showMovementModal}
        onClose={() => {
          setShowMovementModal(false);
          setSelectedItemForMovement(null);
          setMovementData({ type: 'in', quantity: 0, notes: '' });
        }}
        title="Record Stock Movement"
      >
        {selectedItemForMovement && (
          <div className="space-y-4">
            <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
              <p className="font-medium">{selectedItemForMovement.name}</p>
              <p className="text-sm text-surface-500">
                Current Stock: {formatNumber(selectedItemForMovement.currentStock)}{' '}
                {selectedItemForMovement.unit}
              </p>
            </div>

            <Select
              label="Movement Type"
              value={movementData.type}
              onChange={(e) =>
                setMovementData({
                  ...movementData,
                  type: e.target.value as 'in' | 'out' | 'waste' | 'adjust',
                })
              }
              options={[
                { value: 'in', label: 'Stock In (Add)' },
                { value: 'out', label: 'Stock Out (Use)' },
                { value: 'waste', label: 'Wastage' },
                { value: 'adjust', label: 'Adjustment' },
              ]}
            />

            <Input
              label={`Quantity (${getUnitLabel(selectedItemForMovement.unit)})`}
              type="number"
              value={movementData.quantity}
              onChange={(e) =>
                setMovementData({ ...movementData, quantity: parseFloat(e.target.value) || 0 })
              }
              min={0}
            />

            <Input
              label="Notes (optional)"
              value={movementData.notes}
              onChange={(e) => setMovementData({ ...movementData, notes: e.target.value })}
              placeholder="Reason for this movement..."
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowMovementModal(false);
                  setSelectedItemForMovement(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitMovement}
                isLoading={isSubmitting}
                disabled={movementData.quantity <= 0}
              >
                Record Movement
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
