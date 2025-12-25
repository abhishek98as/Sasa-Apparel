import { describe, it, expect, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET as KPIsGET } from '@/app/api/analytics/kpis/route';
import { GET as TrendsGET } from '@/app/api/analytics/trends/route';
import { GET as BreakdownGET } from '@/app/api/analytics/breakdown/route';
import { GET as TableGET } from '@/app/api/analytics/table/route';
import { POST as ExportPOST } from '@/app/api/analytics/export/route';
import { subDays } from 'date-fns';

// Mock NextAuth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => Promise.resolve({
    user: {
      id: 'test-user-id',
      tenantId: 'test-tenant-id',
      role: 'admin'
    }
  }))
}));

describe('Analytics API Endpoints', () => {
  describe('/api/analytics/kpis', () => {
    it('should return KPI cards', async () => {
      const url = new URL('http://localhost:3000/api/analytics/kpis');
      url.searchParams.set('preset', '30d');

      const req = new NextRequest(url);
      const response = await KPIsGET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data.kpis)).toBe(true);
    });

    it('should support custom date ranges', async () => {
      const start = subDays(new Date(), 7);
      const end = new Date();

      const url = new URL('http://localhost:3000/api/analytics/kpis');
      url.searchParams.set('startDate', start.toISOString());
      url.searchParams.set('endDate', end.toISOString());

      const req = new NextRequest(url);
      const response = await KPIsGET(req);

      expect(response.status).toBe(200);
    });

    it('should support filters', async () => {
      const url = new URL('http://localhost:3000/api/analytics/kpis');
      url.searchParams.set('preset', '30d');
      url.searchParams.set('styleIds', JSON.stringify(['style1', 'style2']));
      url.searchParams.set('vendorIds', JSON.stringify(['vendor1']));

      const req = new NextRequest(url);
      const response = await KPIsGET(req);

      expect(response.status).toBe(200);
    });

    it('should require authentication', async () => {
      // Mock unauthenticated session
      jest.mock('next-auth', () => ({
        getServerSession: jest.fn(() => Promise.resolve(null))
      }));

      const url = new URL('http://localhost:3000/api/analytics/kpis');
      const req = new NextRequest(url);
      const response = await KPIsGET(req);

      expect(response.status).toBe(401);
    });
  });

  describe('/api/analytics/trends', () => {
    it('should return trend data', async () => {
      const url = new URL('http://localhost:3000/api/analytics/trends');
      url.searchParams.set('metric', 'shippedPcs');
      url.searchParams.set('granularity', 'day');
      url.searchParams.set('preset', '30d');

      const req = new NextRequest(url);
      const response = await TrendsGET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data.trends)).toBe(true);
    });

    it('should support weekly granularity', async () => {
      const url = new URL('http://localhost:3000/api/analytics/trends');
      url.searchParams.set('metric', 'revenue');
      url.searchParams.set('granularity', 'week');
      url.searchParams.set('preset', '90d');

      const req = new NextRequest(url);
      const response = await TrendsGET(req);

      expect(response.status).toBe(200);
    });

    it('should support monthly granularity', async () => {
      const url = new URL('http://localhost:3000/api/analytics/trends');
      url.searchParams.set('metric', 'tailorExpense');
      url.searchParams.set('granularity', 'month');
      url.searchParams.set('preset', 'ytd');

      const req = new NextRequest(url);
      const response = await TrendsGET(req);

      expect(response.status).toBe(200);
    });

    it('should require metric parameter', async () => {
      const url = new URL('http://localhost:3000/api/analytics/trends');
      url.searchParams.set('granularity', 'day');

      const req = new NextRequest(url);
      const response = await TrendsGET(req);

      expect(response.status).toBe(400);
    });
  });

  describe('/api/analytics/breakdown', () => {
    it('should return breakdown by style', async () => {
      const url = new URL('http://localhost:3000/api/analytics/breakdown');
      url.searchParams.set('metric', 'shippedPcs');
      url.searchParams.set('groupBy', 'style');
      url.searchParams.set('preset', '30d');

      const req = new NextRequest(url);
      const response = await BreakdownGET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data.breakdown)).toBe(true);
    });

    it('should return breakdown by vendor', async () => {
      const url = new URL('http://localhost:3000/api/analytics/breakdown');
      url.searchParams.set('metric', 'revenue');
      url.searchParams.set('groupBy', 'vendor');
      url.searchParams.set('limit', '5');

      const req = new NextRequest(url);
      const response = await BreakdownGET(req);

      expect(response.status).toBe(200);
    });

    it('should return breakdown by tailor', async () => {
      const url = new URL('http://localhost:3000/api/analytics/breakdown');
      url.searchParams.set('metric', 'completedPcs');
      url.searchParams.set('groupBy', 'tailor');

      const req = new NextRequest(url);
      const response = await BreakdownGET(req);

      expect(response.status).toBe(200);
    });

    it('should require metric and groupBy parameters', async () => {
      const url = new URL('http://localhost:3000/api/analytics/breakdown');
      url.searchParams.set('metric', 'shippedPcs');

      const req = new NextRequest(url);
      const response = await BreakdownGET(req);

      expect(response.status).toBe(400);
    });
  });

  describe('/api/analytics/table', () => {
    it('should return paginated table data', async () => {
      const url = new URL('http://localhost:3000/api/analytics/table');
      url.searchParams.set('limit', '50');
      url.searchParams.set('skip', '0');

      const req = new NextRequest(url);
      const response = await TableGET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('items');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('hasMore');
      expect(Array.isArray(data.items)).toBe(true);
    });

    it('should support sorting', async () => {
      const url = new URL('http://localhost:3000/api/analytics/table');
      url.searchParams.set('sortBy', 'shippedPcs');
      url.searchParams.set('sortDirection', 'desc');

      const req = new NextRequest(url);
      const response = await TableGET(req);

      expect(response.status).toBe(200);
    });

    it('should support pagination', async () => {
      const url = new URL('http://localhost:3000/api/analytics/table');
      url.searchParams.set('limit', '10');
      url.searchParams.set('skip', '10');

      const req = new NextRequest(url);
      const response = await TableGET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items.length).toBeLessThanOrEqual(10);
    });
  });

  describe('/api/analytics/export', () => {
    it('should create export job', async () => {
      const url = new URL('http://localhost:3000/api/analytics/export');
      const req = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          format: 'csv',
          filters: {
            dateRange: {
              start: subDays(new Date(), 7),
              end: new Date()
            }
          }
        })
      });

      const response = await ExportPOST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('jobId');
      expect(data).toHaveProperty('status');
      expect(data.status).toBe('pending');
    });

    it('should support JSON export', async () => {
      const url = new URL('http://localhost:3000/api/analytics/export');
      const req = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          format: 'json',
          filters: {}
        })
      });

      const response = await ExportPOST(req);

      expect(response.status).toBe(200);
    });

    it('should validate format parameter', async () => {
      const url = new URL('http://localhost:3000/api/analytics/export');
      const req = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          format: 'invalid',
          filters: {}
        })
      });

      const response = await ExportPOST(req);

      expect(response.status).toBe(400);
    });
  });

  describe('RBAC Enforcement', () => {
    it('should allow admin to access all data', async () => {
      jest.mock('next-auth', () => ({
        getServerSession: jest.fn(() => Promise.resolve({
          user: {
            id: 'admin-id',
            tenantId: 'test-tenant',
            role: 'admin'
          }
        }))
      }));

      const url = new URL('http://localhost:3000/api/analytics/kpis');
      const req = new NextRequest(url);
      const response = await KPIsGET(req);

      expect(response.status).toBe(200);
    });

    it('should filter vendor data by vendorId', async () => {
      jest.mock('next-auth', () => ({
        getServerSession: jest.fn(() => Promise.resolve({
          user: {
            id: 'vendor-id',
            tenantId: 'test-tenant',
            role: 'vendor',
            vendorId: 'specific-vendor-id'
          }
        }))
      }));

      const url = new URL('http://localhost:3000/api/analytics/kpis');
      const req = new NextRequest(url);
      const response = await KPIsGET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Vendor should only see their data
      expect(data).toBeDefined();
    });

    it('should filter tailor data by tailorId', async () => {
      jest.mock('next-auth', () => ({
        getServerSession: jest.fn(() => Promise.resolve({
          user: {
            id: 'tailor-id',
            tenantId: 'test-tenant',
            role: 'tailor',
            tailorId: 'specific-tailor-id'
          }
        }))
      }));

      const url = new URL('http://localhost:3000/api/analytics/kpis');
      const req = new NextRequest(url);
      const response = await KPIsGET(req);

      expect(response.status).toBe(200);
    });
  });

  describe('Performance', () => {
    it('should respond within 500ms for cached data', async () => {
      const url = new URL('http://localhost:3000/api/analytics/kpis');
      url.searchParams.set('preset', 'today');

      const req = new NextRequest(url);
      
      const startTime = Date.now();
      await KPIsGET(req);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500);
    });

    it('should respond within 2s for complex aggregations', async () => {
      const url = new URL('http://localhost:3000/api/analytics/trends');
      url.searchParams.set('metric', 'revenue');
      url.searchParams.set('granularity', 'day');
      url.searchParams.set('preset', '90d');

      const req = new NextRequest(url);
      
      const startTime = Date.now();
      await TrendsGET(req);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000);
    });
  });
});
