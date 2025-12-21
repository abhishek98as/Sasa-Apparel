import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Serialize MongoDB types for JSON export
function serializeDocument(doc: any): any {
  if (doc === null || doc === undefined) return doc;
  
  if (doc instanceof ObjectId) {
    return { $oid: doc.toHexString() };
  }
  
  if (doc instanceof Date) {
    return { $date: doc.toISOString() };
  }
  
  if (Array.isArray(doc)) {
    return doc.map(item => serializeDocument(item));
  }
  
  if (typeof doc === 'object') {
    const result: any = {};
    for (const key of Object.keys(doc)) {
      result[key] = serializeDocument(doc[key]);
    }
    return result;
  }
  
  return doc;
}

// Deserialize JSON back to MongoDB types
function deserializeDocument(doc: any): any {
  if (doc === null || doc === undefined) return doc;
  
  if (typeof doc === 'object' && !Array.isArray(doc)) {
    if (doc.$oid) {
      return new ObjectId(doc.$oid);
    }
    
    if (doc.$date) {
      return new Date(doc.$date);
    }
    
    const result: any = {};
    for (const key of Object.keys(doc)) {
      result[key] = deserializeDocument(doc[key]);
    }
    return result;
  }
  
  if (Array.isArray(doc)) {
    return doc.map(item => deserializeDocument(item));
  }
  
  return doc;
}

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
    const indexes: Record<string, any[]> = {};
    const summary: Record<string, number> = {};
    
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      const collection = db.collection(collectionName);
      
      // Get all documents with proper serialization
      const documents = await collection.find({}).toArray();
      const serializedDocs = documents.map(doc => serializeDocument(doc));
      
      // Get indexes (excluding default _id)
      const collectionIndexes = await collection.indexes();
      indexes[collectionName] = collectionIndexes.filter(idx => idx.name !== '_id_');
      
      backup[collectionName] = serializedDocs;
      summary[collectionName] = documents.length;
    }
    
    const backupData = {
      metadata: {
        version: '2.0',
        timestamp: new Date().toISOString(),
        database: 'cloth_manufacturing',
        collections: summary,
        totalDocuments: Object.values(summary).reduce((a, b) => a + b, 0),
        totalCollections: collections.length,
        hasIndexes: true,
        exportedBy: session.user.email,
        features: [
          'ObjectId preservation',
          'Date preservation',
          'Index backup',
          'Full restoration support',
        ],
      },
      indexes,
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
    
    const restoreSummary: Record<string, { documents: number; indexes: number }> = {};
    
    for (const [collectionName, documents] of Object.entries(backupData.data)) {
      if (Array.isArray(documents)) {
        const collection = db.collection(collectionName);
        
        // Clear existing data
        await collection.deleteMany({});
        
        if (documents.length > 0) {
          // Deserialize and insert documents
          const deserializedDocs = documents.map(doc => deserializeDocument(doc));
          await collection.insertMany(deserializedDocs);
        }
        
        // Restore indexes if available
        let indexesRestored = 0;
        if (backupData.indexes && backupData.indexes[collectionName]) {
          for (const index of backupData.indexes[collectionName]) {
            try {
              const { key, ...indexOptions } = index;
              delete indexOptions.v;
              delete indexOptions.ns;
              await collection.createIndex(key, indexOptions);
              indexesRestored++;
            } catch (indexError: any) {
              if (!indexError.message?.includes('already exists')) {
                console.log(`Index warning for ${collectionName}: ${indexError.message}`);
              }
            }
          }
        }
        
        restoreSummary[collectionName] = {
          documents: documents.length,
          indexes: indexesRestored,
        };
      }
    }
    
    // Verify restoration
    const verification: Record<string, number> = {};
    for (const collectionName of Object.keys(backupData.data)) {
      const collection = db.collection(collectionName);
      verification[collectionName] = await collection.countDocuments();
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database restored successfully with full data type preservation',
      restored: restoreSummary,
      verification,
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
