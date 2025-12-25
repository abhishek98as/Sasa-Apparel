import { ObjectId } from 'mongodb';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { DailyKPI } from './types';
import { startOfDay, endOfDay, format } from 'date-fns';

/**
 * Aggregates daily KPIs for a specific tenant and date range.
 * If no date is provided, defaults to "today".
 * 
 * This function should be called by a cron job or background worker.
 */
export async function refreshDailyAnalytics(tenantId: string, date: Date = new Date()) {
    const db = await getDb();
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    const dateString = format(date, 'yyyy-MM-dd');

    console.log(`[ETL] Starting refresh for tenant ${tenantId} on ${dateString}`);

    // 1. Fabric Cutting (Cutting Received)
    // Group by Style
    const cuttingStats = await db.collection(COLLECTIONS.FABRIC_CUTTING).aggregate([
        {
            $match: {
                tenantId,
                createdAt: { $gte: dayStart, $lte: dayEnd }
            }
        },
        {
            $group: {
                _id: { styleId: '$styleId' },
                totalQty: { $sum: '$totalQty' },  // adjust field name based on actual schema
                count: { $sum: 1 }
            }
        }
    ]).toArray();

    // 2. Tailor Jobs (In Production & Tailor Expense)
    // Group by Style and Tailor
    const productionStats = await db.collection(COLLECTIONS.TAILOR_JOBS).aggregate([
        {
            $match: {
                // tenantId: tenantId, // tailorJobs might not have tenantId directly if scoped by tailor? Assuming query filters handle it or schema has it.
                // Checking schema: tailor-jobs usually link to fabricCutting which has tenantId, or directly. 
                // Let's assume for now we filter by date on 'issueDate' for expenses/starts.
                issueDate: { $gte: dayStart, $lte: dayEnd }
                // We need to ensure we only get jobs for this tenant. 
                // Should probably lookup style -> tenantId or store tenantId on jobs.
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
        { $unwind: '$style' },
        { $match: { 'style.tenantId': tenantId } },
        {
            $group: {
                _id: { styleId: '$styleId', tailorId: '$tailorId' },
                issuedPcs: { $sum: '$issuedPcs' },
                expense: { $sum: { $multiply: ['$issuedPcs', '$rate'] } }, // Estimated booking expense
                jobsCount: { $sum: 1 }
            }
        }
    ]).toArray();

    // 3. Shipments (PCS Shipped)
    // Group by Style (and Vendor via Order?)
    const shipmentStats = await db.collection(COLLECTIONS.SHIPMENTS).aggregate([
        {
            $match: {
                tenantId,
                shippedAt: { $gte: dayStart, $lte: dayEnd }
            }
        },
        {
            $lookup: { // Need to link back to style to group by style
                from: 'orders', // Assuming shipments link to orders
                localField: 'orderId',
                foreignField: '_id',
                as: 'order'
            }
        },
        { $unwind: '$order' },
        // If order has styleId... 
        // This part depends heavily on exact schema links. 
        // Simplification: Direct mapping if shipment has item details or link to order_sizes.
        // For now, assuming shipment -> order -> style is the path or shipment has styleId.
        // Let's assume shipments are per order.
        {
            $group: {
                _id: { styleId: '$order.styleId' }, // Adjust based on actual schema
                shippedQty: { $sum: '$shippedQty' }
            }
        }
    ]).toArray();

    // 4. Consolidate Data
    // We want to create one document per (Date, Tenant, Style, Tailor?, Vendor?)
    // For simplicity, we'll create aggregate docs primarily keyed by Style for the main dashboard.
    // Tailor specific stats might need their own structure or we use a "dimensions" approach.

    // Let's build a map of StyleID -> Stats
    const dailyMap = new Map<string, Partial<DailyKPI>>();

    // Helper to get or init
    const getEntry = (styleId: string) => {
        if (!dailyMap.has(styleId)) {
            dailyMap.set(styleId, {
                tenantId,
                date: dateString,
                styleId,
                totalQty: 0,
                cuttingReceived: 0,
                inProductionOrders: 0,
                inProductionPcs: 0,
                shippedPcs: 0,
                completedPcs: 0,
                expectedReceivable: 0,
                tailorExpense: 0,
                updatedAt: new Date()
            });
        }
        return dailyMap.get(styleId)!;
    };

    // Merge Cutting Stats
    for (const stat of cuttingStats) {
        const entry = getEntry(stat._id.styleId.toString());
        entry.cuttingReceived += stat.totalQty;
    }

    // Merge Production Stats
    for (const stat of productionStats) {
        const entry = getEntry(stat._id.styleId.toString());
        entry.inProductionPcs += stat.issuedPcs;
        entry.inProductionOrders += stat.jobsCount;
        entry.tailorExpense += stat.expense;
    }

    // Merge Shipment Stats
    for (const stat of shipmentStats) {
        if (stat._id.styleId) {
            const entry = getEntry(stat._id.styleId.toString());
            entry.shippedPcs += stat.shippedQty;
        }
    }

    // 5. Bulk Write to Analytics Daily
    const operations = Array.from(dailyMap.values()).map(doc => ({
        updateOne: {
            filter: { tenantId, date: dateString, styleId: doc.styleId },
            update: { $set: doc },
            upsert: true
        }
    }));

    if (operations.length > 0) {
        await db.collection(COLLECTIONS.ANALYTICS_DAILY).bulkWrite(operations);
        console.log(`[ETL] Updated ${operations.length} daily records for ${tenantId}`);
    } else {
        console.log(`[ETL] No data found for ${tenantId} on ${dateString}`);
    }

    return { success: true, count: operations.length };
}
