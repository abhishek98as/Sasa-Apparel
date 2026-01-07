'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  itemId?: string;
  onSuccess?: () => void;
}

export function TransactionForm({ isOpen, onClose, itemId, onSuccess }: TransactionFormProps) {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    itemId: itemId || '',
    transactionType: 'purchase' as 'purchase' | 'issue' | 'return' | 'adjustment' | 'consumption',
    quantity: 0,
    unitCost: 0,
    remarks: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchItems();
      if (itemId) {
        setFormData(prev => ({ ...prev, itemId }));
        fetchItemDetails(itemId);
      }
    }
  }, [isOpen, itemId]);

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/inventory/items?active=true');
      const result = await response.json();
      if (result.success) {
        setItems(result.data);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const fetchItemDetails = async (id: string) => {
    try {
      const response = await fetch(`/api/inventory/items/${id}`);
      const result = await response.json();
      if (result.success) {
        setSelectedItem(result.data);
        setFormData(prev => ({
          ...prev,
          unitCost: result.data.weightedAverageCost || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching item details:', error);
    }
  };

  const handleItemChange = (itemId: string) => {
    setFormData(prev => ({ ...prev, itemId }));
    fetchItemDetails(itemId);
  };

  const handleSubmit = async () => {
    if (!formData.itemId || formData.quantity === 0) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/inventory/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        showToast(result.message || 'Transaction recorded successfully', 'success');
        onClose();
        if (onSuccess) onSuccess();
        // Reset form
        setFormData({
          itemId: '',
          transactionType: 'purchase',
          quantity: 0,
          unitCost: 0,
          remarks: ''
        });
      } else {
        showToast(result.error || 'Failed to record transaction', 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isInTransaction = ['purchase', 'return'].includes(formData.transactionType);
  const totalCost = Math.abs(formData.quantity) * formData.unitCost;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Inventory Transaction"
      size="lg"
    >
      <div className="space-y-4">
        {!itemId && (
          <Select
            label="Item *"
            value={formData.itemId}
            onChange={(e) => handleItemChange(e.target.value)}
            options={[
              { value: '', label: 'Select an item' },
              ...items.map(item => ({
                value: item._id,
                label: `${item.itemName} (${item.itemCode})`
              }))
            ]}
          />
        )}

        {selectedItem && (
          <div className="p-3 bg-surface-50 dark:bg-surface-800 rounded-lg">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-surface-500">Current Stock:</span>
                <span className="ml-2 font-semibold">{selectedItem.currentStock} {selectedItem.unit}</span>
              </div>
              <div>
                <span className="text-surface-500">WAC:</span>
                <span className="ml-2 font-semibold">₹{selectedItem.weightedAverageCost.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        <Select
          label="Transaction Type *"
          value={formData.transactionType}
          onChange={(e) => setFormData({ ...formData, transactionType: e.target.value as any })}
          options={[
            { value: 'purchase', label: 'Purchase (Stock IN)' },
            { value: 'issue', label: 'Issue (Stock OUT)' },
            { value: 'return', label: 'Return (Stock IN)' },
            { value: 'consumption', label: 'Consumption (Stock OUT)' },
            { value: 'adjustment', label: 'Adjustment' }
          ]}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label={`Quantity * (${selectedItem?.unit || 'units'})`}
            type="number"
            min="0"
            step="any"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
            helperText={isInTransaction ? 'Positive for IN' : 'Quantity to issue/consume'}
          />

          <Input
            label="Unit Cost (₹) *"
            type="number"
            min="0"
            step="0.01"
            value={formData.unitCost}
            onChange={(e) => setFormData({ ...formData, unitCost: parseFloat(e.target.value) || 0 })}
            helperText={isInTransaction ? 'Purchase price' : 'Current WAC'}
          />
        </div>

        <Input
          label="Remarks"
          value={formData.remarks}
          onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
          placeholder="Optional notes about this transaction"
        />

        {formData.quantity !== 0 && formData.unitCost !== 0 && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-surface-600 dark:text-surface-400">Total Transaction Cost:</span>
              <span className="font-bold text-lg">₹{totalCost.toFixed(2)}</span>
            </div>
            {selectedItem && (
              <div className="flex justify-between text-sm mt-1">
                <span className="text-surface-600 dark:text-surface-400">New Stock Level:</span>
                <span className="font-semibold">
                  {isInTransaction 
                    ? selectedItem.currentStock + formData.quantity 
                    : selectedItem.currentStock - formData.quantity
                  } {selectedItem.unit}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={isSubmitting}>
            Record Transaction
          </Button>
        </div>
      </div>
    </Modal>
  );
}

