import { ObjectId } from 'mongodb';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import {
  AnalyticsFilters,
  AnalyticsQueryOptions,
  DashboardKPIs,
  TrendDataPoint,
  BreakdownItem,
  PaginatedResult,
  DrilldownRow,
  KPICard
} from './models';
import { startOfDay, endOfDay, subDays, format, parseISO } from 'date-fns';

export class AnalyticsQueryService {
  private db: any;
  private tenantId?: ObjectId;
  private userId?: ObjectId;
  private userRole?: string;
  private vendorId?: ObjectId;
  private tailorId?: ObjectId;

  constructor(
    tenantId?: string,
    userId?: string,
    userRole?: string,
    vendorId?: string,
    tailorId?: string
  ) {
    this.tenantId = tenantId ? new ObjectId(tenantId) : undefined;
    this.userId = userId ? new ObjectId(userId) : undefined;
    this.userRole = userRole;
    this.vendorId = vendorId ? new ObjectId(vendorId) : undefined;
    this.tailorId = tailorId ? new ObjectId(tailorId) : undefined;
  }

  async init() {
    this.db = await getDb();
  }

  /**
   * Get all KPIs for dashboard
   */
  async getDashboardKPIs(filters?: AnalyticsFilters): Promise<DashboardKPIs> {
    await this.init();

    const dateRange = filters?.dateRange || {
      start: subDays(new Date(), 30),
      end: new Date()
    };

    const baseFilter = this.buildBaseFilter(filters);

    // Calculate all KPIs in parallel
    const [
      cuttingReceived,
      inProduction,
      pcsShipped,
      expectedReceivable,
      pcsCompleted,
      tailoringExpense,
      pendingFromTailors,
      avgTAT,
      approvalRate,
      productionYield,
      lateShipments,
      inventoryTurnover,
      reworkRate
    ] = await Promise.all([
      this.getCuttingReceived(baseFilter, dateRange),
      this.getInProduction(baseFilter),
      this.getPcsShipped(baseFilter, dateRange),
      this.getExpectedReceivable(baseFilter),
      this.getPcsCompleted(baseFilter, dateRange),
      this.getTailoringExpense(baseFilter, dateRange),
      this.getPendingFromTailors(baseFilter),
      this.getAvgTAT(baseFilter, dateRange),
      this.getApprovalRate(baseFilter, dateRange),
      this.getProductionYield(baseFilter, dateRange),
      this.getLateShipments(baseFilter, dateRange),
      this.getInventoryTurnover(baseFilter),
      this.getReworkRate(baseFilter, dateRange)
    ]);

    return {
      cuttingReceived,
      inProduction,
      pcsShipped,
      expectedReceivable,
      pcsCompleted,
      tailoringExpense,
      pendingFromTailors,
      avgTAT,
      approvalRate,
      productionYield,
      lateShipments,
      inventoryTurnover,
      reworkRate
    };
  }

