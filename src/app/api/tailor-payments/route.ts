import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { tailorPaymentSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

// List payments or outstanding summary
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const tailorId = searchParams.get('tailorId');
    const summary = searchParams.get('summary') === 'true';

    const db = await getDb();

    if (summary) {
      const pipeline: Record<string, unknown>[] = [
        {
          $group: {
            _id: '$tailorId',
            balance: {
              $sum: {
                $switch: {
                  branches: [
                    { case: { $eq: ['$entryType', 'earning'] }, then: '$amount' },
                    { case: { $eq: ['$entryType', 'payout'] }, then: { $multiply: ['$amount', -1] } },
                    { case: { $eq: ['$entryType', 'advance'] }, then: { $multiply: ['$amount', -1] } },
                    { case: { $eq: ['$entryType', 'deduction'] }, then: { $multiply: ['$amount', -1] } },
                  ],
                  default: 0,
                },
              },
            },
          },
        },
      ];
      const balances = await db.collection(COLLECTIONS.TAILOR_PAYMENTS).aggregate(pipeline).toArray();
      return NextResponse.json({ success: true, data: balances });
    }

    const query: Record<string, unknown> = {};
    if (tailorId && ObjectId.isValid(tailorId)) query.tailorId = new ObjectId(tailorId);

    const payments = await db
      .collection(COLLECTIONS.TAILOR_PAYMENTS)
      .find(query)
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();

    return NextResponse.json({ success: true, data: payments });
  } catch (error) {
    console.error('Tailor payments GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// Create payment entry
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = tailorPaymentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const db = await getDb();
    const tailorId = new ObjectId(validation.data.tailorId);

    const lastEntry = await db
      .collection(COLLECTIONS.TAILOR_PAYMENTS)
      .find({ tailorId })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();
    const lastBalance = lastEntry[0]?.balanceAfter ?? 0;

    const amount = validation.data.amount;
    const delta =
      validation.data.entryType === 'earning'
        ? amount
        : validation.data.entryType === 'payout'
        ? -amount
        : validation.data.entryType === 'advance'
        ? -amount
        : -amount; // deduction

    const balanceAfter = lastBalance + delta;
    const now = new Date();

    const result = await db.collection(COLLECTIONS.TAILOR_PAYMENTS).insertOne({
      ...validation.data,
      tailorId,
      jobId: validation.data.jobId ? new ObjectId(validation.data.jobId) : undefined,
      balanceAfter,
      createdAt: now,
      updatedAt: now,
      createdBy: {
        userId: new ObjectId(session.user.id),
        name: session.user.name,
      },
    });

    return NextResponse.json(
      { success: true, data: { paymentId: result.insertedId, balanceAfter }, message: 'Payment entry recorded' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Tailor payments POST error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

