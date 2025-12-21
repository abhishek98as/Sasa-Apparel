import { MongoClient, ServerApiVersion } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://abhishek98as_db_user:CMbGMzthpNVcq9SY@cluster0.37zw1rl.mongodb.net/cloth_manufacturing?retryWrites=true&w=majority&appName=Cluster0';

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
    console.log(`📦 Found ${collections.length} collections to backup`);

    const backupSummary: Record<string, number> = {};

    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      const collection = db.collection(collectionName);
      
      // Get all documents
      const documents = await collection.find({}).toArray();
      
      // Save to JSON file
      const filePath = path.join(backupDir, `${collectionName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(documents, null, 2));
      
      backupSummary[collectionName] = documents.length;
      console.log(`  ✅ ${collectionName}: ${documents.length} documents`);
    }

    // Save backup metadata
    const metadata = {
      timestamp: new Date().toISOString(),
      database: 'cloth_manufacturing',
      collections: backupSummary,
      totalDocuments: Object.values(backupSummary).reduce((a, b) => a + b, 0),
    };
    
    fs.writeFileSync(
      path.join(backupDir, '_metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    console.log('\n✅ Backup completed successfully!');
    console.log(`📁 Backup location: ${backupDir}`);
    console.log(`📊 Total documents: ${metadata.totalDocuments}`);

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