  /**
   * Get KPIs as card format
   */
  async getKPICards(filters?: AnalyticsFilters): Promise<KPICard[]> {
    const kpis = await this.getDashboardKPIs(filters);
    const prevPeriodKPIs = await this.getPreviousPeriodKPIs(filters);

    return [
      {
        id: 'cutting-received',
        label: 'Cutting Received',
        value: kpis.cuttingReceived.pcs,
        unit: 'pcs',
        trend: this.calculateTrend(kpis.cuttingReceived.pcs, prevPeriodKPIs.cuttingReceived.pcs),
        trendDirection: this.getTrendDirection(kpis.cuttingReceived.pcs, prevPeriodKPIs.cuttingReceived.pcs),
        tooltip: `${kpis.cuttingReceived.orders} orders received`
      },
      {
        id: 'in-production',
        label: 'In Production',
        value: kpis.inProduction.pcs,
        unit: 'pcs',
        trend: this.calculateTrend(kpis.inProduction.pcs, prevPeriodKPIs.inProduction.pcs),
        trendDirection: this.getTrendDirection(kpis.inProduction.pcs, prevPeriodKPIs.inProduction.pcs),
        tooltip: `${kpis.inProduction.orders} active orders`
      },
      {
        id: 'pcs-shipped',
        label: 'PCS Shipped',
        value: kpis.pcsShipped.total,
        unit: 'pcs',
        trend: this.calculateTrend(kpis.pcsShipped.total, prevPeriodKPIs.pcsShipped.total),
        trendDirection: this.getTrendDirection(kpis.pcsShipped.total, prevPeriodKPIs.pcsShipped.total)
      },
      {
        id: 'expected-receivable',
        label: 'Expected Receivable',
        value: kpis.expectedReceivable.amount,
        unit: kpis.expectedReceivable.currency,
        isCurrency: true,
        trend: this.calculateTrend(kpis.expectedReceivable.amount, prevPeriodKPIs.expectedReceivable.amount),
        trendDirection: this.getTrendDirection(kpis.expectedReceivable.amount, prevPeriodKPIs.expectedReceivable.amount)
      },
      {
        id: 'pcs-completed',
        label: 'PCS Completed',
        value: kpis.pcsCompleted.total,
        unit: 'pcs',
        trend: this.calculateTrend(kpis.pcsCompleted.total, prevPeriodKPIs.pcsCompleted.total),
        trendDirection: this.getTrendDirection(kpis.pcsCompleted.total, prevPeriodKPIs.pcsCompleted.total)
      },
      {
        id: 'tailoring-expense',
        label: 'Tailoring Expense',
        value: kpis.tailoringExpense.amount,
        unit: kpis.tailoringExpense.currency,
        isCurrency: true,
        trend: this.calculateTrend(kpis.tailoringExpense.amount, prevPeriodKPIs.tailoringExpense.amount),
        trendDirection: this.getTrendDirection(kpis.tailoringExpense.amount, prevPeriodKPIs.tailoringExpense.amount)
      },
      {
        id: 'pending-from-tailors',
        label: 'Pending from Tailors',
        value: kpis.pendingFromTailors.pcs,
        unit: 'pcs',
        trend: this.calculateTrend(kpis.pendingFromTailors.pcs, prevPeriodKPIs.pendingFromTailors.pcs),
        trendDirection: this.getTrendDirection(kpis.pendingFromTailors.pcs, prevPeriodKPIs.pendingFromTailors.pcs, true), // Inverse: lower is better
        tooltip: `${kpis.pendingFromTailors.assignments} active assignments`
      },
      {
        id: 'avg-tat',
        label: 'Avg TAT',
        value: kpis.avgTAT?.days || 0,
        unit: 'days',
        trend: kpis.avgTAT?.trend,
        trendDirection: this.getTrendDirection(kpis.avgTAT?.days || 0, prevPeriodKPIs.avgTAT?.days || 0, true),
        tooltip: 'Average Turnaround Time for samples'
      },
      {
        id: 'approval-rate',
        label: 'Approval Rate',
        value: kpis.approvalRate?.percentage || 0,
        unit: '%',
        trend: kpis.approvalRate?.trend,
        trendDirection: this.getTrendDirection(kpis.approvalRate?.percentage || 0, prevPeriodKPIs.approvalRate?.percentage || 0)
      },
      {
        id: 'production-yield',
        label: 'Production Yield',
        value: kpis.productionYield?.percentage || 0,
        unit: '%',
        trendDirection: 'neutral'
      },
      {
        id: 'late-shipments',
        label: 'Late Shipments',
        value: kpis.lateShipments?.percentage || 0,
        unit: '%',
        trendDirection: this.getTrendDirection(kpis.lateShipments?.percentage || 0, prevPeriodKPIs.lateShipments?.percentage || 0, true),
        tooltip: `${kpis.lateShipments?.count || 0} shipments delayed`
      }
    ];
  }

