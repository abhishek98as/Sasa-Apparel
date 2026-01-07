'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface POItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

interface PurchaseOrderFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PurchaseOrderForm({ isOpen, onClose, onSuccess }: PurchaseOrderFormProps) {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    supplier: '',
    supplierContact: '',
    expectedDeliveryDate: ''
  });
  const [items, setItems] = useState<POItem[]>([
    { itemId: '', itemName: '', quantity: 0, unitCost: 0, totalCost: 0 }
  ]);

  useEffect(() => {
    if (isOpen) {
      fetchInventoryItems();
    }
  }, [isOpen]);

  const fetchInventoryItems = async () => {
    try {
      const response = await fetch('/api/inventory/items?active=true');
      const result = await response.json();
      if (result.success) {
        setInventoryItems(result.data);
      }
    } catch (error) {
      console.error('Error fetching inventory items:', error);
    }
  };

  const addItem = () => {
    setItems([...items, { itemId: '', itemName: '', quantity: 0, unitCost: 0, totalCost: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof POItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // If item selected, update itemName
    if (field === 'itemId') {
      const selectedItem = inventoryItems.find(item => item._id === value);
      if (selectedItem) {
        newItems[index].itemName = selectedItem.itemName;
        newItems[index].unitCost = selectedItem.weightedAverageCost || 0;
      }
    }
    
    // Recalculate total cost
    if (field === 'quantity' || field === 'unitCost') {
      newItems[index].totalCost = newItems[index].quantity * newItems[index].unitCost;
    }
    
    setItems(newItems);
  };

  const calculateTotals = () => {
    const totalAmount = items.reduce((sum, item) => sum + item.totalCost, 0);
    const gstAmount = totalAmount * 0.18; // 18% GST
    const grandTotal = totalAmount + gstAmount;
    return { totalAmount, gstAmount, grandTotal };
  };

  const handleSubmit = async () => {
    if (!formData.supplier || items.some(item => !item.itemId || item.quantity <= 0)) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/inventory/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          items: items.filter(item => item.itemId && item.quantity > 0)
        })
      });

      const result = await response.json();

      if (result.success) {
        showToast(result.message || 'Purchase order created successfully', 'success');
        onClose();
        if (onSuccess) onSuccess();
        // Reset form
        setFormData({ supplier: '', supplierContact: '', expectedDeliveryDate: '' });
        setItems([{ itemId: '', itemName: '', quantity: 0, unitCost: 0, totalCost: 0 }]);
      } else {
        showToast(result.error || 'Failed to create purchase order', 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totals = calculateTotals();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Purchase Order"
      size="xl"
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Supplier Name *"
            value={formData.supplier}
            onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
            placeholder="Enter supplier name"
          />
          <Input
            label="Supplier Contact"
            value={formData.supplierContact}
            onChange={(e) => setFormData({ ...formData, supplierContact: e.target.value })}
            placeholder="Phone or email"
          />
        </div>

        <Input
          label="Expected Delivery Date"
          type="date"
          value={formData.expectedDeliveryDate}
          onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
        />

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium">Items *</label>
            <Button size="sm" onClick={addItem}>
              <Plus className="w-4 h-4 mr-1" />
              Add Item
            </Button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="p-3 border border-surface-200 dark:border-surface-700 rounded-lg">
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
                    <label className="text-xs text-surface-600 dark:text-surface-400">Item</label>
                    <select
                      className="input text-sm"
                      value={item.itemId}
                      onChange={(e) => updateItem(index, 'itemId', e.target.value)}
                    >
                      <option value="">Select item</option>
                      {inventoryItems.map((invItem) => (
                        <option key={invItem._id} value={invItem._id}>
                          {invItem.itemName} ({invItem.itemCode})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-surface-600 dark:text-surface-400">Quantity</label>
                    <input
                      type="number"
                      className="input text-sm"
                      min="0"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-surface-600 dark:text-surface-400">Unit Cost (₹)</label>
                    <input
                      type="number"
                      className="input text-sm"
                      min="0"
                      step="0.01"
                      value={item.unitCost}
                      onChange={(e) => updateItem(index, 'unitCost', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="text-xs text-surface-600 dark:text-surface-400">Total</label>
                    <div className="text-sm font-semibold py-2">
                      {formatCurrency(item.totalCost)}
                    </div>
                  </div>
                  <div className="col-span-1">
                    <button
                      onClick={() => removeItem(index)}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-600"
                      disabled={items.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg space-y-2">
          <div className="flex justify-between">
            <span className="text-surface-600 dark:text-surface-400">Subtotal:</span>
            <span className="font-semibold">{formatCurrency(totals.totalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-surface-600 dark:text-surface-400">GST (18%):</span>
            <span className="font-semibold">{formatCurrency(totals.gstAmount)}</span>
          </div>
          <div className="flex justify-between text-lg border-t border-surface-200 dark:border-surface-700 pt-2">
            <span className="font-bold">Grand Total:</span>
            <span className="font-bold text-primary-600">{formatCurrency(totals.grandTotal)}</span>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={isSubmitting}>
            Create Purchase Order
          </Button>
        </div>
      </div>
    </Modal>
  );
}

