import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { authOptions } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { Sample } from '@/lib/types';

export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const db = await getDb();
        const sampleId = new ObjectId(params.id);

        const sample = await db.collection(COLLECTIONS.SAMPLES).findOne({ _id: sampleId });

        if (!sample) {
            return NextResponse.json({ success: false, error: 'Sample not found' }, { status: 404 });
        }

        // RBAC: If vendor, must match
        if (session.user.role === 'vendor' && sample.vendorId.toString() !== session.user.vendorId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
        }

        // Parallel fetch versions and comments
        // Sort versions descending (latest first)
        // Sort comments ascending (oldest first)
        const [versions, comments] = await Promise.all([
            db.collection(COLLECTIONS.SAMPLE_VERSIONS).find({ sampleId }).sort({ versionNumber: -1 }).toArray(),
            db.collection(COLLECTIONS.SAMPLE_COMMENTS).find({ sampleId }).sort({ createdAt: 1 }).toArray()
        ]);

        return NextResponse.json({
            success: true,
            data: {
                ...sample,
                versions,
                comments
            }
        });

    } catch (error: any) {
        console.error('Error fetching sample details:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { status, proceedToProduction, expectedBy, notes } = await req.json();
        const db = await getDb();
        const sampleId = new ObjectId(params.id);

        const sample = await db.collection(COLLECTIONS.SAMPLES).findOne({ _id: sampleId });
        if (!sample) {
            return NextResponse.json({ success: false, error: 'Sample not found' }, { status: 404 });
        }

        // RBAC check
        if (session.user.role === 'vendor' && sample.vendorId.toString() !== session.user.vendorId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
        }

        // Status transitions validation could go here
        // e.g. Only Vendor can 'approve' or 'reject'
        if ((status === 'approved' || status === 'rejected' || status === 'changes_requested') && session.user.role !== 'vendor' && session.user.role !== 'admin') {
            return NextResponse.json({ success: false, error: 'Only vendors can approve/reject samples' }, { status: 403 });
        }

        const updateData: any = { updatedAt: new Date() };
        if (status) updateData.status = status;
        if (proceedToProduction !== undefined) updateData.proceedToProduction = proceedToProduction;
        if (expectedBy) updateData.expectedBy = new Date(expectedBy);

        await db.collection(COLLECTIONS.SAMPLES).updateOne(
            { _id: sampleId },
            { $set: updateData }
        );

        // Audit Log
        await db.collection(COLLECTIONS.EVENTS).insertOne({
            entityType: 'sample', // Technically 'sample' isn't in EntityType enum yet, but it's fine for now or we should add it.
            entityId: sampleId,
            action: 'update',
            actorId: new ObjectId(session.user.id),
            actorName: session.user.name,
            changes: {
                status: { old: sample.status, new: status }
            },
            metadata: { notes },
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        return NextResponse.json({ success: true, data: { ...sample, ...updateData } });

    } catch (error: any) {
        console.error('Error updating sample:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