  /**
   * Get trend data for a metric
   */
  async getTrendData(
    metric: string,
    filters?: AnalyticsFilters,
    granularity: 'day' | 'week' | 'month' = 'day'
  ): Promise<TrendDataPoint[]> {
    await this.init();

    const dateRange = filters?.dateRange || {
      start: subDays(new Date(), 30),
      end: new Date()
    };

    const collection = granularity === 'day'
      ? COLLECTIONS.ANALYTICS_DAILY
      : granularity === 'week'
      ? COLLECTIONS.ANALYTICS_WEEKLY
      : COLLECTIONS.ANALYTICS_MONTHLY;

    const matchFilter: any = {
      date: {
        $gte: format(dateRange.start, granularity === 'month' ? 'yyyy-MM' : 'yyyy-MM-dd'),
        $lte: format(dateRange.end, granularity === 'month' ? 'yyyy-MM' : 'yyyy-MM-dd')
      }
    };

    if (this.tenantId) {
      matchFilter.tenantId = this.tenantId;
    }

    // Apply role-based filters
    this.applyRoleFilters(matchFilter, filters);

    // Map metric to aggregate field
    const metricMap: Record<string, string> = {
      shippedPcs: 'pcsShipped',
      completedPcs: 'pcsCompleted',
      cuttingReceived: 'cuttingReceived.pcs',
      tailorExpense: 'tailorExpense.amount',
      revenue: 'revenue.amount'
    };

    const fieldPath = metricMap[metric] || metric;

    const results = await this.db.collection(collection).aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$date',
          value: { $sum: this.getFieldExpression(fieldPath) }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    return results.map((r: any) => ({
      date: r._id,
      value: r.value,
      label: r._id
    }));
  }

