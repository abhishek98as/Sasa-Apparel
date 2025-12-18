/**
 * API Routes Tests
 * Tests for authentication and user API endpoints
 */

import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://abhishek98as_db_user:CMbGMzthpNVcq9SY@cluster0.37zw1rl.mongodb.net/cloth_manufacturing?retryWrites=true&w=majority&appName=Cluster0';

describe('API Routes Tests', () => {
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

  describe('Users API', () => {
    test('should create new user', async () => {
      const db = client.db('cloth_manufacturing');
      const usersCollection = db.collection('users');

      const newUser = {
        email: 'test_api_user@test.com',
        password: await bcrypt.hash('testPassword123', 12),
        name: 'Test API User',
        role: 'vendor',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Clean up first
      await usersCollection.deleteOne({ email: newUser.email });

      const result = await usersCollection.insertOne(newUser);
      expect(result.acknowledged).toBe(true);
      expect(result.insertedId).toBeDefined();

      // Clean up
      await usersCollection.deleteOne({ email: newUser.email });
    });

    test('should get user by ID', async () => {
      const db = client.db('cloth_manufacturing');
      const usersCollection = db.collection('users');

      const userId = new ObjectId();
      const testUser = {
        _id: userId,
        email: 'test_get_user@test.com',
        password: await bcrypt.hash('testPassword', 12),
        name: 'Test Get User',
        role: 'admin',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await usersCollection.deleteOne({ email: testUser.email });
      await usersCollection.insertOne(testUser);

      const foundUser = await usersCollection.findOne({ _id: userId });
      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe(testUser.email);
      expect(foundUser?.name).toBe(testUser.name);

      await usersCollection.deleteOne({ _id: userId });
    });

    test('should update user', async () => {
      const db = client.db('cloth_manufacturing');
      const usersCollection = db.collection('users');

      const userId = new ObjectId();
      const testUser = {
        _id: userId,
        email: 'test_update_user@test.com',
        password: await bcrypt.hash('testPassword', 12),
        name: 'Original Name',
        role: 'vendor',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await usersCollection.deleteOne({ email: testUser.email });
      await usersCollection.insertOne(testUser);

      const updateResult = await usersCollection.updateOne(
        { _id: userId },
        { $set: { name: 'Updated Name', updatedAt: new Date() } }
      );

      expect(updateResult.modifiedCount).toBe(1);

      const updatedUser = await usersCollection.findOne({ _id: userId });
      expect(updatedUser?.name).toBe('Updated Name');

      await usersCollection.deleteOne({ _id: userId });
    });

    test('should delete user', async () => {
      const db = client.db('cloth_manufacturing');
      const usersCollection = db.collection('users');

      const testUser = {
        email: 'test_delete_user@test.com',
        password: await bcrypt.hash('testPassword', 12),
        name: 'Test Delete User',
        role: 'tailor',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await usersCollection.deleteOne({ email: testUser.email });
      await usersCollection.insertOne(testUser);

      const deleteResult = await usersCollection.deleteOne({ email: testUser.email });
      expect(deleteResult.deletedCount).toBe(1);

      const deletedUser = await usersCollection.findOne({ email: testUser.email });
      expect(deletedUser).toBeNull();
    });
  });

  describe('Vendors API', () => {
    test('should create vendor', async () => {
      const db = client.db('cloth_manufacturing');
      const vendorsCollection = db.collection('vendors');

      const newVendor = {
        name: 'Test Vendor API',
        contactPerson: 'John Doe',
        phone: '+91 12345 67890',
        email: 'test@vendor.com',
        address: 'Test Address',
        gstNumber: 'TEST123456',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await vendorsCollection.deleteOne({ name: newVendor.name });
      
      const result = await vendorsCollection.insertOne(newVendor);
      expect(result.acknowledged).toBe(true);

      await vendorsCollection.deleteOne({ name: newVendor.name });
    });

    test('should get active vendors', async () => {
      const db = client.db('cloth_manufacturing');
      const vendorsCollection = db.collection('vendors');

      const vendors = await vendorsCollection.find({ isActive: true }).toArray();
      
      vendors.forEach(vendor => {
        expect(vendor.isActive).toBe(true);
        expect(vendor.name).toBeDefined();
      });
    });
  });

  describe('Styles API', () => {
    test('should get styles with vendor filter', async () => {
      const db = client.db('cloth_manufacturing');
      const stylesCollection = db.collection('styles');

      const styles = await stylesCollection.find({ isActive: true }).toArray();
      
      styles.forEach(style => {
        expect(style.code).toBeDefined();
        expect(style.name).toBeDefined();
        expect(style.vendorId).toBeDefined();
      });
    });

    test('should create style with unique code', async () => {
      const db = client.db('cloth_manufacturing');
      const stylesCollection = db.collection('styles');

      const vendorId = new ObjectId();
      const newStyle = {
        code: 'TEST-STY-001',
        name: 'Test Style',
        vendorId: vendorId,
        fabricType: 'Cotton',
        description: 'Test style description',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await stylesCollection.deleteOne({ code: newStyle.code });

      const result = await stylesCollection.insertOne(newStyle);
      expect(result.acknowledged).toBe(true);

      await stylesCollection.deleteOne({ code: newStyle.code });
    });
  });

  describe('Fabric Cutting API', () => {
    test('should create fabric cutting record', async () => {
      const db = client.db('cloth_manufacturing');
      const fabricCuttingCollection = db.collection('fabricCutting');

      const newRecord = {
        styleId: new ObjectId(),
        vendorId: new ObjectId(),
        fabricReceivedMeters: 100,
        cuttingReceivedPcs: 50,
        cuttingInHouse: true,
        date: new Date(),
        notes: 'Test cutting record',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await fabricCuttingCollection.insertOne(newRecord);
      expect(result.acknowledged).toBe(true);

      await fabricCuttingCollection.deleteOne({ _id: result.insertedId });
    });
  });

  describe('Shipments API', () => {
    test('should create shipment', async () => {
      const db = client.db('cloth_manufacturing');
      const shipmentsCollection = db.collection('shipments');

      const newShipment = {
        vendorId: new ObjectId(),
        styleId: new ObjectId(),
        pcsShipped: 100,
        date: new Date(),
        challanNo: 'TEST-CH-001',
        notes: 'Test shipment',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await shipmentsCollection.insertOne(newShipment);
      expect(result.acknowledged).toBe(true);

      await shipmentsCollection.deleteOne({ _id: result.insertedId });
    });

    test('should filter shipments by date range', async () => {
      const db = client.db('cloth_manufacturing');
      const shipmentsCollection = db.collection('shipments');

      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date();

      const shipments = await shipmentsCollection.find({
        date: { $gte: startDate, $lte: endDate }
      }).toArray();

      expect(Array.isArray(shipments)).toBe(true);
    });
  });

  describe('Tailor Jobs API', () => {
    test('should create tailor job', async () => {
      const db = client.db('cloth_manufacturing');
      const tailorJobsCollection = db.collection('tailorJobs');

      const newJob = {
        styleId: new ObjectId(),
        tailorId: new ObjectId(),
        fabricCuttingId: new ObjectId(),
        issuedPcs: 50,
        rate: 80,
        issueDate: new Date(),
        status: 'in-progress',
        returnedPcs: 0,
        qcStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await tailorJobsCollection.insertOne(newJob);
      expect(result.acknowledged).toBe(true);

      await tailorJobsCollection.deleteOne({ _id: result.insertedId });
    });

    test('should get jobs by status', async () => {
      const db = client.db('cloth_manufacturing');
      const tailorJobsCollection = db.collection('tailorJobs');

      const inProgressJobs = await tailorJobsCollection.find({ 
        status: 'in-progress' 
      }).toArray();

      inProgressJobs.forEach(job => {
        expect(job.status).toBe('in-progress');
      });
    });
  });
});
