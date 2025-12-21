import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET - Download backup as JSON
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only allow admin users to backup
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db('cloth_manufacturing');
    
    // Get all collections
    const collections = await db.listCollections().toArray();
    
    const backup: Record<string, any[]> = {};
    const summary: Record<string, number> = {};
    
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      const collection = db.collection(collectionName);
      const documents = await collection.find({}).toArray();
      
      backup[collectionName] = documents;
      summary[collectionName] = documents.length;
    }
    
    const backupData = {
      metadata: {
        timestamp: new Date().toISOString(),
        database: 'cloth_manufacturing',
        collections: summary,
        totalDocuments: Object.values(summary).reduce((a, b) => a + b, 0),
        exportedBy: session.user.email,
      },
      data: backup,
    };
    
    // Return as downloadable JSON file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    return new NextResponse(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="sasa-apparel-backup-${timestamp}.json"`,
      },
    });
  } catch (error) {
    console.error('Backup error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create backup' },
      { status: 500 }
    );
  }
}

// POST - Restore from backup (upload JSON)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only allow admin users to restore
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const backupData = await request.json();
    
    if (!backupData.metadata || !backupData.data) {
      return NextResponse.json(
        { success: false, error: 'Invalid backup format' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('cloth_manufacturing');
    
    const restoreSummary: Record<string, number> = {};
    
    for (const [collectionName, documents] of Object.entries(backupData.data)) {
      if (Array.isArray(documents) && documents.length > 0) {
        const collection = db.collection(collectionName);
        
        // Clear existing data
        await collection.deleteMany({});
        
        // Insert backup data
        await collection.insertMany(documents as any[]);
        restoreSummary[collectionName] = documents.length;
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database restored successfully',
      restored: restoreSummary,
      restoredBy: session.user.email,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Restore error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to restore backup' },
      { status: 500 }
    );
  }
}
