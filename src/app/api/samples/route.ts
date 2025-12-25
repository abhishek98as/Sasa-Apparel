import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { authOptions } from '@/lib/auth';
import { Sample, SampleStatus, SampleVersion } from '@/lib/types';
import { ObjectId } from 'mongodb';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { styleId, styleCode, styleName, expectedBy, notes, attachments, vendorId: requestedVendorId } = body;

        if (!styleId || !styleCode || !styleName) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        const db = await getDb();

        // Determine Vendor
        let vendorId: ObjectId;
        let vendorName: string;

        if (session.user.role === 'vendor') {
            if (!session.user.vendorId) {
                return NextResponse.json({ success: false, error: 'Vendor profile not found' }, { status: 400 });
            }
            vendorId = new ObjectId(session.user.vendorId);
            vendorName = session.user.name; // User name or should we fetch vendor doc?
            // Better to fetch vendor doc to get canonical name
            const vendorDoc = await db.collection(COLLECTIONS.VENDORS).findOne({ _id: vendorId });
            vendorName = vendorDoc?.name || session.user.name;
        } else {
            // Admin/Manager creating on behalf of vendor? Or maybe internal request.
            // Requirement: "Vendor requests a style sample"
            // But if user is admin, they might create it too.
            if (!requestedVendorId) {
                // Try to get from style
                const style = await db.collection(COLLECTIONS.STYLES).findOne({ _id: new ObjectId(styleId) });
                if (!style) {
                    return NextResponse.json({ success: false, error: 'Style not found' }, { status: 404 });
                }
                vendorId = style.vendorId;
            } else {
                vendorId = new ObjectId(requestedVendorId);
            }

            const vendorDoc = await db.collection(COLLECTIONS.VENDORS).findOne({ _id: vendorId });
            if (!vendorDoc) {
                return NextResponse.json({ success: false, error: 'Vendor not found' }, { status: 404 });
            }
            vendorName = vendorDoc.name;
        }

        const now = new Date();
        const newSampleId = new ObjectId();

        const newSample: Sample = {
            _id: newSampleId,
            createdAt: now,
            updatedAt: now,
            styleId: new ObjectId(styleId),
            styleCode,
            styleName,
            vendorId,
            vendorName,
            status: 'requested',
            currentVersion: 1,
            expectedBy: expectedBy ? new Date(expectedBy) : undefined,
            images: attachments || [],
        };

        const initialVersion: SampleVersion = {
            _id: new ObjectId(),
            createdAt: now,
            updatedAt: now,
            sampleId: newSampleId,
            versionNumber: 1,
            submittedBy: {
                userId: new ObjectId(session.user.id),
                name: session.user.name,
                role: session.user.role,
            },
            status: 'requested',
            attachments: attachments || [],
            notes: notes,
        };

        await db.collection(COLLECTIONS.SAMPLES).insertOne(newSample);
        await db.collection(COLLECTIONS.SAMPLE_VERSIONS).insertOne(initialVersion);

        return NextResponse.json({ success: true, data: newSample }, { status: 201 });

    } catch (error: any) {
        console.error('Error creating sample:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        const db = await getDb();
        const query: any = {};

        if (status && status !== 'all') {
            query.status = status;
        }

        // Role Based Access Control
        if (session.user.role === 'vendor') {
            if (session.user.vendorId) {
                query.vendorId = new ObjectId(session.user.vendorId);
            } else {
                // Vendor without ID? Should not happen if strictly typed/enforced
                return NextResponse.json({ success: true, data: [], pagination: { total: 0, page, pages: 0 } });
            }
        }
        // Admin/Manager can see all (or filter by specific vendor if param provided?)
        // If admin wants to filter by vendor:
        const vendorIdParam = searchParams.get('vendorId');
        if (vendorIdParam && session.user.role !== 'vendor') {
            query.vendorId = new ObjectId(vendorIdParam);
        }

        const [samples, total] = await Promise.all([
            db.collection(COLLECTIONS.SAMPLES)
                .find(query)
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray(),
            db.collection(COLLECTIONS.SAMPLES).countDocuments(query)
        ]);

        return NextResponse.json({
            success: true,
            data: samples,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error: any) {
        console.error('Error fetching samples:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
