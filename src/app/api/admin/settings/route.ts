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
            } : undefined,
            imageKitConfig: settings.imageKitConfig ? {
                ...settings.imageKitConfig,
                privateKey: settings.imageKitConfig.privateKey ? decrypt(settings.imageKitConfig.privateKey) : '',
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
        const { brandName, brandLogo, favicon, mongoConfig, imageKitConfig } = body;

        const db = await getDb();

        const updateData: any = {
            updatedAt: new Date(),
            updatedBy: session.user.id
        };

        // Always update these fields when provided (even if empty string)
        if (brandName !== undefined) updateData.brandName = brandName;
        if (brandLogo !== undefined) updateData.brandLogo = brandLogo;
        if (favicon !== undefined) updateData.favicon = favicon;

        if (mongoConfig) {
            updateData.mongoConfig = {
                username: mongoConfig.username || '',
                password: mongoConfig.password ? encrypt(mongoConfig.password) : '',
                atlasUrl: mongoConfig.atlasUrl ? encrypt(mongoConfig.atlasUrl) : '',
            };
        }

        if (imageKitConfig) {
            updateData.imageKitConfig = {
                urlEndpoint: imageKitConfig.urlEndpoint || '',
                publicKey: imageKitConfig.publicKey || '',
                privateKey: imageKitConfig.privateKey ? encrypt(imageKitConfig.privateKey) : '',
            };
        }

        // Use upsert to create or update the single settings document
        await db.collection(COLLECTIONS.SETTINGS).updateOne(
            {},  // Empty filter matches any document (for singleton pattern)
            { 
                $set: updateData,
                $setOnInsert: { createdAt: new Date() }
            },
            { upsert: true }
        );

        return NextResponse.json({ success: true, message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Failed to update settings:', error);
        return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
