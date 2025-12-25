import { ObjectId } from 'mongodb';
import { BaseDocument } from '../types';

// ==================== Analytics Events ====================
export type AnalyticsEventType =
  | 'cutting_received'
  | 'production_started'
  | 'production_completed'
  | 'pcs_shipped'
  | 'payment_received'
  | 'payment_made'
  | 'tailor_assigned'
  | 'tailor_completed'
  | 'sample_requested'
  | 'sample_submitted'
  | 'sample_approved'
  | 'sample_rejected'
  | 'qc_inspection'
  | 'shipment_created'
  | 'order_created'
  | 'fabric_cut'
  | 'invoice_created'
  | 'invoice_paid';

export interface AnalyticsEvent extends BaseDocument {
  tenantId?: ObjectId;
  eventTime: Date;
  eventType: AnalyticsEventType;
  payload: {
    orderId?: ObjectId;
    styleId?: ObjectId;
    vendorId?: ObjectId;
    tailorId?: ObjectId;
    qty?: number;
    amount?: number;
    status?: string;
    sizeBreakdown?: Array<{ size: string; qty: number }>;
    [key: string]: any;
  };
  userId?: ObjectId;
  metadata?: Record<string, any>;
}

// ==================== Analytics Aggregates ====================
export interface AnalyticsAggregate extends BaseDocument {
  tenantId?: ObjectId;
  period: 'daily' | 'weekly' | 'monthly';
  date: string; // YYYY-MM-DD or YYYY-Www or YYYY-MM
  
  // Dimensions (for grouping/filtering)
  styleId?: ObjectId;
  vendorId?: ObjectId;
  tailorId?: ObjectId;
  sizeLabel?: string;
  fabricType?: string;
  productionLine?: string;
  
  // KPI Metrics
  cuttingReceived: {
    orders: number;
    pcs: number;
  };
  
  inProduction: {
    orders: number;
    pcs: number;
  };
  
  pcsShipped: number;
  pcsCompleted: number;
  
  revenue: {
    amount: number;
    currency: string;
  };
  
  expectedReceivable: {
    amount: number;
    invoices: number;
  };
  
  tailorExpense: {
    amount: number;
    payments: number;
  };
  
  pendingFromTailors: {
    assignments: number;
    pcs: number;
  };
  
  // Sample/Approval metrics
  samples?: {
    requested: number;
    submitted: number;
    approved: number;
    rejected: number;
    avgTatDays: number;
    approvalRate: number;
  };
  
  // Quality metrics
  qc?: {
    inspections: number;
    passed: number;
    failed: number;
    passRate: number;
  };
  
  // Shipment metrics
  shipments?: {
    count: number;
    onTime: number;
    late: number;
    lateRate: number;
    avgDelayDays: number;
  };
  
  // Financial metrics
  financials?: {
    cogs: number;
    materialCost: number;
    laborCost: number;
    overhead: number;
    grossMargin: number;
  };
  
  // Production efficiency
  efficiency?: {
    yieldRate: number; // completed / started
    reworkRate: number;
    defectRate: number;
  };
  
  // Fabric consumption
  fabricConsumption?: {
    meters: number;
    wastage: number;
  };
}

// ==================== Scheduled Reports ====================
export interface ScheduledReport extends BaseDocument {
  tenantId?: ObjectId;
  name: string;
  description?: string;
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
    time: string; // HH:mm in UTC
    timezone?: string;
    cronExpression?: string; // for custom schedules
  };
  
  recipients: Array<{
    email: string;
    name?: string;
  }>;
  
  reportType: 'kpi-dashboard' | 'production-summary' | 'financial-summary' | 'tailor-performance' | 'vendor-performance' | 'custom';
  
  filters?: {
    dateRange?: 'last-7-days' | 'last-30-days' | 'mtd' | 'ytd' | 'custom';
    styleIds?: ObjectId[];
    vendorIds?: ObjectId[];
    tailorIds?: ObjectId[];
  };
  
  format: 'pdf' | 'excel' | 'csv';
  includeCharts: boolean;
  
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
}

// ==================== Alert Rules ====================
export interface AlertRule extends BaseDocument {
  tenantId?: ObjectId;
  name: string;
  description?: string;
  
  metric: string; // e.g., 'pendingPcs', 'approvalRate', 'expectedReceivable'
  condition: {
    operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
    threshold: number;
    unit?: string;
  };
  
  // Evaluation period
  evaluationWindow: {
    period: 'hourly' | 'daily' | 'weekly';
    lookbackDays?: number;
  };
  
  // Filters to scope the alert
  filters?: {
    styleIds?: ObjectId[];
    vendorIds?: ObjectId[];
    tailorIds?: ObjectId[];
  };
  
