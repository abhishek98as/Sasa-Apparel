/**
 * Expected Receivable API
 * 
 * Calculates expected receivable amounts based on shipped/completed items
 * that haven't been paid.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS, RECEIVABLE_STATUSES, UNPAID_PAYMENT_STATUSES } from '@/lib/mongodb';
import { createErrorResponse } from '@/lib/rbac';
import { ObjectId } from 'mongodb';
import { ExpectedReceivable } from '@/lib/types';

/**
 * GET /api/expected-receivable
 * Calculate expected receivable based on shipped/completed items with unpaid status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        createErrorResponse('UNAUTHORIZED', 'Authentication required'),
        { status: 401 }
      );
    }

    // Only admin and manager can view receivables
    if (!['admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json(
        createErrorResponse('FORBIDDEN', 'Admin or Manager access required'),
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');
    const statusFilter = searchParams.get('statusFilter')?.split(',') || [...RECEIVABLE_STATUSES];

    const db = await getDb();

    // Build aggregation pipeline
    const pipeline: any[] = [
      // Match shipments with unpaid status
      {
        $match: {
          paymentStatus: { $in: [...UNPAID_PAYMENT_STATUSES] },
          ...(vendorId ? { vendorId: new ObjectId(vendorId) } : {})
        }
      },
      // Lookup style for rate information
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
            },
            { $sort: { effectiveDate: -1 } },
            { $limit: 1 }
          ],
          as: 'rateInfo'
        }
      },
      {
        $unwind: {
          path: '$rateInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      // Calculate amount
      {
        $addFields: {
          rate: { $ifNull: ['$rateInfo.vendorRate', 0] },
          unpaidAmount: {
            $subtract: [
              { $ifNull: ['$invoiceAmount', { $multiply: ['$pcsShipped', { $ifNull: ['$rateInfo.vendorRate', 0] }] }] },
              { $ifNull: ['$paidAmount', 0] }
            ]
          }
        }
      },
      // Group by vendor
      {
        $group: {
          _id: '$vendorId',
          totalAmount: { $sum: '$unpaidAmount' },
          shippedAmount: {
            $sum: {
              $cond: [
                { $in: ['shipped', statusFilter] },
                '$unpaidAmount',
                0
              ]
            }
          },
          shipmentCount: { $sum: 1 },
          totalPcs: { $sum: '$pcsShipped' }
        }
      },
      // Lookup vendor info
      {
        $lookup: {
          from: COLLECTIONS.VENDORS,
          localField: '_id',
          foreignField: '_id',
          as: 'vendorInfo'
        }
      },
      {
        $unwind: {
          path: '$vendorInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          vendorId: { $toString: '$_id' },
          vendorName: { $ifNull: ['$vendorInfo.name', 'Unknown Vendor'] },
          amount: { $round: ['$totalAmount', 2] },
          breakdown: {
            shipped: { $round: ['$shippedAmount', 2] },
            completed: { $round: [{ $subtract: ['$totalAmount', '$shippedAmount'] }, 2] }
          },
          shipmentCount: 1,
          totalPcs: 1
        }
      },
      { $sort: { amount: -1 } }
    ];

    const vendorResults = await db.collection(COLLECTIONS.SHIPMENTS)
      .aggregate(pipeline)
      .toArray();

    // Also calculate from tailor jobs (completed but not shipped/paid)
    const jobsPipeline: any[] = [
      {
        $match: {
          status: { $in: statusFilter.filter(s => s !== 'shipped') },
          ...(vendorId ? {} : {}) // Jobs don't have vendorId directly
        }
      },
      {
        $lookup: {
          from: COLLECTIONS.FABRIC_CUTTING,
          localField: 'fabricCuttingId',
          foreignField: '_id',
          as: 'cuttingInfo'
        }
      },
      {
        $unwind: {
          path: '$cuttingInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $match: vendorId ? { 'cuttingInfo.vendorId': new ObjectId(vendorId) } : {}
      },
      {
        $group: {
          _id: '$cuttingInfo.vendorId',
          completedNotShipped: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'completed'] },
                { $multiply: ['$returnedPcs', '$rate'] },
                0
              ]
            }
          },
          completedPcs: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'completed'] },
                '$returnedPcs',
                0
              ]
            }
          }
        }
      }
    ];

    const jobsResults = await db.collection(COLLECTIONS.TAILOR_JOBS)
      .aggregate(jobsPipeline)
      .toArray();

    // Merge results
    const jobsMap = new Map(jobsResults.map(j => [j._id?.toString(), j]));

    const byVendor = vendorResults.map(v => {
      const jobsData = jobsMap.get(v.vendorId) || { completedNotShipped: 0, completedPcs: 0 };
      return {
        vendorId: v.vendorId,
        vendorName: v.vendorName,
        amount: v.amount + (jobsData.completedNotShipped || 0),
        breakdown: {
          shipped: v.breakdown.shipped,
          completed: (v.breakdown.completed || 0) + (jobsData.completedNotShipped || 0)
        },
        shipmentCount: v.shipmentCount,
        totalPcs: v.totalPcs + (jobsData.completedPcs || 0)
      };
    });

    // Add vendors that only have completed jobs (no shipments)
    const jobEntries = Array.from(jobsMap.entries());
    for (let i = 0; i < jobEntries.length; i++) {
      const [vendorIdStr, jobsData] = jobEntries[i];
      if (!vendorResults.find(v => v.vendorId === vendorIdStr) && jobsData.completedNotShipped > 0) {
        const vendor = await db.collection(COLLECTIONS.VENDORS).findOne({
          _id: new ObjectId(vendorIdStr!)
        });
        byVendor.push({
          vendorId: vendorIdStr!,
          vendorName: vendor?.name || 'Unknown Vendor',
          amount: jobsData.completedNotShipped,
          breakdown: {
            shipped: 0,
            completed: jobsData.completedNotShipped
          },
          shipmentCount: 0,
          totalPcs: jobsData.completedPcs
        });
      }
    }

    const total = byVendor.reduce((sum, v) => sum + v.amount, 0);

    const result: ExpectedReceivable = {
      total: Math.round(total * 100) / 100,
      byVendor,
      statusFilter,
      lastCalculated: new Date()
    };

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('GET /api/expected-receivable error:', error);
    return NextResponse.json(
      createErrorResponse('INTERNAL_ERROR', 'Failed to calculate expected receivable'),
      { status: 500 }
    );
  }
}
