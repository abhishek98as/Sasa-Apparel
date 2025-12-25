import { ObjectId } from 'mongodb';
import { BaseDocument } from './types';

// ==================== Analytics Types ====================

export interface AnalyticsFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  styleIds?: ObjectId[];
  vendorIds?: ObjectId[];
  tailorIds?: ObjectId[];
  sizeLabels?: string[];
  orderStatuses?: string[];
  paymentStatuses?: string[];
  shipmentStatuses?: string[];
  fabricIds?: ObjectId[];
  productionLine?: string;
  region?: string;
  factoryId?: string;
  searchText?: string; // Free-text search across style_name, order_no, PO number
}

export interface AnalyticsQueryOptions {
  filters?: AnalyticsFilters;
  groupBy?: 'day' | 'week' | 'month' | 'style' | 'vendor' | 'tailor' | 'size';
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  limit?: number;
  skip?: number;
  cursor?: string;
}

// ==================== KPI Response Types ====================

export interface KPICard {
  label: string;
  value: number;
  unit?: string;
  trend?: number; // % change from previous period
  sparkline?: number[]; // Last 7 data points for mini chart
  tooltip?: string;
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
  };
  lateShipments?: {
    count: number;
    percentage: number;
  };
}

export interface TrendDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface BreakdownItem {
  key: string; // style_id, tailor_id, vendor_id, etc.
  label: string;
  value: number;
  percentage?: number;
  metadata?: Record<string, any>;
}

export interface DrilldownRow {
  id: string;
  [key: string]: any; // Flexible structure for different drill-downs
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
  | 'fabric_cut';

export interface AnalyticsEvent extends BaseDocument {
  tenantId?: ObjectId; // For multi-tenant support (future)
  eventTime: Date;
  eventType: AnalyticsEventType;
  payload: Record<string, any>;
  userId?: ObjectId;
  userName?: string;
  metadata?: {
    orderId?: ObjectId;
    styleId?: ObjectId;
    vendorId?: ObjectId;
    tailorId?: ObjectId;
    shipmentId?: ObjectId;
    [key: string]: any;
  };
}

// ==================== Daily Aggregates ====================

export interface AnalyticsDailyAggregate extends BaseDocument {
  tenantId?: ObjectId;
  day: Date; // Start of day (00:00:00)
  styleId?: ObjectId;
  vendorId?: ObjectId;
  tailorId?: ObjectId;
  
  // Production metrics
  cuttingReceived: number;
  pcsInProduction: number;
  pcsCompleted: number;
  pcsShipped: number;
  
  // Financial metrics
  revenue: number;
  tailoringCost: number;
  materialCost: number;
  profit: number;
  
  // Tailor metrics
  tailorAssignments: number;
  tailorCompletions: number;
  tailorPayments: number;
  
  // Quality metrics
  qcInspections: number;
  qcPassed: number;
  qcRejected: number;
  
  // Sample metrics
  samplesRequested: number;
  samplesSubmitted: number;
  samplesApproved: number;
  samplesRejected: number;
  
  // Shipment metrics
  shipmentsCreated: number;
  lateShipments: number;
  
  metadata?: Record<string, any>;
}

// ==================== Export Types ====================

export type ExportFormat = 'csv' | 'xlsx' | 'json';

export interface ExportJob extends BaseDocument {
  userId: ObjectId;
  userName: string;
  exportType: 'kpis' | 'trends' | 'breakdown' | 'table' | 'full_analytics';
  format: ExportFormat;
  filters: AnalyticsFilters;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fileUrl?: string; // Signed URL for download
  expiresAt?: Date;
  error?: string;
  rowCount?: number;
  fileSizeBytes?: number;
}

// ==================== Scheduled Reports ====================

export type ReportFrequency = 'daily' | 'weekly' | 'monthly';
export type ReportChannel = 'email' | 's3' | 'ftp' | 'webhook';

export interface ScheduledReport extends BaseDocument {
  tenantId?: ObjectId;
  userId: ObjectId;
  userName: string;
  reportName: string;
  frequency: ReportFrequency;
  channels: ReportChannel[];
  emailRecipients?: string[];
  s3Config?: {
    bucket: string;
    key: string;
  };
  ftpConfig?: {
    host: string;
    path: string;
  };
  webhookUrl?: string;
  filters: AnalyticsFilters;
  includeCharts: boolean;
  format: ExportFormat;
  isActive: boolean;
  lastRunAt?: Date;
  nextRunAt: Date;
}

// ==================== Alert Rules ====================

export type AlertMetric =
  | 'pending_pcs'
  | 'approval_rate'
  | 'expected_receivable'
  | 'late_shipments'
  | 'production_yield'
  | 'tailor_throughput'
  | 'avg_tat';

export type AlertCondition = 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface AlertRule extends BaseDocument {
  tenantId?: ObjectId;
  userId: ObjectId;
  userName: string;
  alertName: string;
  metric: AlertMetric;
  condition: AlertCondition;
  threshold: number;
  severity: AlertSeverity;
  channels: ReportChannel[];
  emailRecipients?: string[];
  webhookUrl?: string;
  isActive: boolean;
  cooldownMinutes: number; // Prevent alert spam
  lastTriggeredAt?: Date;
  triggerCount: number;
}

export interface AlertTrigger extends BaseDocument {
  alertRuleId: ObjectId;
  triggeredAt: Date;
  metricValue: number;
  threshold: number;
  message: string;
  acknowledged: boolean;
  acknowledgedBy?: ObjectId;
  acknowledgedAt?: Date;
}

// ==================== Cache Keys ====================

export const ANALYTICS_CACHE_KEYS = {
  KPI: (filters: string) => `analytics:kpi:${filters}`,
  TRENDS: (metric: string, filters: string) => `analytics:trends:${metric}:${filters}`,
  BREAKDOWN: (groupBy: string, filters: string) => `analytics:breakdown:${groupBy}:${filters}`,
  DAILY_AGGREGATE: (day: string) => `analytics:daily:${day}`,
} as const;

export const ANALYTICS_CACHE_TTL = {
  KPI: 5 * 60, // 5 minutes
  TRENDS: 10 * 60, // 10 minutes
  BREAKDOWN: 10 * 60, // 10 minutes
  DAILY_AGGREGATE: 24 * 60 * 60, // 24 hours
} as const;
