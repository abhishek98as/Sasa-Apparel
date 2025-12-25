import { MongoClient, ServerApiVersion } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://abhishek98as_db_user:CMbGMzthpNVcq9SY@cluster0.37zw1rl.mongodb.net/cloth_manufacturing?retryWrites=true&w=majority&appName=Cluster0';

async function resetDatabase() {
  console.log('Connecting to MongoDB Atlas...');
  const client = new MongoClient(MONGODB_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas!');
    const db = client.db('cloth_manufacturing');
    
    console.log('Clearing all data from database...');
    const collections = await db.listCollections().toArray();
    
    for (const collection of collections) {
      await db.collection(collection.name).deleteMany({});
      console.log(`  ✅ Cleared ${collection.name}`);
    }
    
    console.log('\n✅ Database reset complete! All data has been removed.');
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    throw error;
  } finally {
    await client.close();
  }
}

resetDatabase();
