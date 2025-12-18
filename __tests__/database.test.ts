/**
 * Database Connection Tests
 * Tests to verify MongoDB Atlas connection is working properly
 */

import { MongoClient, ServerApiVersion } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://abhishek98as_db_user:CMbGMzthpNVcq9SY@cluster0.37zw1rl.mongodb.net/cloth_manufacturing?retryWrites=true&w=majority&appName=Cluster0';

describe('Database Connection Tests', () => {
  let client: MongoClient;

  beforeAll(async () => {
    client = new MongoClient(MONGODB_URI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
  });

  afterAll(async () => {
    if (client) {
      await client.close();
    }
  });

  describe('MongoDB Atlas Connection', () => {
    test('should connect to MongoDB Atlas successfully', async () => {
      try {
        await client.connect();
        const adminDb = client.db().admin();
        const result = await adminDb.ping();
        expect(result).toEqual({ ok: 1 });
      } catch (error) {
        console.error('MongoDB Atlas connection failed:', error);
        throw new Error('MongoDB Atlas connection failed - check your connection string and network');
      }
    });

    test('should access the database', async () => {
      try {
        await client.connect();
        const db = client.db('cloth_manufacturing');
        expect(db).toBeDefined();
        expect(db.databaseName).toBe('cloth_manufacturing');
      } catch (error) {
        console.error('Database access failed:', error);
        throw error;
      }
    });

    test('should list collections in database', async () => {
      try {
        await client.connect();
        const db = client.db('cloth_manufacturing');
        const collections = await db.listCollections().toArray();
        expect(Array.isArray(collections)).toBe(true);
      } catch (error) {
        console.error('Collection listing failed:', error);
        throw error;
      }
    });
  });

  describe('Database Operations', () => {
    test('should create and query test document', async () => {
      try {
        await client.connect();
        const db = client.db('cloth_manufacturing');
        const testCollection = db.collection('test_connection');
        
        // Clean up any existing test data
        await testCollection.deleteMany({ _test: true });
        
        // Insert test document
        const testDoc = { 
          _test: true, 
          message: 'Connection test', 
          timestamp: new Date() 
        };
        const insertResult = await testCollection.insertOne(testDoc);
        expect(insertResult.acknowledged).toBe(true);
        expect(insertResult.insertedId).toBeDefined();
        
        // Query the document
        const foundDoc = await testCollection.findOne({ _test: true });
        expect(foundDoc).toBeDefined();
        expect(foundDoc?.message).toBe('Connection test');
        
        // Clean up
        await testCollection.deleteMany({ _test: true });
      } catch (error) {
        console.error('CRUD operations failed:', error);
        throw error;
      }
    });

    test('should perform index operations', async () => {
      try {
        await client.connect();
        const db = client.db('cloth_manufacturing');
        const testCollection = db.collection('test_indexes');
        
        // Create an index
        await testCollection.createIndex({ email: 1 });
        
        // List indexes
        const indexes = await testCollection.listIndexes().toArray();
        expect(indexes.length).toBeGreaterThan(0);
        
        // Clean up
        await testCollection.drop().catch(() => {}); // Ignore if doesn't exist
      } catch (error) {
        console.error('Index operations failed:', error);
        throw error;
      }
    });
  });
});

describe('Database Collections Existence Tests', () => {
  let client: MongoClient;

  beforeAll(async () => {
    client = new MongoClient(MONGODB_URI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
    await client.connect();
  });

  afterAll(async () => {
    if (client) {
      await client.close();
    }
  });

  const expectedCollections = [
    'users',
    'vendors', 
    'styles',
    'fabricCutting',
    'tailorJobs',
    'shipments',
    'rates',
    'tailors',
  ];

  // Check if each collection can be accessed (may not exist until seeded)
  test.each(expectedCollections)(
    'should be able to access %s collection',
    async (collectionName) => {
      try {
        const db = client.db('cloth_manufacturing');
        const collection = db.collection(collectionName);
        expect(collection).toBeDefined();
        // Try to count documents (won't fail even if empty)
        const count = await collection.countDocuments();
        expect(typeof count).toBe('number');
      } catch (error) {
        console.error(`Collection ${collectionName} access failed:`, error);
        throw error;
      }
    }
  );
});
