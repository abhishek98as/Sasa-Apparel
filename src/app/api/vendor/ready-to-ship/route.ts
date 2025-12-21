import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'vendor' || !session.user.vendorId) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const db = await getDb();

        // Find jobs that are ready to ship for styles belonging to this vendor
        const readyItems = await db
            .collection(COLLECTIONS.TAILOR_JOBS)
            .aggregate([
                {
                    $match: {
                        status: 'ready-to-ship'
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
                { $unwind: '$style' },
                {
                    $match: {
                        'style.vendorId': new ObjectId(session.user.vendorId)
                    }
                },
                // Group by style to show aggregated ready quantity? Or list distinct batches?
                // Listing distinct batches is probably better for detail.
                {
                    $project: {
                        _id: 1,
                        style: {
                            _id: '$style._id',
                            name: '$style.name',
                            code: '$style.code',
                        },
                        pcsReady: '$returnedPcs', // Returned from tailor means ready for next step
                        date: '$completedDate',
                        qcStatus: 1,
                        note: '$qcNotes'
                    },
                },
                { $sort: { date: -1 } }
            ])
            .toArray();

        return NextResponse.json({ success: true, data: readyItems });
    } catch (error) {
        console.error('Vendor Ready-to-Ship GET error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
