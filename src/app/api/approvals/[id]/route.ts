import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

interface ApprovalPayload {
  collection: string;
  type: 'update' | 'softDelete';
  data?: Record<string, unknown>;
}

// Approve or reject a pending request (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid approval ID' }, { status: 400 });
    }

    const body = await request.json();
    const action = body?.action as 'approve' | 'reject';
    const remarks = body?.remarks as string | undefined;

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    const db = await getDb();
    const approval = await db
      .collection(COLLECTIONS.APPROVALS)
      .findOne({ _id: new ObjectId(id) });

    if (!approval) {
      return NextResponse.json({ success: false, error: 'Approval request not found' }, { status: 404 });
    }

    if (approval.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Request already processed' },
        { status: 400 }
      );
    }

    if (action === 'reject') {
      await db.collection(COLLECTIONS.APPROVALS).updateOne(
        { _id: approval._id },
        {
          $set: {
            status: 'rejected',
            decisionBy: new ObjectId(session.user.id),
            decisionRemarks: remarks,
            updatedAt: new Date(),
          },
        }
      );

      return NextResponse.json({
        success: true,
        message: 'Request rejected',
      });
    }

    // Approve & apply the requested change
    const payload = approval.payload as ApprovalPayload;
    const whitelist = new Set<string>([
      COLLECTIONS.USERS,
      COLLECTIONS.VENDORS,
      COLLECTIONS.STYLES,
      COLLECTIONS.FABRIC_CUTTING,
      COLLECTIONS.TAILOR_JOBS,
      COLLECTIONS.SHIPMENTS,
      COLLECTIONS.RATES,
      COLLECTIONS.INVENTORY_ITEMS,
      COLLECTIONS.INVENTORY_MOVEMENTS,
      COLLECTIONS.REORDER_SUGGESTIONS,
      COLLECTIONS.QC_CHECKLISTS,
      COLLECTIONS.QC_INSPECTIONS,
      COLLECTIONS.TAILOR_PAYMENTS,
      'tailors',
    ]);

    if (!payload?.collection || !whitelist.has(payload.collection)) {
      return NextResponse.json(
        { success: false, error: 'Unsupported approval payload' },
        { status: 400 }
      );
    }

    const targetId = approval.entityId;
    const collection = db.collection(payload.collection);

    if (payload.type === 'softDelete') {
      await collection.updateOne(
        { _id: new ObjectId(targetId) },
        { $set: { isActive: false, updatedAt: new Date(), ...(payload.data || {}) } }
      );
    } else {
      await collection.updateOne(
        { _id: new ObjectId(targetId) },
        { $set: { ...(payload.data || {}), updatedAt: new Date() } }
      );
    }

    await db.collection(COLLECTIONS.APPROVALS).updateOne(
      { _id: approval._id },
      {
        $set: {
          status: 'approved',
          decisionBy: new ObjectId(session.user.id),
          decisionRemarks: remarks,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Request approved and applied',
    });
  } catch (error) {
    console.error('Approvals PUT error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

