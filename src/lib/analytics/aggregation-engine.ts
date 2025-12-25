import { ObjectId } from 'mongodb';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { AnalyticsAggregate, AnalyticsFilters } from './models';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, format } from 'date-fns';

/**
 * Comprehensive Analytics Aggregation Engine
 * Builds daily/weekly/monthly aggregates for all KPIs
 */

export class AnalyticsAggregationEngine {
  private db: any;
  private tenantId?: ObjectId;

  constructor(tenantId?: string) {
    this.tenantId = tenantId ? new ObjectId(tenantId) : undefined;
  }

  async init() {
    this.db = await getDb();
  }

  /**
   * Main ETL function - refreshes all aggregates for a date range
   */
  async refreshAggregates(
    startDate: Date,
    endDate: Date,
    period: 'daily' | 'weekly' | 'monthly' = 'daily'
  ) {
    await this.init();
    
    console.log(`[ETL] Starting ${period} aggregation from ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);
    
    const dateRanges = this.generateDateRanges(startDate, endDate, period);
    const results = [];

    for (const range of dateRanges) {
      const aggregate = await this.buildAggregateForPeriod(range.start, range.end, period, range.label);
      results.push(aggregate);
    }

    // Bulk upsert aggregates
    if (results.length > 0) {
      await this.saveAggregates(results.flat(), period);
    }

    console.log(`[ETL] Completed ${period} aggregation. Processed ${results.length} periods.`);
    return { success: true, count: results.length };
  }

  /**
   * Build aggregate for a single period
   */
  private async buildAggregateForPeriod(
    startDate: Date,
    endDate: Date,
    period: 'daily' | 'weekly' | 'monthly',
    label: string
  ): Promise<AnalyticsAggregate[]> {
    const baseFilter: any = {
      createdAt: { $gte: startDate, $lte: endDate }
    };

    if (this.tenantId) {
      baseFilter.tenantId = this.tenantId;
    }

    // Aggregate by style (can extend to vendor, tailor, etc.)
    const aggregates: AnalyticsAggregate[] = [];

    // Get all styles for the period
    const styles = await this.db.collection(COLLECTIONS.STYLES)
      .find(this.tenantId ? { tenantId: this.tenantId } : {})
      .project({ _id: 1, code: 1, vendorId: 1 })
      .toArray();

    for (const style of styles) {
      const styleFilter = { ...baseFilter, styleId: style._id };
      
      const aggregate: AnalyticsAggregate = {
        tenantId: this.tenantId,
        period,
        date: label,
        styleId: style._id,
        vendorId: style.vendorId,
        
        cuttingReceived: await this.calculateCuttingReceived(styleFilter),
        inProduction: await this.calculateInProduction(style._id, startDate, endDate),
        pcsShipped: await this.calculatePcsShipped(styleFilter),
        pcsCompleted: await this.calculatePcsCompleted(styleFilter),
        revenue: await this.calculateRevenue(styleFilter),
        expectedReceivable: await this.calculateExpectedReceivable(style._id),
        tailorExpense: await this.calculateTailorExpense(styleFilter),
        pendingFromTailors: await this.calculatePendingFromTailors(style._id),
        samples: await this.calculateSampleMetrics(styleFilter),
        qc: await this.calculateQCMetrics(styleFilter),
        shipments: await this.calculateShipmentMetrics(styleFilter),
        efficiency: await this.calculateEfficiency(styleFilter),
        fabricConsumption: await this.calculateFabricConsumption(styleFilter),
        
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      aggregates.push(aggregate);
    }

    // Also create tenant-level aggregate (no style grouping)
    const tenantAggregate = await this.buildTenantLevelAggregate(startDate, endDate, period, label);
    aggregates.push(tenantAggregate);

    return aggregates;
  }

  /**
   * Calculate Cutting Received (orders & pcs)
   */
  private async calculateCuttingReceived(filter: any) {
    const result = await this.db.collection(COLLECTIONS.FABRIC_CUTTING).aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          pcs: { $sum: '$cuttingReceivedPcs' }
        }
      }
    ]).toArray();

    return result[0] ? { orders: result[0].orders, pcs: result[0].pcs } : { orders: 0, pcs: 0 };
  }

  /**
   * Calculate In Production (current snapshot, not historical)
   */
  private async calculateInProduction(styleId: ObjectId, startDate: Date, endDate: Date) {
    const result = await this.db.collection(COLLECTIONS.TAILOR_JOBS).aggregate([
      {
        $match: {
          styleId,
          status: { $in: ['issued', 'in_progress'] },
          issueDate: { $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          pcs: { $sum: { $subtract: ['$issuedPcs', { $ifNull: ['$returnedPcs', 0] }] } }
        }
      }
    ]).toArray();

    return result[0] ? { orders: result[0].orders, pcs: result[0].pcs } : { orders: 0, pcs: 0 };
  }

  /**
   * Calculate PCS Shipped
   */
  private async calculatePcsShipped(filter: any) {
    const result = await this.db.collection(COLLECTIONS.SHIPMENTS).aggregate([
      {
        $match: {
          ...filter,
          shippedAt: filter.createdAt // Use shippedAt for date filtering
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$shippedQty' }
        }
      }
    ]).toArray();

    return result[0]?.total || 0;
  }

  /**
   * Calculate PCS Completed
   */
  private async calculatePcsCompleted(filter: any) {
    const result = await this.db.collection(COLLECTIONS.TAILOR_JOBS).aggregate([
      {
        $match: {
          ...filter,
          status: 'completed',
          completedAt: filter.createdAt
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$returnedPcs' }
        }
      }
    ]).toArray();

    return result[0]?.total || 0;
  }

  /**
   * Calculate Revenue
   */
  private async calculateRevenue(filter: any) {
    const result = await this.db.collection(COLLECTIONS.SHIPMENTS).aggregate([
      {
        $match: {
          ...filter,
          shippedAt: filter.createdAt,
          status: { $in: ['shipped', 'delivered'] }
        }
      },
      {
        $group: {
          _id: null,
          amount: { $sum: '$invoiceValue' }
        }
      }
    ]).toArray();

    return { amount: result[0]?.amount || 0, currency: 'INR' };
  }

  /**
   * Calculate Expected Receivable
   */
  private async calculateExpectedReceivable(styleId: ObjectId) {
    const result = await this.db.collection(COLLECTIONS.SHIPMENTS).aggregate([
      {
        $match: {
          styleId,
          paymentStatus: { $in: ['pending', 'partial'] }
        }
      },
      {
        $group: {
          _id: null,
          amount: { $sum: '$invoiceValue' },
          invoices: { $sum: 1 }
        }
      }
    ]).toArray();

    return result[0] ? { amount: result[0].amount, invoices: result[0].invoices } : { amount: 0, invoices: 0 };
  }

  /**
   * Calculate Tailor Expense
   */
  private async calculateTailorExpense(filter: any) {
    const result = await this.db.collection(COLLECTIONS.TAILOR_PAYMENTS).aggregate([
      {
        $match: {
          ...filter,
          paidAt: filter.createdAt
        }
      },
      {
        $group: {
          _id: null,
          amount: { $sum: '$amount' },
          payments: { $sum: 1 }
        }
      }
    ]).toArray();

    return result[0] ? { amount: result[0].amount, payments: result[0].payments } : { amount: 0, payments: 0 };
  }

  /**
   * Calculate Pending from Tailors
   */
  private async calculatePendingFromTailors(styleId: ObjectId) {
    const result = await this.db.collection(COLLECTIONS.TAILOR_JOBS).aggregate([
      {
        $match: {
          styleId,
          status: { $in: ['issued', 'in_progress'] }
        }
      },
      {
        $group: {
          _id: null,
          assignments: { $sum: 1 },
          pcs: { $sum: { $subtract: ['$issuedPcs', { $ifNull: ['$returnedPcs', 0] }] } }
        }
      }
    ]).toArray();

    return result[0] ? { assignments: result[0].assignments, pcs: result[0].pcs } : { assignments: 0, pcs: 0 };
  }

  /**
   * Calculate Sample Metrics (TAT, Approval Rate)
   */
  private async calculateSampleMetrics(filter: any) {
    const samples = await this.db.collection(COLLECTIONS.SAMPLE_VERSIONS).aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          requested: { $sum: 1 },
          submitted: { $sum: { $cond: [{ $ne: ['$submittedAt', null] }, 1, 0] } },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
          avgTat: {
            $avg: {
              $cond: [
                { $and: [{ $ne: ['$requestedAt', null] }, { $ne: ['$submittedAt', null] }] },
                { $divide: [{ $subtract: ['$submittedAt', '$requestedAt'] }, 86400000] }, // Convert to days
                null
              ]
            }
          }
        }
      }
    ]).toArray();

    const result = samples[0] || { requested: 0, submitted: 0, approved: 0, rejected: 0, avgTat: 0 };
    const approvalRate = result.submitted > 0 ? (result.approved / result.submitted) * 100 : 0;

    return {
      requested: result.requested,
      submitted: result.submitted,
      approved: result.approved,
      rejected: result.rejected,
      avgTatDays: result.avgTat || 0,
      approvalRate
    };
  }

  /**
   * Calculate QC Metrics
   */
  private async calculateQCMetrics(filter: any) {
    const qc = await this.db.collection(COLLECTIONS.QC_INSPECTIONS).aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          inspections: { $sum: 1 },
          passed: { $sum: { $cond: [{ $eq: ['$result', 'passed'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$result', 'failed'] }, 1, 0] } }
        }
      }
    ]).toArray();

    const result = qc[0] || { inspections: 0, passed: 0, failed: 0 };
    const passRate = result.inspections > 0 ? (result.passed / result.inspections) * 100 : 0;

    return {
      inspections: result.inspections,
      passed: result.passed,
      failed: result.failed,
      passRate
    };
  }

  /**
   * Calculate Shipment Metrics (On-time, Late)
   */
  private async calculateShipmentMetrics(filter: any) {
    const shipments = await this.db.collection(COLLECTIONS.SHIPMENTS).aggregate([
      { $match: { ...filter, shippedAt: filter.createdAt } },
      {
        $project: {
          isLate: {
            $cond: [
              { $and: [{ $ne: ['$promisedDate', null] }, { $gt: ['$shippedAt', '$promisedDate'] }] },
              1,
              0
            ]
          },
          delayDays: {
            $cond: [
              { $and: [{ $ne: ['$promisedDate', null] }, { $gt: ['$shippedAt', '$promisedDate'] }] },
              { $divide: [{ $subtract: ['$shippedAt', '$promisedDate'] }, 86400000] },
              0
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          late: { $sum: '$isLate' },
          avgDelayDays: { $avg: '$delayDays' }
        }
      }
    ]).toArray();

    const result = shipments[0] || { count: 0, late: 0, avgDelayDays: 0 };
    const onTime = result.count - result.late;
    const lateRate = result.count > 0 ? (result.late / result.count) * 100 : 0;

    return {
      count: result.count,
      onTime,
      late: result.late,
      lateRate,
      avgDelayDays: result.avgDelayDays
    };
  }

  /**
   * Calculate Production Efficiency
   */
  private async calculateEfficiency(filter: any) {
    const jobs = await this.db.collection(COLLECTIONS.TAILOR_JOBS).aggregate([
      { $match: { ...filter } },
      {
        $group: {
          _id: null,
          totalIssued: { $sum: '$issuedPcs' },
          totalReturned: { $sum: { $ifNull: ['$returnedPcs', 0] } },
          totalRejected: { $sum: { $ifNull: ['$rejectedPcs', 0] } }
        }
      }
    ]).toArray();

    const result = jobs[0] || { totalIssued: 0, totalReturned: 0, totalRejected: 0 };
    const yieldRate = result.totalIssued > 0 ? (result.totalReturned / result.totalIssued) * 100 : 0;
    const defectRate = result.totalReturned > 0 ? (result.totalRejected / result.totalReturned) * 100 : 0;
    const reworkRate = result.totalIssued > 0 ? ((result.totalIssued - result.totalReturned + result.totalRejected) / result.totalIssued) * 100 : 0;

    return {
      yieldRate,
      reworkRate,
      defectRate
    };
  }

  /**
   * Calculate Fabric Consumption
   */
  private async calculateFabricConsumption(filter: any) {
    const fabric = await this.db.collection(COLLECTIONS.FABRIC_CUTTING).aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          meters: { $sum: '$fabricReceivedMeters' },
          wastage: { $sum: { $ifNull: ['$wastageMeters', 0] } }
        }
      }
    ]).toArray();

    return fabric[0] ? { meters: fabric[0].meters, wastage: fabric[0].wastage } : { meters: 0, wastage: 0 };
  }

  /**
   * Build tenant-level aggregate (all styles combined)
   */
  private async buildTenantLevelAggregate(
    startDate: Date,
    endDate: Date,
    period: 'daily' | 'weekly' | 'monthly',
    label: string
  ): Promise<AnalyticsAggregate> {
    const baseFilter: any = {
      createdAt: { $gte: startDate, $lte: endDate }
    };

    if (this.tenantId) {
      baseFilter.tenantId = this.tenantId;
    }

    return {
      tenantId: this.tenantId,
      period,
      date: label,
      
      cuttingReceived: await this.calculateCuttingReceived(baseFilter),
      inProduction: await this.calculateInProductionTenant(startDate, endDate),
      pcsShipped: await this.calculatePcsShipped(baseFilter),
      pcsCompleted: await this.calculatePcsCompleted(baseFilter),
      revenue: await this.calculateRevenue(baseFilter),
      expectedReceivable: await this.calculateExpectedReceivableTenant(),
      tailorExpense: await this.calculateTailorExpense(baseFilter),
      pendingFromTailors: await this.calculatePendingFromTailorsTenant(),
      samples: await this.calculateSampleMetrics(baseFilter),
      qc: await this.calculateQCMetrics(baseFilter),
      shipments: await this.calculateShipmentMetrics(baseFilter),
      efficiency: await this.calculateEfficiency(baseFilter),
      fabricConsumption: await this.calculateFabricConsumption(baseFilter),
      
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private async calculateInProductionTenant(startDate: Date, endDate: Date) {
    const filter: any = {
      status: { $in: ['issued', 'in_progress'] },
      issueDate: { $lte: endDate }
    };

    if (this.tenantId) {
      // Need to join with styles to filter by tenant
      const result = await this.db.collection(COLLECTIONS.TAILOR_JOBS).aggregate([
        { $match: filter },
        {
          $lookup: {
            from: COLLECTIONS.STYLES,
            localField: 'styleId',
            foreignField: '_id',
            as: 'style'
          }
        },
        { $unwind: '$style' },
        { $match: { 'style.tenantId': this.tenantId } },
        {
          $group: {
            _id: null,
            orders: { $sum: 1 },
            pcs: { $sum: { $subtract: ['$issuedPcs', { $ifNull: ['$returnedPcs', 0] }] } }
          }
        }
      ]).toArray();

      return result[0] ? { orders: result[0].orders, pcs: result[0].pcs } : { orders: 0, pcs: 0 };
    }

    const result = await this.db.collection(COLLECTIONS.TAILOR_JOBS).aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          pcs: { $sum: { $subtract: ['$issuedPcs', { $ifNull: ['$returnedPcs', 0] }] } }
        }
      }
    ]).toArray();

    return result[0] ? { orders: result[0].orders, pcs: result[0].pcs } : { orders: 0, pcs: 0 };
  }

  private async calculateExpectedReceivableTenant() {
    const filter: any = {
      paymentStatus: { $in: ['pending', 'partial'] }
    };

    if (this.tenantId) {
      filter.tenantId = this.tenantId;
    }

    const result = await this.db.collection(COLLECTIONS.SHIPMENTS).aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          amount: { $sum: '$invoiceValue' },
          invoices: { $sum: 1 }
        }
      }
    ]).toArray();

    return result[0] ? { amount: result[0].amount, invoices: result[0].invoices } : { amount: 0, invoices: 0 };
  }

  private async calculatePendingFromTailorsTenant() {
    const filter: any = {
      status: { $in: ['issued', 'in_progress'] }
    };

    if (this.tenantId) {
      const result = await this.db.collection(COLLECTIONS.TAILOR_JOBS).aggregate([
        { $match: filter },
        {
          $lookup: {
            from: COLLECTIONS.STYLES,
            localField: 'styleId',
            foreignField: '_id',
            as: 'style'
          }
        },
        { $unwind: '$style' },
        { $match: { 'style.tenantId': this.tenantId } },
        {
          $group: {
            _id: null,
            assignments: { $sum: 1 },
            pcs: { $sum: { $subtract: ['$issuedPcs', { $ifNull: ['$returnedPcs', 0] }] } }
          }
        }
      ]).toArray();

      return result[0] ? { assignments: result[0].assignments, pcs: result[0].pcs } : { assignments: 0, pcs: 0 };
    }

    const result = await this.db.collection(COLLECTIONS.TAILOR_JOBS).aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          assignments: { $sum: 1 },
          pcs: { $sum: { $subtract: ['$issuedPcs', { $ifNull: ['$returnedPcs', 0] }] } }
        }
      }
    ]).toArray();

    return result[0] ? { assignments: result[0].assignments, pcs: result[0].pcs } : { assignments: 0, pcs: 0 };
  }

  /**
   * Save aggregates to database
   */
  private async saveAggregates(aggregates: AnalyticsAggregate[], period: string) {
    const collectionName = period === 'daily' 
      ? COLLECTIONS.ANALYTICS_DAILY 
      : period === 'weekly'
      ? COLLECTIONS.ANALYTICS_WEEKLY
      : COLLECTIONS.ANALYTICS_MONTHLY;

    const operations = aggregates.map(agg => ({
      updateOne: {
        filter: {
          tenantId: agg.tenantId || null,
          period: agg.period,
          date: agg.date,
          styleId: agg.styleId || null,
          vendorId: agg.vendorId || null
        },
        update: { $set: agg },
        upsert: true
      }
    }));

    await this.db.collection(collectionName).bulkWrite(operations);
  }

  /**
   * Generate date ranges for the given period
   */
  private generateDateRanges(
    startDate: Date,
    endDate: Date,
    period: 'daily' | 'weekly' | 'monthly'
  ): Array<{ start: Date; end: Date; label: string }> {
    const ranges: Array<{ start: Date; end: Date; label: string }> = [];
    let current = new Date(startDate);

    while (current <= endDate) {
      let rangeStart: Date;
      let rangeEnd: Date;
      let label: string;

      if (period === 'daily') {
        rangeStart = startOfDay(current);
        rangeEnd = endOfDay(current);
        label = format(current, 'yyyy-MM-dd');
        current = new Date(current.setDate(current.getDate() + 1));
      } else if (period === 'weekly') {
        rangeStart = startOfWeek(current, { weekStartsOn: 1 });
        rangeEnd = endOfWeek(current, { weekStartsOn: 1 });
        label = format(rangeStart, 'yyyy-\'W\'II');
        current = new Date(current.setDate(current.getDate() + 7));
      } else {
        rangeStart = startOfMonth(current);
        rangeEnd = endOfMonth(current);
        label = format(current, 'yyyy-MM');
        current = new Date(current.setMonth(current.getMonth() + 1));
      }

      ranges.push({ start: rangeStart, end: rangeEnd, label });
    }

    return ranges;
  }
}

/**
 * Helper function for quick daily refresh (called by cron)
 */
export async function refreshDailyAnalytics(tenantId?: string, date: Date = new Date()) {
  const engine = new AnalyticsAggregationEngine(tenantId);
  return await engine.refreshAggregates(startOfDay(date), endOfDay(date), 'daily');
}

/**
 * Helper function for weekly refresh
 */
export async function refreshWeeklyAnalytics(tenantId?: string, date: Date = new Date()) {
  const engine = new AnalyticsAggregationEngine(tenantId);
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
  return await engine.refreshAggregates(weekStart, weekEnd, 'weekly');
}

/**
 * Helper function for monthly refresh
 */
export async function refreshMonthlyAnalytics(tenantId?: string, date: Date = new Date()) {
  const engine = new AnalyticsAggregationEngine(tenantId);
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  return await engine.refreshAggregates(monthStart, monthEnd, 'monthly');
}
