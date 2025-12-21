import { MongoClient, ServerApiVersion } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://abhishek98as_db_user:CMbGMzthpNVcq9SY@cluster0.37zw1rl.mongodb.net/cloth_manufacturing?retryWrites=true&w=majority&appName=Cluster0';

async function restoreDatabase(backupFolder: string) {
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
    const backupDir = path.join(process.cwd(), 'backups', backupFolder);

    if (!fs.existsSync(backupDir)) {
      throw new Error(`Backup folder not found: ${backupDir}`);
    }

    // Read all JSON files in backup directory
    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json') && f !== '_metadata.json');
    
    console.log(`📦 Found ${files.length} collections to restore`);

    for (const file of files) {
      const collectionName = file.replace('.json', '');
      const filePath = path.join(backupDir, file);
      
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      if (data.length > 0) {
        const collection = db.collection(collectionName);
        
        // Clear existing data (optional - comment out if you want to merge)
        await collection.deleteMany({});
        
        // Insert backup data
        await collection.insertMany(data);
        console.log(`  ✅ ${collectionName}: ${data.length} documents restored`);
      } else {
        console.log(`  ⚠️ ${collectionName}: No documents to restore`);
      }
    }

    console.log('\n✅ Restore completed successfully!');
    return { success: true };
  } catch (error) {
    console.error('❌ Restore failed:', error);
    return { success: false, error };
  } finally {
    await client.close();
  }
}

// Usage: Pass the backup folder name as argument
const backupFolder = process.argv[2];
if (!backupFolder) {
  console.log('Usage: npx ts-node scripts/restore-database.ts <backup-folder-name>');
  console.log('Example: npx ts-node scripts/restore-database.ts 2025-12-21T10-30-00-000Z');
  process.exit(1);
}

restoreDatabase(backupFolder);
