import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { authOptions } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { SampleComment } from '@/lib/types';

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { content, attachments, isInternal } = await req.json();
        if (!content) {
            return NextResponse.json({ success: false, error: 'Comment content is required' }, { status: 400 });
        }

        const db = await getDb();
        const sampleId = new ObjectId(params.id);

        // Verify sample exists
        const sample = await db.collection(COLLECTIONS.SAMPLES).findOne({ _id: sampleId });
        if (!sample) {
            return NextResponse.json({ success: false, error: 'Sample not found' }, { status: 404 });
        }

        const now = new Date();
        const newComment: SampleComment = {
            _id: new ObjectId(),
            createdAt: now,
            updatedAt: now,
            sampleId: sampleId,
            userId: new ObjectId(session.user.id),
            userName: session.user.name,
            userRole: session.user.role,
            content: content,
            attachments: attachments || [],
            isInternal: isInternal || false,
        };

        await db.collection(COLLECTIONS.SAMPLE_COMMENTS).insertOne(newComment);

        return NextResponse.json({ success: true, data: newComment }, { status: 201 });

    } catch (error: any) {
        console.error('Error creating comment:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
