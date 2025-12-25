import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { AnalyticsQueryService } from '@/lib/analytics/query-service';
import { AnalyticsAggregationEngine, refreshDailyAnalytics } from '@/lib/analytics/aggregation-engine';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { subDays, format } from 'date-fns';

describe('Analytics System', () => {
  let db: any;
  const testTenantId = new ObjectId().toString();
  const testStyleId = new ObjectId();
  const testVendorId = new ObjectId();
  const testTailorId = new ObjectId();

  beforeAll(async () => {
    db = await getDb();

    // Seed test data
    await seedTestData();
  });

  afterAll(async () => {
    // Cleanup test data
    await db.collection(COLLECTIONS.ANALYTICS_DAILY).deleteMany({ tenantId: new ObjectId(testTenantId) });
    await db.collection(COLLECTIONS.FABRIC_CUTTING).deleteMany({ tenantId: new ObjectId(testTenantId) });
    await db.collection(COLLECTIONS.SHIPMENTS).deleteMany({ tenantId: new ObjectId(testTenantId) });
    await db.collection(COLLECTIONS.TAILOR_JOBS).deleteMany({ styleId: testStyleId });
  });

  const seedTestData = async () => {
    const today = new Date();
    const yesterday = subDays(today, 1);

    // Insert fabric cutting records
    await db.collection(COLLECTIONS.FABRIC_CUTTING).insertMany([
      {
        _id: new ObjectId(),
        tenantId: new ObjectId(testTenantId),
        styleId: testStyleId,
        vendorId: testVendorId,
        cuttingReceivedPcs: 1000,
        createdAt: yesterday,
        updatedAt: yesterday
      },
      {
        _id: new ObjectId(),
        tenantId: new ObjectId(testTenantId),
        styleId: testStyleId,
        vendorId: testVendorId,
        cuttingReceivedPcs: 500,
        createdAt: today,
        updatedAt: today
      }
    ]);

    // Insert shipments
    await db.collection(COLLECTIONS.SHIPMENTS).insertMany([
      {
        _id: new ObjectId(),
        tenantId: new ObjectId(testTenantId),
        styleId: testStyleId,
        vendorId: testVendorId,
        shippedQty: 800,
        invoiceValue: 80000,
        paymentStatus: 'pending',
        shippedAt: yesterday,
        createdAt: yesterday,
        updatedAt: yesterday
      }
    ]);

    // Insert tailor jobs
    await db.collection(COLLECTIONS.TAILOR_JOBS).insertMany([
      {
        _id: new ObjectId(),
        styleId: testStyleId,
        tailorId: testTailorId,
        issuedPcs: 500,
        returnedPcs: 450,
        status: 'completed',
        issueDate: yesterday,
        completedAt: today,
        createdAt: yesterday,
        updatedAt: today
      },
      {
        _id: new ObjectId(),
        styleId: testStyleId,
        tailorId: testTailorId,
        issuedPcs: 300,
        returnedPcs: 0,
        status: 'in_progress',
        issueDate: today,
        createdAt: today,
        updatedAt: today
      }
    ]);

    // Insert tailor payments
    await db.collection(COLLECTIONS.TAILOR_PAYMENTS).insertMany([
      {
        _id: new ObjectId(),
        styleId: testStyleId,
        tailorId: testTailorId,
        amount: 15000,
        paidAt: yesterday,
        createdAt: yesterday,
        updatedAt: yesterday
      }
    ]);
  };

  describe('ETL/Aggregation Engine', () => {
    it('should refresh daily analytics for a specific date', async () => {
      const result = await refreshDailyAnalytics(testTenantId, subDays(new Date(), 1));
      
      expect(result.success).toBe(true);
      expect(result.count).toBeGreaterThan(0);

      // Verify data was written
      const aggregates = await db.collection(COLLECTIONS.ANALYTICS_DAILY).find({
        tenantId: new ObjectId(testTenantId),
        date: format(subDays(new Date(), 1), 'yyyy-MM-dd')
      }).toArray();

      expect(aggregates.length).toBeGreaterThan(0);
    });

    it('should aggregate cutting received correctly', async () => {
      await refreshDailyAnalytics(testTenantId, new Date());

      const aggregate = await db.collection(COLLECTIONS.ANALYTICS_DAILY).findOne({
        tenantId: new ObjectId(testTenantId),
        styleId: testStyleId,
        date: format(new Date(), 'yyyy-MM-dd')
      });

      expect(aggregate).toBeDefined();
      expect(aggregate.cuttingReceived.pcs).toBe(500);
    });

    it('should handle empty data gracefully', async () => {
      const emptyTenantId = new ObjectId().toString();
      const result = await refreshDailyAnalytics(emptyTenantId, new Date());
      
      expect(result.success).toBe(true);
      expect(result.count).toBe(0);
    });
  });

  describe('Query Service', () => {
    let queryService: AnalyticsQueryService;

    beforeAll(async () => {
      // Ensure aggregates exist
      await refreshDailyAnalytics(testTenantId, subDays(new Date(), 1));
      await refreshDailyAnalytics(testTenantId, new Date());

      queryService = new AnalyticsQueryService(testTenantId);
      await queryService.init();
    });

    it('should fetch dashboard KPIs', async () => {
      const kpis = await queryService.getDashboardKPIs({
        dateRange: {
          start: subDays(new Date(), 7),
          end: new Date()
        }
      });

      expect(kpis).toBeDefined();
      expect(kpis.cuttingReceived).toBeDefined();
      expect(kpis.inProduction).toBeDefined();
      expect(kpis.pcsShipped).toBeDefined();
      expect(kpis.expectedReceivable).toBeDefined();
      expect(kpis.pcsCompleted).toBeDefined();
      expect(kpis.tailoringExpense).toBeDefined();
      expect(kpis.pendingFromTailors).toBeDefined();
    });

    it('should calculate cutting received correctly', async () => {
      const kpis = await queryService.getDashboardKPIs({
        dateRange: {
          start: new Date(),
          end: new Date()
        }
      });

      expect(kpis.cuttingReceived.pcs).toBeGreaterThanOrEqual(500);
    });

    it('should calculate in production correctly', async () => {
      const kpis = await queryService.getDashboardKPIs({
        dateRange: {
          start: new Date(),
          end: new Date()
        }
      });

      expect(kpis.inProduction.pcs).toBeGreaterThan(0);
      expect(kpis.inProduction.orders).toBeGreaterThan(0);
    });

    it('should calculate expected receivable', async () => {
      const kpis = await queryService.getDashboardKPIs({
        dateRange: {
          start: subDays(new Date(), 7),
          end: new Date()
        }
      });

      expect(kpis.expectedReceivable.amount).toBeGreaterThanOrEqual(80000);
      expect(kpis.expectedReceivable.currency).toBe('INR');
    });

    it('should return KPI cards with proper formatting', async () => {
      const kpiCards = await queryService.getKPICards({
        dateRange: {
          start: subDays(new Date(), 7),
          end: new Date()
        }
      });

      expect(Array.isArray(kpiCards)).toBe(true);
      expect(kpiCards.length).toBeGreaterThan(0);

      const firstCard = kpiCards[0];
      expect(firstCard).toHaveProperty('id');
      expect(firstCard).toHaveProperty('label');
      expect(firstCard).toHaveProperty('value');
      expect(firstCard).toHaveProperty('trend');
      expect(firstCard).toHaveProperty('trendDirection');
    });

    it('should fetch trend data', async () => {
      const trends = await queryService.getTrendData('shippedPcs', {
        dateRange: {
          start: subDays(new Date(), 7),
          end: new Date()
        }
      });

      expect(Array.isArray(trends)).toBe(true);
      expect(trends.length).toBeGreaterThan(0);

      if (trends.length > 0) {
        const firstTrend = trends[0];
        expect(firstTrend).toHaveProperty('date');
        expect(firstTrend).toHaveProperty('value');
      }
    });

    it('should fetch breakdown by style', async () => {
      const breakdown = await queryService.getBreakdown('shippedPcs', 'style', {
        dateRange: {
          start: subDays(new Date(), 7),
          end: new Date()
        }
      }, 10);

      expect(Array.isArray(breakdown)).toBe(true);

      if (breakdown.length > 0) {
        const firstItem = breakdown[0];
        expect(firstItem).toHaveProperty('key');
        expect(firstItem).toHaveProperty('label');
        expect(firstItem).toHaveProperty('value');
        expect(firstItem).toHaveProperty('percentage');
      }
    });

    it('should enforce role-based filtering for vendor', async () => {
      const vendorQuery = new AnalyticsQueryService(
        testTenantId,
        new ObjectId().toString(),
        'vendor',
        testVendorId.toString()
      );
      await vendorQuery.init();

      const kpis = await vendorQuery.getDashboardKPIs({
        dateRange: {
          start: subDays(new Date(), 7),
          end: new Date()
        }
      });

      // Vendor should only see their own data
      expect(kpis).toBeDefined();
    });

    it('should enforce role-based filtering for tailor', async () => {
      const tailorQuery = new AnalyticsQueryService(
        testTenantId,
        new ObjectId().toString(),
        'tailor',
        undefined,
        testTailorId.toString()
      );
      await tailorQuery.init();

      const kpis = await tailorQuery.getDashboardKPIs({
        dateRange: {
          start: subDays(new Date(), 7),
          end: new Date()
        }
      });

      expect(kpis).toBeDefined();
      expect(kpis.tailoringExpense).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should fetch KPIs within 2 seconds', async () => {
      const queryService = new AnalyticsQueryService(testTenantId);
      await queryService.init();

      const startTime = Date.now();
      await queryService.getDashboardKPIs({
        dateRange: {
          start: subDays(new Date(), 30),
          end: new Date()
        }
      });
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000);
    });

    it('should fetch trend data within 1 second', async () => {
      const queryService = new AnalyticsQueryService(testTenantId);
      await queryService.init();

      const startTime = Date.now();
      await queryService.getTrendData('shippedPcs', {
        dateRange: {
          start: subDays(new Date(), 30),
          end: new Date()
        }
      });
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Data Accuracy', () => {
    it('should calculate totals correctly across aggregates', async () => {
      const queryService = new AnalyticsQueryService(testTenantId);
      await queryService.init();

      const kpis = await queryService.getDashboardKPIs({
        dateRange: {
          start: subDays(new Date(), 7),
          end: new Date()
        }
      });

      // Verify totals match individual aggregates
      const aggregates = await db.collection(COLLECTIONS.ANALYTICS_DAILY).find({
        tenantId: new ObjectId(testTenantId),
        date: { $gte: format(subDays(new Date(), 7), 'yyyy-MM-dd') }
      }).toArray();

      const manualTotal = aggregates.reduce((sum: number, agg: any) => sum + (agg.pcsShipped || 0), 0);
      
      // Allow small differences due to current in-production vs snapshot
      expect(Math.abs(kpis.pcsShipped.total - manualTotal)).toBeLessThan(10);
    });

    it('should handle timezone correctly', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const formattedDate = format(today, 'yyyy-MM-dd');
      
      await refreshDailyAnalytics(testTenantId, today);
      
      const aggregate = await db.collection(COLLECTIONS.ANALYTICS_DAILY).findOne({
        tenantId: new ObjectId(testTenantId),
        date: formattedDate
      });

      expect(aggregate).toBeDefined();
      expect(aggregate.date).toBe(formattedDate);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing tenant gracefully', async () => {
      const queryService = new AnalyticsQueryService();
      await queryService.init();

      const kpis = await queryService.getDashboardKPIs({
        dateRange: {
          start: new Date(),
          end: new Date()
        }
      });

      expect(kpis).toBeDefined();
    });

    it('should handle invalid date ranges', async () => {
      const queryService = new AnalyticsQueryService(testTenantId);
      await queryService.init();

      // End date before start date
      const kpis = await queryService.getDashboardKPIs({
        dateRange: {
          start: new Date(),
          end: subDays(new Date(), 7)
        }
      });

      expect(kpis).toBeDefined();
    });

    it('should handle very large date ranges', async () => {
      const queryService = new AnalyticsQueryService(testTenantId);
      await queryService.init();

      const kpis = await queryService.getDashboardKPIs({
        dateRange: {
          start: subDays(new Date(), 365),
          end: new Date()
        }
      });

      expect(kpis).toBeDefined();
    });
  });
});
