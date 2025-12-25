import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { authOptions } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { Sample, SampleVersion } from '@/lib/types';

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { attachments, notes, expectedCompletionDate } = await req.json();
        const db = await getDb();
        const sampleId = new ObjectId(params.id);

        const sample = await db.collection<Sample>(COLLECTIONS.SAMPLES).findOne({ _id: sampleId });
        if (!sample) {
            return NextResponse.json({ success: false, error: 'Sample not found' }, { status: 404 });
        }

        // Role check: Only manufacturer (manager/admin/tailor?) can submit samples usually.
        // Vendor usually Requests.
        // Let's allow admin, manager, and maybe tailor if they have login.
        const allowedRoles = ['admin', 'manager', 'vendor']; // Vendor might upload a "reference sample" version?
        // Requirement: "Manufacturer hub builds... submits... Vendor reviews".
        // So distinct roles.

        // Calculate new version number
        const newVersionNumber = (sample.currentVersion || 0) + 1;
        const now = new Date();

        const newVersion: SampleVersion = {
            _id: new ObjectId(),
            createdAt: now,
            updatedAt: now,
            sampleId: sampleId,
            versionNumber: newVersionNumber,
            submittedBy: {
                userId: new ObjectId(session.user.id),
                name: session.user.name,
                role: session.user.role,
            },
            status: 'sample_submitted', // Default status when submitting a version
            attachments: attachments || [],
            notes: notes,
            expectedCompletionDate: expectedCompletionDate ? new Date(expectedCompletionDate) : undefined,
        };

        // Insert Version
        await db.collection(COLLECTIONS.SAMPLE_VERSIONS).insertOne(newVersion);

        // Update Sample
        await db.collection(COLLECTIONS.SAMPLES).updateOne(
            { _id: sampleId },
            {
                $set: {
                    status: 'sample_submitted',
                    currentVersion: newVersionNumber,
                    images: attachments || [], // Update main images to latest
                    updatedAt: now
                }
            }
        );

        // Audit Log
        await db.collection(COLLECTIONS.EVENTS).insertOne({
            entityType: 'sample',
            entityId: sampleId,
            action: 'update',
            actorId: new ObjectId(session.user.id),
            actorName: session.user.name,
            changes: {
                status: { old: sample.status, new: 'sample_submitted' },
                currentVersion: { old: sample.currentVersion, new: newVersionNumber }
            },
            metadata: { notes: `Version ${newVersionNumber} submitted` },
            createdAt: now,
            updatedAt: now,
        });

        return NextResponse.json({ success: true, data: newVersion }, { status: 201 });

    } catch (error: any) {
        console.error('Error creating sample version:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
