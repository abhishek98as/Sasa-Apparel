import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { encrypt, decrypt } from '@/lib/encryption';
import { ObjectId } from 'mongodb';

export async function GET() {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const db = await getDb();
        const settings = await db.collection(COLLECTIONS.SETTINGS).findOne({});

        if (!settings) {
            return NextResponse.json({ success: true, data: {} });
        }

        // Decrypt sensitive data
        const decryptedSettings = {
            ...settings,
            mongoConfig: settings.mongoConfig ? {
                ...settings.mongoConfig,
                password: settings.mongoConfig.password ? decrypt(settings.mongoConfig.password) : '',
                atlasUrl: settings.mongoConfig.atlasUrl ? decrypt(settings.mongoConfig.atlasUrl) : '',
            } : undefined
        };

        return NextResponse.json({ success: true, data: decryptedSettings });
    } catch (error) {
        console.error('Failed to fetch settings:', error);
        return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { brandName, brandLogo, favicon, mongoConfig } = body;

        const db = await getDb();

        const updateData: any = {
            updatedAt: new Date(),
            updatedBy: session.user.id
        };

        if (brandName !== undefined) updateData.brandName = brandName;
        if (brandLogo !== undefined) updateData.brandLogo = brandLogo;
        if (favicon !== undefined) updateData.favicon = favicon;

        if (mongoConfig) {
            updateData.mongoConfig = {
                username: mongoConfig.username,
                password: mongoConfig.password ? encrypt(mongoConfig.password) : undefined,
                atlasUrl: mongoConfig.atlasUrl ? encrypt(mongoConfig.atlasUrl) : undefined,
            };
        }

        // Update or Insert (Upsert basically, but we might want to keep the same ID if it exists)
        // Actually, let's just use updateOne with upsert: true on a fixed query if we treat it as a singleton.
        // Or just find one and update.

        const existing = await db.collection(COLLECTIONS.SETTINGS).findOne({});

        if (existing) {
            await db.collection(COLLECTIONS.SETTINGS).updateOne(
                { _id: existing._id },
                { $set: updateData }
            );
        } else {
            await db.collection(COLLECTIONS.SETTINGS).insertOne({
                ...updateData,
                createdAt: new Date()
            });
        }

        return NextResponse.json({ success: true, message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Failed to update settings:', error);
        return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
