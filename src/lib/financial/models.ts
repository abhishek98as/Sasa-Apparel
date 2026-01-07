import { ObjectId } from 'mongodb';

// ==================== Inventory Types ====================

export interface InventoryItem {
  _id: ObjectId;
  itemCode: string;
  itemName: string;
  category: 'fabric' | 'accessories' | 'packaging' | 'finished_goods' | 'other';
  subCategory: string;
  unit: 'meters' | 'pieces' | 'kg' | 'rolls';
  
  // Cost tracking
  currentStock: number;
  weightedAverageCost: number;
  totalValue: number;
  
  // Min/Max levels for reordering
  reorderLevel: number;
  maxStockLevel: number;
  
  // Metadata
  supplier?: string;
  specifications?: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryTransaction {
  _id: ObjectId;
  transactionType: 'purchase' | 'issue' | 'return' | 'adjustment' | 'consumption';
  itemId: ObjectId;
  
  // Transaction details
  quantity: number;
  unitCost: number;
  totalCost: number;
  
  // Before/After snapshot for audit
  stockBefore: number;
  stockAfter: number;
  wacBefore: number;
  wacAfter: number;
  
  // References
  referenceType: 'purchase_order' | 'fabric_cutting' | 'tailor_job' | 'manual';
  referenceId?: ObjectId;
  
  // Details
  remarks?: string;
  performedBy: ObjectId;
  transactionDate: Date;
  createdAt: Date;
}

export interface PurchaseOrder {
  _id: ObjectId;
  poNumber: string;
  supplier: string;
  supplierContact?: string;
  
  items: Array<{
    itemId: ObjectId;
    itemName: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  }>;
  
  totalAmount: number;
  gstAmount: number;
  grandTotal: number;
  
  status: 'draft' | 'approved' | 'ordered' | 'received' | 'cancelled';
  orderDate: Date;
  expectedDeliveryDate?: Date;
  receivedDate?: Date;
  
  createdBy: ObjectId;
  approvedBy?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Financial Types ====================

export interface RevenueBreakdown {
  byVendor: Array<{
    vendorId: ObjectId;
    vendorName: string;
    amount: number;
  }>;
  byStyle: Array<{
    styleId: ObjectId;
    styleName: string;
    amount: number;
  }>;
  byTailor: Array<{
    tailorId: ObjectId;
    tailorName: string;
    amount: number;
  }>;
  bySize: Array<{
    size: string;
    amount: number;
  }>;
  byFabricType: Array<{
    fabricType: string;
    amount: number;
  }>;
}

export interface CostMetrics {
  tailorCost: number;
  materialCost: number;
  overheadCost: number;
  logisticsCost: number;
  qualityCost: number;
  otherCost: number;
  totalCost: number;
}

export interface FinancialPeriod {
  _id: ObjectId;
  periodType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  periodKey: string;
  startDate: Date;
  endDate: Date;
  
  // Revenue Metrics
  revenue: {
    totalRevenue: number;
    byVendor: Array<{ vendorId: ObjectId; vendorName: string; amount: number }>;
    byStyle: Array<{ styleId: ObjectId; styleName: string; amount: number }>;
    byTailor: Array<{ tailorId: ObjectId; tailorName: string; amount: number }>;
    bySize: Array<{ size: string; amount: number }>;
    byFabricType: Array<{ fabricType: string; amount: number }>;
  };
  
  // Cost Metrics
  costs: CostMetrics;
  
  // Calculated Metrics
  grossProfit: number;
  grossProfitMargin: number;
  operatingProfit: number;
  operatingProfitMargin: number;
  ebitda: number;
  netProfit: number;
  netProfitMargin: number;
  
  // Additional KPIs
  inventoryTurnover: number;
  returnOnSales: number;
  
  isFinalized: boolean;
  finalizedBy?: ObjectId;
  finalizedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface CostEntry {
  _id: ObjectId;
  entryDate: Date;
  costCategory: 'overhead' | 'logistics' | 'quality' | 'other';
  costType: string;
  
  amount: number;
  description: string;
  
  // Optional references
  relatedTo?: string;
  relatedId?: ObjectId;
  
  // Approval
  status: 'draft' | 'approved' | 'rejected';
  approvedBy?: ObjectId;
  approvedAt?: Date;
  
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Financial Dashboard Types ====================

export interface FinancialSummary {
  totalRevenue: number;
  totalCosts: number;
  grossProfit: number;
  grossProfitMargin: number;
  ebitda: number;
  ebitdaMargin: number;
  netProfit: number;
  netProfitMargin: number;
  inventoryTurnover: number;
  
  // Period comparison
  previousPeriod?: {
    totalRevenue: number;
    totalCosts: number;
    grossProfit: number;
    netProfit: number;
  };
  
  // Trends
  revenueTrend: number; // Percentage change
  profitTrend: number;
}

export interface PLStatement {
  revenue: {
    salesRevenue: number;
    otherRevenue: number;
    totalRevenue: number;
  };
  
  cogs: {
    materialCost: number;
    tailorCost: number;
    totalCOGS: number;
  };
  
  grossProfit: number;
  grossProfitMargin: number;
  
  operatingExpenses: {
    overheadCost: number;
    logisticsCost: number;
    qualityCost: number;
    otherCost: number;
    totalOperatingExpenses: number;
  };
  
  operatingProfit: number;
  operatingProfitMargin: number;
  
  ebitda: number;
  ebitdaMargin: number;
  
  netProfit: number;
  netProfitMargin: number;
}

export interface TurnoverMetrics {
  inventoryTurnover: {
    ratio: number;
    daysInventoryOutstanding: number;
    avgInventoryValue: number;
  };
  
  salesTurnover: {
    revenuePerDay: number;
    revenuePerWeek: number;
    revenuePerMonth: number;
  };
  
  financialRatios: {
    returnOnSales: number;
    costToIncomeRatio: number;
    grossProfitPerUnit: number;
    netProfitPerUnit: number;
  };
}

// ==================== Request/Response Types ====================

export interface DateRangeFilter {
  startDate: Date;
  endDate: Date;
  periodType?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
}

export interface FinancialDashboardRequest {
  dateRange: DateRangeFilter;
  compareWithPrevious?: boolean;
}

export interface RevenueBreakdownRequest {
  dateRange: DateRangeFilter;
  groupBy?: 'vendor' | 'style' | 'tailor' | 'size' | 'fabric';
  limit?: number;
}

export interface CostBreakdownRequest {
  dateRange: DateRangeFilter;
  includeDetails?: boolean;
}

