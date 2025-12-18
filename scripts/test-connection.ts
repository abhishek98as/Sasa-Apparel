/**
 * MongoDB Atlas Connection Test
 * Run: npx tsx scripts/test-connection.ts
 */

import { MongoClient, ServerApiVersion } from 'mongodb';

const uri = "mongodb+srv://abhishek98as_db_user:CMbGMzthpNVcq9SY@cluster0.37zw1rl.mongodb.net/cloth_manufacturing?retryWrites=true&w=majority&appName=Cluster0";

async function testConnection() {
  console.log('🔌 Testing MongoDB Atlas Connection...\n');
  
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

  try {
    // Connect to the server
    await client.connect();
    
    // Ping to confirm connection
    await client.db("admin").command({ ping: 1 });
    console.log('✅ Successfully connected to MongoDB Atlas!');
    
    // Get database info
    const db = client.db('cloth_manufacturing');
    const collections = await db.listCollections().toArray();
    
    console.log(`\n📊 Database: cloth_manufacturing`);
    console.log(`📁 Collections found: ${collections.length}`);
    
    if (collections.length > 0) {
      console.log('\nExisting collections:');
      for (const col of collections) {
        const count = await db.collection(col.name).countDocuments();
        console.log(`  - ${col.name}: ${count} documents`);
      }
    } else {
      console.log('\n⚠️  No collections found. Database is empty.');
      console.log('   Run "npm run seed" to populate with test data.');
    }
    
    console.log('\n✅ Connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Connection failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

testConnection().catch(console.error);