  // Notification channels
  notifications: Array<{
    type: 'email' | 'webhook' | 'sms' | 'whatsapp';
    target: string; // email address, webhook URL, phone number
    priority: 'low' | 'medium' | 'high';
  }>;
  
  isActive: boolean;
  lastTriggered?: Date;
  triggerCount: number;
  
  // Throttling to avoid spam
  throttle?: {
    minIntervalMinutes: number; // Don't trigger again within this window
  };
}

// ==================== Alert History ====================
export interface AlertHistory extends BaseDocument {
  tenantId?: ObjectId;
  alertRuleId: ObjectId;
  alertName: string;
  
  triggeredAt: Date;
  metric: string;
  actualValue: number;
  threshold: number;
  
  filters?: Record<string, any>;
  
  notifications: Array<{
    type: string;
    target: string;
    sentAt?: Date;
    status: 'sent' | 'failed' | 'pending';
    error?: string;
  }>;
  
  acknowledged: boolean;
  acknowledgedBy?: ObjectId;
  acknowledgedAt?: Date;
}

// ==================== Export Jobs ====================
export interface ExportJob extends BaseDocument {
  tenantId?: ObjectId;
  userId: ObjectId;
  userName: string;
  userRole: string;
  
  exportType: 'kpis' | 'trends' | 'breakdown' | 'table' | 'custom';
  format: 'csv' | 'xlsx' | 'json';
  
  filters: Record<string, any>;
  query?: string; // SQL/MongoDB query for audit
  
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number; // 0-100
  
  fileUrl?: string; // Signed URL
  fileSize?: number;
  rowCount?: number;
  
  expiresAt?: Date; // When the signed URL expires
  
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

// ==================== Filter & Query Types ====================
export interface AnalyticsFilters {
  dateRange?: {
    start: Date;
    end: Date;
    preset?: 'today' | '7d' | '30d' | 'mtd' | 'ytd' | 'custom';
  };
  
  tenantId?: ObjectId;
  styleIds?: ObjectId[];
  vendorIds?: ObjectId[];
  tailorIds?: ObjectId[];
  sizeLabels?: string[];
  fabricTypes?: string[];
  
  orderStatuses?: string[];
  paymentStatuses?: string[];
  shipmentStatuses?: string[];
  
  productionLine?: string;
  region?: string;
  factoryId?: string;
  
  searchText?: string; // Free-text search
}

export interface AnalyticsQueryOptions {
  filters?: AnalyticsFilters;
  groupBy?: 'day' | 'week' | 'month' | 'style' | 'vendor' | 'tailor' | 'size' | 'fabric';
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  limit?: number;
  skip?: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    skip: number;
    hasMore: boolean;
    cursor?: string;
  };
}

// ==================== KPI Response Types ====================
export interface KPICard {
  id: string;
  label: string;
  value: number | string;
  unit?: string;
  trend?: number; // % change vs previous period
  trendDirection?: 'up' | 'down' | 'neutral';
  sparkline?: number[]; // Last N data points
  tooltip?: string;
  isCurrency?: boolean;
  metadata?: Record<string, any>;
}

export interface DashboardKPIs {
  cuttingReceived: {
    orders: number;
    pcs: number;
    trend?: number;
  };
  
  inProduction: {
    orders: number;
    pcs: number;
    trend?: number;
  };
  
  pcsShipped: {
    total: number;
    trend?: number;
  };
  
  expectedReceivable: {
    amount: number;
    currency: string;
    trend?: number;
  };
  
  pcsCompleted: {
    total: number;
    trend?: number;
  };
  
  tailoringExpense: {
    amount: number;
    currency: string;
    trend?: number;
  };
  
  pendingFromTailors: {
    assignments: number;
    pcs: number;
    trend?: number;
  };
  
  avgTAT?: {
    days: number;
    trend?: number;
  };
  
  approvalRate?: {
    percentage: number;
    trend?: number;
  };
  
  productionYield?: {
    percentage: number;
    trend?: number;
  };
  
  lateShipments?: {
    count: number;
    percentage: number;
    trend?: number;
  };
  
  inventoryTurnover?: {
    ratio: number;
    trend?: number;
  };
  
  reworkRate?: {
    percentage: number;
    trend?: number;
  };
}

export interface TrendDataPoint {
  date: string;
  value: number;
  label?: string;
  breakdown?: Record<string, number>;
}

export interface BreakdownItem {
  key: string;
  label: string;
  value: number;
  percentage?: number;
  trend?: number;
  metadata?: Record<string, any>;
}

export interface DrilldownRow {
  id: string;
  [key: string]: any;
}
