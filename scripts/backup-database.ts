import { MongoClient, ServerApiVersion, ObjectId, Binary } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://abhishek98as_db_user:CMbGMzthpNVcq9SY@cluster0.37zw1rl.mongodb.net/cloth_manufacturing?retryWrites=true&w=majority&appName=Cluster0';

// Custom JSON serializer to preserve MongoDB types (ObjectId, Date, Binary, etc.)
function serializeDocument(doc: any): any {
  if (doc === null || doc === undefined) return doc;
  
  // Handle ObjectId
  if (doc instanceof ObjectId) {
    return { $oid: doc.toHexString() };
  }
  
  // Handle Date
  if (doc instanceof Date) {
    return { $date: doc.toISOString() };
  }
  
  // Handle Binary
  if (doc instanceof Binary) {
    return { $binary: { base64: doc.toString('base64'), subType: doc.sub_type.toString(16) } };
  }
  
  // Handle RegExp
  if (doc instanceof RegExp) {
    return { $regex: doc.source, $options: doc.flags };
  }
  
  // Handle Arrays
  if (Array.isArray(doc)) {
    return doc.map(item => serializeDocument(item));
  }
  
  // Handle nested objects
  if (typeof doc === 'object') {
    const result: any = {};
    for (const key of Object.keys(doc)) {
      result[key] = serializeDocument(doc[key]);
    }
    return result;
  }
  
  return doc;
}

async function backupDatabase() {
  const client = new MongoClient(MONGODB_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('cloth_manufacturing');
    
    // Create backup directory with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'backups', timestamp);
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Get all collections
    const collections = await db.listCollections().toArray();
    console.log(`📦 Found ${collections.length} collections to backup\n`);

    const backupSummary: Record<string, number> = {};
    const collectionIndexes: Record<string, any[]> = {};
    const fullBackupData: Record<string, any[]> = {};

    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      const collection = db.collection(collectionName);
      
      // Get all documents with proper serialization
      const documents = await collection.find({}).toArray();
      const serializedDocs = documents.map(doc => serializeDocument(doc));
      
      // Get collection indexes for complete restoration
      const indexes = await collection.indexes();
      collectionIndexes[collectionName] = indexes.filter(idx => idx.name !== '_id_');
      
      // Save documents to individual JSON file
      const filePath = path.join(backupDir, `${collectionName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(serializedDocs, null, 2));
      
      // Store for full backup
      fullBackupData[collectionName] = serializedDocs;
      
      backupSummary[collectionName] = documents.length;
      console.log(`  ✅ ${collectionName}: ${documents.length} documents, ${collectionIndexes[collectionName].length} indexes`);
    }

    // Save indexes separately
    fs.writeFileSync(
      path.join(backupDir, '_indexes.json'),
      JSON.stringify(collectionIndexes, null, 2)
    );

    // Save comprehensive backup metadata
    const metadata = {
      version: '2.0',
      timestamp: new Date().toISOString(),
      database: 'cloth_manufacturing',
      mongodbUri: MONGODB_URI.replace(/:[^:@]+@/, ':****@'), // Hide password
      collections: backupSummary,
      totalDocuments: Object.values(backupSummary).reduce((a, b) => a + b, 0),
      totalCollections: collections.length,
      hasIndexes: true,
      backupType: 'full',
      nodeVersion: process.version,
      features: [
        'ObjectId preservation',
        'Date preservation',
        'Binary preservation',
        'Index backup',
        'Full backup file',
      ],
    };
    
    fs.writeFileSync(
      path.join(backupDir, '_metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    // Create a single combined backup file for easy download/transfer
    const fullBackup = {
      metadata,
      indexes: collectionIndexes,
      data: fullBackupData,
    };

    fs.writeFileSync(
      path.join(backupDir, '_full_backup.json'),
      JSON.stringify(fullBackup, null, 2)
    );

    console.log('\n' + '═'.repeat(50));
    console.log('✅ BACKUP COMPLETED SUCCESSFULLY!');
    console.log('═'.repeat(50));
    console.log(`📁 Location: ${backupDir}`);
    console.log(`📊 Total documents: ${metadata.totalDocuments}`);
    console.log(`📋 Total collections: ${metadata.totalCollections}`);
    console.log(`📄 Full backup: _full_backup.json`);
    console.log(`🔑 Indexes saved: _indexes.json`);
    console.log('═'.repeat(50));

    return { success: true, backupDir, metadata };
  } catch (error) {
    console.error('❌ Backup failed:', error);
    return { success: false, error };
  } finally {
    await client.close();
  }
}

// Run backup
backupDatabase();