  /**
   * Get breakdown by dimension
   */
  async getBreakdown(
    metric: string,
    groupBy: 'style' | 'vendor' | 'tailor' | 'size' | 'fabric',
    filters?: AnalyticsFilters,
    limit: number = 10
  ): Promise<BreakdownItem[]> {
    await this.init();

    const dateRange = filters?.dateRange || {
      start: subDays(new Date(), 30),
      end: new Date()
    };

    const matchFilter: any = {
      date: {
        $gte: format(dateRange.start, 'yyyy-MM-dd'),
        $lte: format(dateRange.end, 'yyyy-MM-dd')
      }
    };

    if (this.tenantId) {
      matchFilter.tenantId = this.tenantId;
    }

    this.applyRoleFilters(matchFilter, filters);

    const groupByField = `${groupBy}Id`;
    const metricField = this.getMetricField(metric);

    const results = await this.db.collection(COLLECTIONS.ANALYTICS_DAILY).aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: `$${groupByField}`,
          value: { $sum: metricField }
        }
      },
      { $sort: { value: -1 } },
      { $limit: limit }
    ]).toArray();

    // Get labels for IDs
    const items = await this.enrichBreakdownItems(results, groupBy);

    // Calculate percentages
    const total = items.reduce((sum, item) => sum + item.value, 0);
    return items.map(item => ({
      ...item,
      percentage: total > 0 ? (item.value / total) * 100 : 0
    }));
  }

  /**
   * Get drilldown table data
   */
  async getDrilldownTable(
    filters?: AnalyticsFilters,
    options?: AnalyticsQueryOptions
  ): Promise<PaginatedResult<DrilldownRow>> {
    await this.init();

    const matchFilter = this.buildBaseFilter(filters);
    const limit = options?.limit || 50;
    const skip = options?.skip || 0;

    // Build aggregation based on filters
    const pipeline: any[] = [{ $match: matchFilter }];

    // Add lookups for related data
    pipeline.push(
      {
        $lookup: {
          from: COLLECTIONS.STYLES,
          localField: 'styleId',
          foreignField: '_id',
          as: 'style'
        }
      },
      { $unwind: { path: '$style', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: COLLECTIONS.VENDORS,
          localField: 'style.vendorId',
          foreignField: '_id',
          as: 'vendor'
        }
      },
      { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } }
    );

    // Count total
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await this.db.collection(COLLECTIONS.ANALYTICS_DAILY).aggregate(countPipeline).toArray();
    const total = countResult[0]?.total || 0;

    // Add pagination
    pipeline.push(
      { $sort: { date: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          id: '$_id',
          date: 1,
          styleCode: '$style.code',
          styleName: '$style.name',
          vendorName: '$vendor.name',
          cuttingReceived: '$cuttingReceived.pcs',
          inProduction: '$inProduction.pcs',
          pcsShipped: 1,
          pcsCompleted: 1,
          tailorExpense: '$tailorExpense.amount'
        }
      }
    );

    const data = await this.db.collection(COLLECTIONS.ANALYTICS_DAILY).aggregate(pipeline).toArray();

    return {
      data,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + limit < total
      }
    };
  }

  /**
   * Build base filter with tenant and role scoping
   */
  private buildBaseFilter(filters?: AnalyticsFilters): any {
    const filter: any = {};

    if (this.tenantId) {
      filter.tenantId = this.tenantId;
    }

    this.applyRoleFilters(filter, filters);

    if (filters?.styleIds && filters.styleIds.length > 0) {
      filter.styleId = { $in: filters.styleIds };
    }

    if (filters?.vendorIds && filters.vendorIds.length > 0) {
      filter.vendorId = { $in: filters.vendorIds };
    }

    if (filters?.tailorIds && filters.tailorIds.length > 0) {
      filter.tailorId = { $in: filters.tailorIds };
    }

    return filter;
  }

  /**
   * Apply role-based filters
   */
  private applyRoleFilters(filter: any, userFilters?: AnalyticsFilters) {
    if (this.userRole === 'vendor' && this.vendorId) {
      filter.vendorId = this.vendorId;
    }

    if (this.userRole === 'tailor' && this.tailorId) {
      filter.tailorId = this.tailorId;
    }

    // Admin and Manager can see all (within tenant)
  }

  /**
   * Individual KPI calculation methods
   */
  private async getCuttingReceived(filter: any, dateRange: any) {
    const result = await this.db.collection(COLLECTIONS.FABRIC_CUTTING).aggregate([
      {
        $match: {
          ...filter,
          createdAt: { $gte: dateRange.start, $lte: dateRange.end }
        }
      },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          pcs: { $sum: '$cuttingReceivedPcs' }
        }
      }
    ]).toArray();

    return result[0] || { orders: 0, pcs: 0 };
  }

  private async getInProduction(filter: any) {
    // Get current in-production count (not date-filtered)
    const result = await this.db.collection(COLLECTIONS.TAILOR_JOBS).aggregate([
      {
        $match: {
          ...filter,
          status: { $in: ['pending', 'in-progress'] }
        }
      },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          pcs: { $sum: { $subtract: [{ $ifNull: ['$issuedPcs', 0] }, { $ifNull: ['$returnedPcs', 0] }] } }
        }
      }
    ]).toArray();

    return result[0] || { orders: 0, pcs: 0 };
  }

  private async getPcsShipped(filter: any, dateRange: any) {
    const result = await this.db.collection(COLLECTIONS.SHIPMENTS).aggregate([
      {
        $match: {
          ...filter,
          date: { $gte: dateRange.start, $lte: dateRange.end }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $ifNull: ['$pcsShipped', 0] } }
        }
      }
    ]).toArray();

    return { total: result[0]?.total || 0 };
  }

  private async getExpectedReceivable(filter: any) {
    const result = await this.db.collection(COLLECTIONS.SHIPMENTS).aggregate([
      {
        $match: {
          ...filter,
          $or: [
            { paymentStatus: { $exists: false } },
            { paymentStatus: null },
            { paymentStatus: { $in: ['pending', 'partial'] } }
          ]
        }
      },
      {
        $lookup: {
          from: COLLECTIONS.STYLES,
          localField: 'styleId',
          foreignField: '_id',
          as: 'style',
        },
      },
      { $unwind: { path: '$style', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: COLLECTIONS.RATES,
          let: { styleId: '$styleId', vendorId: '$vendorId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$styleId', '$$styleId'] },
                    { $eq: ['$vendorId', '$$vendorId'] },
                  ],
                },
              },
            },
          ],
          as: 'rate',
        },
      },
      {
        $unwind: { path: '$rate', preserveNullAndEmptyArrays: true },
      },
      {
        $group: {
          _id: null,
          amount: { 
            $sum: { 
              $multiply: [
                { $ifNull: ['$pcsShipped', 0] }, 
                { $ifNull: ['$rate.vendorRate', 0] }
              ] 
            } 
          }
        }
      }
    ]).toArray();

    return { amount: result[0]?.amount || 0, currency: 'INR' };
  }

  private async getPcsCompleted(filter: any, dateRange: any) {
    const result = await this.db.collection(COLLECTIONS.TAILOR_JOBS).aggregate([
      {
        $match: {
          ...filter,
          status: { $in: ['completed', 'ready-to-ship', 'shipped'] },
          $or: [
            { completedDate: { $gte: dateRange.start, $lte: dateRange.end } },
            { updatedAt: { $gte: dateRange.start, $lte: dateRange.end } }
          ]
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $ifNull: ['$returnedPcs', 0] } }
        }
      }
    ]).toArray();

    return { total: result[0]?.total || 0 };
  }

  private async getTailoringExpense(filter: any, dateRange: any) {
    const result = await this.db.collection(COLLECTIONS.TAILOR_PAYMENTS).aggregate([
      {
        $match: {
          ...filter,
          $or: [
            { paymentDate: { $gte: dateRange.start, $lte: dateRange.end } },
            { paidAt: { $gte: dateRange.start, $lte: dateRange.end } },
            { createdAt: { $gte: dateRange.start, $lte: dateRange.end } }
          ]
        }
      },
      {
        $group: {
          _id: null,
          amount: { $sum: { $ifNull: ['$amount', 0] } }
        }
      }
    ]).toArray();

    return { amount: result[0]?.amount || 0, currency: 'INR' };
  }

  private async getPendingFromTailors(filter: any) {
    const result = await this.db.collection(COLLECTIONS.TAILOR_JOBS).aggregate([
      {
        $match: {
          ...filter,
          status: { $in: ['pending', 'in-progress'] }
        }
      },
      {
        $group: {
          _id: null,
          assignments: { $sum: 1 },
          pcs: { $sum: { $subtract: [{ $ifNull: ['$issuedPcs', 0] }, { $ifNull: ['$returnedPcs', 0] }] } }
        }
      }
    ]).toArray();

    return result[0] || { assignments: 0, pcs: 0 };
  }

  private async getAvgTAT(filter: any, dateRange: any) {
    const result = await this.db.collection(COLLECTIONS.SAMPLE_VERSIONS).aggregate([
      {
        $match: {
          ...filter,
          submittedAt: { $gte: dateRange.start, $lte: dateRange.end, $ne: null },
          requestedAt: { $ne: null }
        }
      },
      {
        $group: {
          _id: null,
          avgTat: {
            $avg: {
              $divide: [
                { $subtract: ['$submittedAt', '$requestedAt'] },
                86400000 // Convert to days
              ]
            }
          }
        }
      }
    ]).toArray();

    return { days: result[0]?.avgTat || 0 };
  }

  private async getApprovalRate(filter: any, dateRange: any) {
    const result = await this.db.collection(COLLECTIONS.SAMPLE_VERSIONS).aggregate([
      {
        $match: {
          ...filter,
          submittedAt: { $gte: dateRange.start, $lte: dateRange.end }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } }
        }
      }
    ]).toArray();

    const total = result[0]?.total || 0;
    const approved = result[0]?.approved || 0;
    const percentage = total > 0 ? (approved / total) * 100 : 0;

    return { percentage };
  }

  private async getProductionYield(filter: any, dateRange: any) {
    const result = await this.db.collection(COLLECTIONS.TAILOR_JOBS).aggregate([
      {
        $match: {
          ...filter,
          $or: [
            { completedDate: { $gte: dateRange.start, $lte: dateRange.end } },
            { updatedAt: { $gte: dateRange.start, $lte: dateRange.end } }
          ]
        }
      },
      {
        $group: {
          _id: null,
          issued: { $sum: { $ifNull: ['$issuedPcs', 0] } },
          returned: { $sum: { $ifNull: ['$returnedPcs', 0] } }
        }
      }
    ]).toArray();

    const issued = result[0]?.issued || 0;
    const returned = result[0]?.returned || 0;
    const percentage = issued > 0 ? (returned / issued) * 100 : 0;

    return { percentage };
  }

  private async getLateShipments(filter: any, dateRange: any) {
    const result = await this.db.collection(COLLECTIONS.SHIPMENTS).aggregate([
      {
        $match: {
          ...filter,
          date: { $gte: dateRange.start, $lte: dateRange.end }
        }
      },
      {
        $project: {
          isLate: {
            $cond: [
              { $and: [{ $ne: ['$promisedDate', null] }, { $gt: ['$date', '$promisedDate'] }] },
              1,
              0
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          late: { $sum: '$isLate' }
        }
      }
    ]).toArray();

    const total = result[0]?.total || 0;
    const late = result[0]?.late || 0;
    const percentage = total > 0 ? (late / total) * 100 : 0;

    return { count: late, percentage };
  }

  private async getInventoryTurnover(filter: any) {
    // Simplified calculation - can be enhanced
    return { ratio: 0 };
  }

  private async getReworkRate(filter: any, dateRange: any) {
    const result = await this.db.collection(COLLECTIONS.TAILOR_JOBS).aggregate([
      {
        $match: {
          ...filter,
          $or: [
            { completedDate: { $gte: dateRange.start, $lte: dateRange.end } },
            { updatedAt: { $gte: dateRange.start, $lte: dateRange.end } }
          ]
        }
      },
      {
        $group: {
          _id: null,
          returned: { $sum: { $ifNull: ['$returnedPcs', 0] } },
          rejected: { $sum: { $ifNull: ['$rejectedPcs', 0] } }
        }
      }
    ]).toArray();

    const returned = result[0]?.returned || 0;
    const rejected = result[0]?.rejected || 0;
    const percentage = returned > 0 ? (rejected / returned) * 100 : 0;

    return { percentage };
  }

  /**
   * Get previous period KPIs for trend calculation
   */
  private async getPreviousPeriodKPIs(filters?: AnalyticsFilters): Promise<DashboardKPIs> {
    const dateRange = filters?.dateRange || {
      start: subDays(new Date(), 30),
      end: new Date()
    };

    const daysDiff = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    const prevDateRange = {
      start: subDays(dateRange.start, daysDiff),
      end: subDays(dateRange.end, daysDiff)
    };

    const prevFilters = {
      ...filters,
      dateRange: prevDateRange
    };

    return this.getDashboardKPIs(prevFilters);
  }

  /**
   * Helper methods
   */
  private calculateTrend(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  private getTrendDirection(current: number, previous: number, inverse = false): 'up' | 'down' | 'neutral' {
    const diff = current - previous;
    if (Math.abs(diff) < 0.01) return 'neutral';
    
    if (inverse) {
      return diff < 0 ? 'up' : 'down';
    }
    return diff > 0 ? 'up' : 'down';
  }

  private getFieldExpression(fieldPath: string): any {
    if (fieldPath.includes('.')) {
      return `$${fieldPath}`;
    }
    return `$${fieldPath}`;
  }

  private getMetricField(metric: string): any {
    const metricMap: Record<string, any> = {
      shippedPcs: '$pcsShipped',
      completedPcs: '$pcsCompleted',
      cuttingReceived: '$cuttingReceived.pcs',
      tailorExpense: '$tailorExpense.amount',
      revenue: '$revenue.amount'
    };
    return metricMap[metric] || `$${metric}`;
  }

  private async enrichBreakdownItems(results: any[], groupBy: string): Promise<BreakdownItem[]> {
    const collectionMap: Record<string, string> = {
      style: COLLECTIONS.STYLES,
      vendor: COLLECTIONS.VENDORS,
      tailor: COLLECTIONS.TAILOR_JOBS
    };

    const collection = collectionMap[groupBy];
    if (!collection) return results.map((r: any) => ({ key: r._id, label: r._id as string, value: r.value }));

    const ids = results.map((r: any) => r._id).filter(Boolean);
    const docs = await this.db.collection(collection)
      .find({ _id: { $in: ids } })
      .project({ _id: 1, name: 1, code: 1 })
      .toArray();

    const labelMap = new Map(docs.map((d: any) => [d._id.toString(), d.name || d.code || d._id.toString()]));

    return results.map((r: any) => ({
      key: r._id?.toString() || 'unknown',
      label: (labelMap.get(r._id?.toString()) || 'Unknown') as string,
      value: r.value
    }));
  }
}
