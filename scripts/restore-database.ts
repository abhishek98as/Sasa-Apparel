import { MongoClient, ServerApiVersion, ObjectId, Binary } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://abhishek98as_db_user:CMbGMzthpNVcq9SY@cluster0.37zw1rl.mongodb.net/cloth_manufacturing?retryWrites=true&w=majority&appName=Cluster0';

// Custom JSON deserializer to restore MongoDB types
function deserializeDocument(doc: any): any {
  if (doc === null || doc === undefined) return doc;
  
  // Check for MongoDB extended JSON types
  if (typeof doc === 'object' && !Array.isArray(doc)) {
    // Restore ObjectId
    if (doc.$oid) {
      return new ObjectId(doc.$oid);
    }
    
    // Restore Date
    if (doc.$date) {
      return new Date(doc.$date);
    }
    
    // Restore Binary
    if (doc.$binary) {
      return new Binary(Buffer.from(doc.$binary.base64, 'base64'), parseInt(doc.$binary.subType, 16));
    }
    
    // Restore RegExp
    if (doc.$regex !== undefined) {
      return new RegExp(doc.$regex, doc.$options || '');
    }
    
    // Recursively process nested objects
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

// Prompt user for confirmation
async function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

interface RestoreOptions {
  dropExisting?: boolean;
  restoreIndexes?: boolean;
  collections?: string[];
  skipConfirmation?: boolean;
  mergeMode?: boolean;
}

async function restoreDatabase(backupFolder: string, options: RestoreOptions = {}) {
  const {
    dropExisting = true,
    restoreIndexes = true,
    collections = [],
    skipConfirmation = false,
    mergeMode = false,
  } = options;

  const client = new MongoClient(MONGODB_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  try {
    // Determine backup directory
    let backupDir: string;
    
    if (path.isAbsolute(backupFolder)) {
      backupDir = backupFolder;
    } else if (backupFolder.endsWith('.json')) {
      backupDir = path.dirname(backupFolder);
    } else {
      backupDir = path.join(process.cwd(), 'backups', backupFolder);
    }

    if (!fs.existsSync(backupDir)) {
      throw new Error(`Backup folder not found: ${backupDir}`);
    }

    // Check for full backup file first
    const fullBackupPath = path.join(backupDir, '_full_backup.json');
    let backupData: any = null;
    let indexData: Record<string, any[]> = {};

    if (fs.existsSync(fullBackupPath)) {
      console.log('📄 Found full backup file, using it for complete restoration');
      backupData = JSON.parse(fs.readFileSync(fullBackupPath, 'utf-8'));
      indexData = backupData.indexes || {};
    } else {
      const indexFilePath = path.join(backupDir, '_indexes.json');
      if (fs.existsSync(indexFilePath)) {
        indexData = JSON.parse(fs.readFileSync(indexFilePath, 'utf-8'));
      }
    }

    // Read metadata
    const metadataPath = path.join(backupDir, '_metadata.json');
    let metadata: any = { version: '1.0' };
    if (fs.existsSync(metadataPath)) {
      metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    }

    console.log('\n' + '═'.repeat(50));
    console.log('📋 BACKUP INFORMATION');
    console.log('═'.repeat(50));
    console.log(`   Version: ${metadata.version || '1.0'}`);
    console.log(`   Timestamp: ${metadata.timestamp || 'Unknown'}`);
    console.log(`   Database: ${metadata.database || 'cloth_manufacturing'}`);
    console.log(`   Total Documents: ${metadata.totalDocuments || 'Unknown'}`);
    console.log(`   Total Collections: ${metadata.totalCollections || 'Unknown'}`);
    if (metadata.features) {
      console.log(`   Features: ${metadata.features.join(', ')}`);
    }
    console.log('═'.repeat(50));

    // Confirm restoration
    if (!skipConfirmation) {
      console.log('\n⚠️  WARNING: This will restore the database from backup.');
      if (dropExisting && !mergeMode) {
        console.log('   Existing data in collections will be DELETED!');
      }
      if (mergeMode) {
        console.log('   Data will be MERGED with existing records.');
      }
      const confirmed = await askConfirmation('\nDo you want to proceed? (y/n): ');
      if (!confirmed) {
        console.log('❌ Restoration cancelled by user');
        return { success: false, reason: 'cancelled' };
      }
    }

    await client.connect();
    console.log('\n✅ Connected to MongoDB');

    const db = client.db('cloth_manufacturing');

    // Get list of collections to restore
    let filesToRestore: string[];
    
    if (backupData) {
      filesToRestore = Object.keys(backupData.data);
    } else {
      filesToRestore = fs.readdirSync(backupDir)
        .filter(f => f.endsWith('.json') && !f.startsWith('_'))
        .map(f => f.replace('.json', ''));
    }

    // Filter collections if specified
    if (collections.length > 0) {
      filesToRestore = filesToRestore.filter(c => collections.includes(c));
    }

    console.log(`\n📦 Restoring ${filesToRestore.length} collections...\n`);

    const restoreSummary: Record<string, { documents: number; indexes: number }> = {};

    for (const collectionName of filesToRestore) {
      let documents: any[];
      
      if (backupData) {
        documents = backupData.data[collectionName] || [];
      } else {
        const filePath = path.join(backupDir, `${collectionName}.json`);
        if (!fs.existsSync(filePath)) {
          console.log(`  ⚠️ Skipping ${collectionName}: File not found`);
          continue;
        }
        documents = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }

      // Deserialize documents (restore ObjectIds, Dates, Binary, etc.)
      const deserializedDocs = documents.map(doc => deserializeDocument(doc));

      const collection = db.collection(collectionName);

      if (deserializedDocs.length > 0) {
        if (dropExisting && !mergeMode) {
          await collection.deleteMany({});
        }

        if (mergeMode) {
          let upsertCount = 0;
          for (const doc of deserializedDocs) {
            const filter = doc._id ? { _id: doc._id } : doc;
            await collection.replaceOne(filter, doc, { upsert: true });
            upsertCount++;
          }
        } else {
          await collection.insertMany(deserializedDocs);
        }

        let indexesRestored = 0;
        
        // Restore indexes
        if (restoreIndexes && indexData[collectionName]) {
          for (const index of indexData[collectionName]) {
            try {
              const { key, ...indexOptions } = index;
              delete indexOptions.v;
              delete indexOptions.ns;
              await collection.createIndex(key, indexOptions);
              indexesRestored++;
            } catch (indexError: any) {
              if (!indexError.message.includes('already exists')) {
                console.log(`    ⚠️ Index error: ${indexError.message}`);
              }
            }
          }
        }

        restoreSummary[collectionName] = {
          documents: deserializedDocs.length,
          indexes: indexesRestored,
        };
        
        console.log(`  ✅ ${collectionName}: ${deserializedDocs.length} documents, ${indexesRestored} indexes`);
      } else {
        try {
          await db.createCollection(collectionName);
        } catch (e) {}
        restoreSummary[collectionName] = { documents: 0, indexes: 0 };
        console.log(`  ⚠️ ${collectionName}: Empty collection created`);
      }
    }

    // Verify restoration
    console.log('\n🔍 Verifying restoration...');
    let totalRestored = 0;
    const verification: Record<string, number> = {};
    
    for (const collectionName of filesToRestore) {
      const collection = db.collection(collectionName);
      const count = await collection.countDocuments();
      verification[collectionName] = count;
      totalRestored += count;
    }

    console.log('\n' + '═'.repeat(50));
    console.log('✅ RESTORE COMPLETED SUCCESSFULLY!');
    console.log('═'.repeat(50));
    console.log(`📊 Total documents restored: ${totalRestored}`);
    console.log(`📋 Collections restored: ${filesToRestore.length}`);
    console.log('\n📝 Verification Summary:');
    for (const [name, count] of Object.entries(verification)) {
      const expected = restoreSummary[name]?.documents || 0;
      const status = count === expected ? '✅' : '⚠️';
      console.log(`   ${status} ${name}: ${count} documents`);
    }
    console.log('═'.repeat(50));

    return { success: true, summary: restoreSummary, totalRestored, verification };
  } catch (error) {
    console.error('❌ Restore failed:', error);
    return { success: false, error };
  } finally {
    await client.close();
  }
}

// List available backups
function listBackups() {
  const backupsDir = path.join(process.cwd(), 'backups');
  
  if (!fs.existsSync(backupsDir)) {
    console.log('No backups directory found');
    return [];
  }

  const backups = fs.readdirSync(backupsDir)
    .filter(f => fs.statSync(path.join(backupsDir, f)).isDirectory())
    .sort()
    .reverse();

  console.log('\n' + '═'.repeat(50));
  console.log('📁 AVAILABLE BACKUPS');
  console.log('═'.repeat(50) + '\n');
  
  for (const backup of backups) {
    const metadataPath = path.join(backupsDir, backup, '_metadata.json');
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      console.log(`  📦 ${backup}`);
      console.log(`     Version: ${metadata.version || '1.0'}`);
      console.log(`     Documents: ${metadata.totalDocuments}`);
      console.log(`     Collections: ${metadata.totalCollections}`);
      console.log(`     Created: ${metadata.timestamp}\n`);
    } else {
      console.log(`  📦 ${backup} (no metadata)\n`);
    }
  }

  return backups;
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

if (command === 'list' || command === '-l') {
  listBackups();
} else if (command === 'latest') {
  const backupsDir = path.join(process.cwd(), 'backups');
  if (fs.existsSync(backupsDir)) {
    const backups = fs.readdirSync(backupsDir)
      .filter(f => fs.statSync(path.join(backupsDir, f)).isDirectory())
      .sort()
      .reverse();
    
    if (backups.length > 0) {
      console.log(`\n🔄 Restoring latest backup: ${backups[0]}`);
      restoreDatabase(backups[0], { skipConfirmation: args.includes('-y') });
    } else {
      console.log('No backups available');
    }
  } else {
    console.log('No backups directory found');
  }
} else if (command) {
  const options: RestoreOptions = {
    skipConfirmation: args.includes('-y') || args.includes('--yes'),
    mergeMode: args.includes('--merge'),
    dropExisting: !args.includes('--no-drop'),
    restoreIndexes: !args.includes('--no-indexes'),
  };
  
  // Parse collection filter
  const collIdx = args.indexOf('--collections');
  if (collIdx !== -1 && args[collIdx + 1]) {
    options.collections = args[collIdx + 1].split(',');
  }
  
  restoreDatabase(command, options);
} else {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║        DATABASE RESTORE TOOL - End-to-End Recovery           ║
╚══════════════════════════════════════════════════════════════╝

Usage: npx tsx scripts/restore-database.ts <command> [options]

Commands:
  <backup-folder>    Restore specific backup
  list, -l           List all available backups
  latest             Restore the most recent backup

Options:
  -y, --yes              Skip confirmation prompt
  --merge                Merge with existing data (upsert mode)
  --no-drop              Don't delete existing data before restore
  --no-indexes           Skip index restoration
  --collections <list>   Restore specific collections (comma-separated)

Examples:
  npx tsx scripts/restore-database.ts list
  npx tsx scripts/restore-database.ts 2025-12-21T17-46-05-228Z
  npx tsx scripts/restore-database.ts latest -y
  npx tsx scripts/restore-database.ts 2025-12-21T17-46-05-228Z --merge
  npx tsx scripts/restore-database.ts 2025-12-21T17-46-05-228Z --collections users,tailors

Features:
  ✅ Full ObjectId restoration
  ✅ Date field restoration  
  ✅ Binary data restoration
  ✅ Index restoration
  ✅ Verification after restore
  ✅ Merge mode support
  ✅ Selective collection restore
`);
}

export { restoreDatabase, listBackups };
