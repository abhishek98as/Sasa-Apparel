import { ObjectId } from 'mongodb';
import { getDb, COLLECTIONS } from '../mongodb';
import { FinancialSummary, PLStatement, TurnoverMetrics, CostMetrics, RevenueBreakdown } from './models';
import { InventoryService } from '../inventory/inventory-service';

export class FinancialCalculationService {
  private db: any;

  async init() {
    this.db = await getDb();
  }

  /**
   * Calculate total revenue from shipments
   */
  async calculateRevenue(startDate: Date, endDate: Date): Promise<number> {
    await this.init();

    const result = await this.db
      .collection(COLLECTIONS.SHIPMENTS)
      .aggregate([
        {
          $match: {
            date: { $gte: startDate, $lte: endDate }
          }
        },
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
            from: COLLECTIONS.RATES,
            let: { styleId: '$styleId', vendorId: '$vendorId' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$styleId', '$$styleId'] },
                      { $eq: ['$vendorId', '$$vendorId'] }
                    ]
                  }
                }
              }
            ],
            as: 'rate'
          }
        },
        { $unwind: { path: '$rate', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $multiply: [
                  { $ifNull: ['$pcsShipped', 0] },
                  { $ifNull: ['$rate.vendorRate', 0] }
                ]
              }
            }
          }
        }
      ])
      .toArray();

    return result[0]?.total || 0;
  }

  /**
   * Calculate revenue breakdown by various dimensions
   */
  async calculateRevenueBreakdown(startDate: Date, endDate: Date): Promise<RevenueBreakdown> {
    await this.init();

    // Revenue by Vendor
    const byVendor = await this.db
      .collection(COLLECTIONS.SHIPMENTS)
      .aggregate([
        {
          $match: {
            date: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $lookup: {
            from: COLLECTIONS.VENDORS,
            localField: 'vendorId',
            foreignField: '_id',
            as: 'vendor'
          }
        },
        { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
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
                      { $eq: ['$vendorId', '$$vendorId'] }
                    ]
                  }
                }
              }
            ],
            as: 'rate'
          }
        },
        { $unwind: { path: '$rate', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$vendorId',
            vendorName: { $first: '$vendor.name' },
            amount: {
              $sum: {
                $multiply: [
                  { $ifNull: ['$pcsShipped', 0] },
                  { $ifNull: ['$rate.vendorRate', 0] }
                ]
              }
            }
          }
        },
        { $sort: { amount: -1 } }
      ])
      .toArray();

    // Revenue by Style
    const byStyle = await this.db
      .collection(COLLECTIONS.SHIPMENTS)
      .aggregate([
        {
          $match: {
            date: { $gte: startDate, $lte: endDate }
          }
        },
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
            from: COLLECTIONS.RATES,
            let: { styleId: '$styleId', vendorId: '$vendorId' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$styleId', '$$styleId'] },
                      { $eq: ['$vendorId', '$$vendorId'] }
                    ]
                  }
                }
              }
            ],
            as: 'rate'
          }
        },
        { $unwind: { path: '$rate', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$styleId',
            styleName: { $first: '$style.name' },
            amount: {
              $sum: {
                $multiply: [
                  { $ifNull: ['$pcsShipped', 0] },
                  { $ifNull: ['$rate.vendorRate', 0] }
                ]
              }
            }
          }
        },
        { $sort: { amount: -1 } }
      ])
      .toArray();

    return {
      byVendor: byVendor.map((v: any) => ({
        vendorId: v._id,
        vendorName: v.vendorName || 'Unknown',
        amount: v.amount
      })),
      byStyle: byStyle.map((s: any) => ({
        styleId: s._id,
        styleName: s.styleName || 'Unknown',
        amount: s.amount
      })),
      byTailor: [],
      bySize: [],
      byFabricType: []
    };
  }

  /**
   * Calculate tailor cost
   */
  async calculateTailorCost(startDate: Date, endDate: Date): Promise<number> {
    await this.init();

    const result = await this.db
      .collection(COLLECTIONS.TAILOR_JOBS)
      .aggregate([
        {
          $match: {
            $or: [
              { completedDate: { $gte: startDate, $lte: endDate } },
              { updatedAt: { $gte: startDate, $lte: endDate } }
            ],
            status: { $in: ['completed', 'ready-to-ship', 'shipped'] }
          }
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $multiply: [
                  { $ifNull: ['$returnedPcs', 0] },
                  { $ifNull: ['$rate', 0] }
                ]
              }
            }
          }
        }
      ])
      .toArray();

    return result[0]?.total || 0;
  }

  /**
   * Calculate material cost from inventory consumption
   */
  async calculateMaterialCost(startDate: Date, endDate: Date): Promise<number> {
    const inventoryService = new InventoryService();
    return await inventoryService.getConsumptionCost(startDate, endDate);
  }

  /**
   * Calculate costs by category
   */
  async calculateCosts(startDate: Date, endDate: Date): Promise<CostMetrics> {
    await this.init();

    const tailorCost = await this.calculateTailorCost(startDate, endDate);
    const materialCost = await this.calculateMaterialCost(startDate, endDate);

    // Get costs from cost entries
    const costEntries = await this.db
      .collection(COLLECTIONS.COST_ENTRIES)
      .aggregate([
        {
          $match: {
            entryDate: { $gte: startDate, $lte: endDate },
            status: 'approved'
          }
        },
        {
          $group: {
            _id: '$costCategory',
            total: { $sum: { $ifNull: ['$amount', 0] } }
          }
        }
      ])
      .toArray();

    const overheadCost = costEntries.find((c: any) => c._id === 'overhead')?.total || 0;
    const logisticsCost = costEntries.find((c: any) => c._id === 'logistics')?.total || 0;
    const qualityCost = costEntries.find((c: any) => c._id === 'quality')?.total || 0;
    const otherCost = costEntries.find((c: any) => c._id === 'other')?.total || 0;

    const totalCost = tailorCost + materialCost + overheadCost + logisticsCost + qualityCost + otherCost;

    return {
      tailorCost,
      materialCost,
      overheadCost,
      logisticsCost,
      qualityCost,
      otherCost,
      totalCost
    };
  }

  /**
   * Calculate P&L Statement
   */
  async calculatePLStatement(startDate: Date, endDate: Date): Promise<PLStatement> {
    const revenue = await this.calculateRevenue(startDate, endDate);
    const costs = await this.calculateCosts(startDate, endDate);

    const cogs = costs.tailorCost + costs.materialCost;
    const grossProfit = revenue - cogs;
    const grossProfitMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    const operatingExpenses = costs.overheadCost + costs.logisticsCost + costs.qualityCost + costs.otherCost;
    const operatingProfit = grossProfit - operatingExpenses;
    const operatingProfitMargin = revenue > 0 ? (operatingProfit / revenue) * 100 : 0;

    const ebitda = operatingProfit;
    const ebitdaMargin = revenue > 0 ? (ebitda / revenue) * 100 : 0;

    const netProfit = operatingProfit;
    const netProfitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    return {
      revenue: {
        salesRevenue: revenue,
        otherRevenue: 0,
        totalRevenue: revenue
      },
      cogs: {
        materialCost: costs.materialCost,
        tailorCost: costs.tailorCost,
        totalCOGS: cogs
      },
      grossProfit,
      grossProfitMargin,
      operatingExpenses: {
        overheadCost: costs.overheadCost,
        logisticsCost: costs.logisticsCost,
        qualityCost: costs.qualityCost,
        otherCost: costs.otherCost,
        totalOperatingExpenses: operatingExpenses
      },
      operatingProfit,
      operatingProfitMargin,
      ebitda,
      ebitdaMargin,
      netProfit,
      netProfitMargin
    };
  }

  /**
   * Calculate EBITDA
   */
  calculateEBITDA(revenue: number, costs: CostMetrics): number {
    const cogs = costs.tailorCost + costs.materialCost;
    const grossProfit = revenue - cogs;
    const ebitda = grossProfit - costs.overheadCost - costs.logisticsCost - costs.qualityCost - costs.otherCost;
    return ebitda;
  }

  /**
   * Calculate Inventory Turnover
   */
  async calculateInventoryTurnover(startDate: Date, endDate: Date): Promise<number> {
    const cogs = await this.calculateMaterialCost(startDate, endDate);
    
    const inventoryService = new InventoryService();
    const avgInventoryValue = await inventoryService.getTotalInventoryValue();
    
    if (avgInventoryValue === 0) return 0;
    return cogs / avgInventoryValue;
  }

  /**
   * Calculate comprehensive Financial Summary
   */
  async calculateFinancialSummary(startDate: Date, endDate: Date): Promise<FinancialSummary> {
    const revenue = await this.calculateRevenue(startDate, endDate);
    const costs = await this.calculateCosts(startDate, endDate);
    const plStatement = await this.calculatePLStatement(startDate, endDate);
    const inventoryTurnover = await this.calculateInventoryTurnover(startDate, endDate);

    const revenueTrend = 0; // Calculate based on previous period comparison
    const profitTrend = 0;

    return {
      totalRevenue: revenue,
      totalCosts: costs.totalCost,
      grossProfit: plStatement.grossProfit,
      grossProfitMargin: plStatement.grossProfitMargin,
      ebitda: plStatement.ebitda,
      ebitdaMargin: plStatement.ebitdaMargin,
      netProfit: plStatement.netProfit,
      netProfitMargin: plStatement.netProfitMargin,
      inventoryTurnover,
      revenueTrend,
      profitTrend
    };
  }

  /**
   * Calculate Turnover Metrics
   */
  async calculateTurnoverMetrics(startDate: Date, endDate: Date): Promise<TurnoverMetrics> {
    const inventoryTurnoverRatio = await this.calculateInventoryTurnover(startDate, endDate);
    const inventoryService = new InventoryService();
    const avgInventoryValue = await inventoryService.getTotalInventoryValue();
    
    const daysInventoryOutstanding = inventoryTurnoverRatio > 0 ? 365 / inventoryTurnoverRatio : 0;

    const revenue = await this.calculateRevenue(startDate, endDate);
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const revenuePerDay = daysDiff > 0 ? revenue / daysDiff : 0;

    const costs = await this.calculateCosts(startDate, endDate);
    const grossProfit = revenue - (costs.tailorCost + costs.materialCost);
    const netProfit = grossProfit - costs.overheadCost - costs.logisticsCost - costs.qualityCost - costs.otherCost;

    // Get total shipped pieces for per-unit calculations
    const shipmentResult = await this.db
      .collection(COLLECTIONS.SHIPMENTS)
      .aggregate([
        {
          $match: {
            date: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            totalPcs: { $sum: { $ifNull: ['$pcsShipped', 0] } }
          }
        }
      ])
      .toArray();

    const totalPcs = shipmentResult[0]?.totalPcs || 1; // Prevent division by zero

    return {
      inventoryTurnover: {
        ratio: inventoryTurnoverRatio,
        daysInventoryOutstanding,
        avgInventoryValue
      },
      salesTurnover: {
        revenuePerDay,
        revenuePerWeek: revenuePerDay * 7,
        revenuePerMonth: revenuePerDay * 30
      },
      financialRatios: {
        returnOnSales: revenue > 0 ? (netProfit / revenue) * 100 : 0,
        costToIncomeRatio: revenue > 0 ? (costs.totalCost / revenue) * 100 : 0,
        grossProfitPerUnit: grossProfit / totalPcs,
        netProfitPerUnit: netProfit / totalPcs
      }
    };
  }
}

