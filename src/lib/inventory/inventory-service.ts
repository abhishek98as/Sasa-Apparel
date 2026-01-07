import { ObjectId } from 'mongodb';
import { getDb, COLLECTIONS } from '../mongodb';
import { InventoryItem, InventoryTransaction } from '../financial/models';

export class InventoryService {
  private db: any;

  async init() {
    this.db = await getDb();
  }

  /**
   * Calculate Weighted Average Cost when receiving new stock
   */
  calculateWeightedAverageCost(
    currentStock: number,
    currentWAC: number,
    incomingQty: number,
    incomingCost: number
  ): { newStock: number; newWAC: number; totalValue: number } {
    const currentValue = currentStock * currentWAC;
    const incomingValue = incomingQty * incomingCost;
    const newStock = currentStock + incomingQty;
    
    // Handle edge case: if new stock is 0, WAC remains same
    if (newStock === 0) {
      return {
        newStock: 0,
        newWAC: currentWAC,
        totalValue: 0
      };
    }
    
    const newWAC = (currentValue + incomingValue) / newStock;
    
    return {
      newStock,
      newWAC,
      totalValue: newStock * newWAC
    };
  }

  /**
   * Calculate stock consumption (OUT transaction)
   */
  calculateConsumption(
    currentStock: number,
    currentWAC: number,
    outgoingQty: number
  ): { newStock: number; wac: number; totalValue: number; consumptionCost: number } {
    const newStock = currentStock - outgoingQty;
    
    // WAC remains same during consumption
    return {
      newStock: Math.max(0, newStock), // Prevent negative stock
      wac: currentWAC,
      totalValue: Math.max(0, newStock) * currentWAC,
      consumptionCost: outgoingQty * currentWAC
    };
  }

  /**
   * Record inventory transaction and update WAC
   */
  async recordTransaction(data: {
    itemId: string | ObjectId;
    transactionType: 'purchase' | 'issue' | 'return' | 'adjustment' | 'consumption';
    quantity: number;
    unitCost: number;
    referenceType?: 'purchase_order' | 'fabric_cutting' | 'tailor_job' | 'manual';
    referenceId?: string | ObjectId;
    remarks?: string;
    performedBy: string | ObjectId;
    transactionDate?: Date;
  }): Promise<{ success: boolean; transaction?: InventoryTransaction; error?: string }> {
    await this.init();

    try {
      // Get current item state
      const item = await this.db.collection(COLLECTIONS.INVENTORY_ITEMS).findOne({
        _id: new ObjectId(data.itemId)
      }) as InventoryItem | null;

      if (!item) {
        return { success: false, error: 'Inventory item not found' };
      }

      const stockBefore = item.currentStock || 0;
      const wacBefore = item.weightedAverageCost || 0;

      let stockAfter: number;
      let wacAfter: number;
      let totalValue: number;

      // Determine if this is an IN or OUT transaction
      const isInTransaction = ['purchase', 'return', 'adjustment'].includes(data.transactionType) && data.quantity > 0;
      
      if (isInTransaction) {
        // Calculate new WAC for incoming stock
        const result = this.calculateWeightedAverageCost(
          stockBefore,
          wacBefore,
          Math.abs(data.quantity),
          data.unitCost
        );
        stockAfter = result.newStock;
        wacAfter = result.newWAC;
        totalValue = result.totalValue;
      } else {
        // Consumption/Issue - WAC stays same
        const result = this.calculateConsumption(
          stockBefore,
          wacBefore,
          Math.abs(data.quantity)
        );
        stockAfter = result.newStock;
        wacAfter = result.wac;
        totalValue = result.totalValue;
      }

      // Create transaction record
      const transaction: Omit<InventoryTransaction, '_id'> = {
        transactionType: data.transactionType,
        itemId: new ObjectId(data.itemId),
        quantity: data.quantity,
        unitCost: data.unitCost,
        totalCost: data.quantity * data.unitCost,
        stockBefore,
        stockAfter,
        wacBefore,
        wacAfter,
        referenceType: data.referenceType || 'manual',
        referenceId: data.referenceId ? new ObjectId(data.referenceId) : undefined,
        remarks: data.remarks,
        performedBy: new ObjectId(data.performedBy),
        transactionDate: data.transactionDate || new Date(),
        createdAt: new Date()
      };

      // Insert transaction
      const transactionResult = await this.db
        .collection(COLLECTIONS.INVENTORY_TRANSACTIONS)
        .insertOne(transaction);

      // Update inventory item
      await this.db.collection(COLLECTIONS.INVENTORY_ITEMS).updateOne(
        { _id: new ObjectId(data.itemId) },
        {
          $set: {
            currentStock: stockAfter,
            weightedAverageCost: wacAfter,
            totalValue: totalValue,
            updatedAt: new Date()
          }
        }
      );

      return {
        success: true,
        transaction: {
          ...transaction,
          _id: transactionResult.insertedId
        } as InventoryTransaction
      };
    } catch (error: any) {
      console.error('Error recording inventory transaction:', error);
      return {
        success: false,
        error: error.message || 'Failed to record transaction'
      };
    }
  }

  /**
   * Get current stock and value for an item
   */
  async getItemStock(itemId: string | ObjectId): Promise<{
    currentStock: number;
    weightedAverageCost: number;
    totalValue: number;
  } | null> {
    await this.init();

    const item = await this.db.collection(COLLECTIONS.INVENTORY_ITEMS).findOne({
      _id: new ObjectId(itemId)
    }) as InventoryItem | null;

    if (!item) return null;

    return {
      currentStock: item.currentStock || 0,
      weightedAverageCost: item.weightedAverageCost || 0,
      totalValue: item.totalValue || 0
    };
  }

  /**
   * Get total inventory value
   */
  async getTotalInventoryValue(): Promise<number> {
    await this.init();

    const result = await this.db
      .collection(COLLECTIONS.INVENTORY_ITEMS)
      .aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalValue' }
          }
        }
      ])
      .toArray();

    return result[0]?.total || 0;
  }

  /**
   * Get items below reorder level
   */
  async getItemsBelowReorderLevel(): Promise<InventoryItem[]> {
    await this.init();

    return await this.db
      .collection(COLLECTIONS.INVENTORY_ITEMS)
      .find({
        isActive: true,
        $expr: { $lte: ['$currentStock', '$reorderLevel'] }
      })
      .toArray();
  }

  /**
   * Get inventory consumption for a date range (for financial calculations)
   */
  async getConsumptionCost(startDate: Date, endDate: Date): Promise<number> {
    await this.init();

    const result = await this.db
      .collection(COLLECTIONS.INVENTORY_TRANSACTIONS)
      .aggregate([
        {
          $match: {
            transactionType: { $in: ['consumption', 'issue'] },
            transactionDate: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $abs: '$totalCost' } }
          }
        }
      ])
      .toArray();

    return result[0]?.total || 0;
  }

  /**
   * Generate auto-incrementing PO number
   */
  async generatePONumber(): Promise<string> {
    await this.init();

    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');

    // Get last PO number for this month
    const lastPO = await this.db
      .collection(COLLECTIONS.PURCHASE_ORDERS)
      .findOne(
        { poNumber: { $regex: `^PO${year}${month}` } },
        { sort: { poNumber: -1 } }
      );

    let sequence = 1;
    if (lastPO && lastPO.poNumber) {
      const lastSeq = parseInt(lastPO.poNumber.slice(-4));
      sequence = lastSeq + 1;
    }

    return `PO${year}${month}${sequence.toString().padStart(4, '0')}`;
  }
}

