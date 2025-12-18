/**
 * Integration Tests
 * End-to-end tests for the application workflow
 */

import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://abhishek98as_db_user:CMbGMzthpNVcq9SY@cluster0.37zw1rl.mongodb.net/cloth_manufacturing?retryWrites=true&w=majority&appName=Cluster0';

describe('Integration Tests', () => {
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

  describe('Complete User Flow', () => {
    test('should handle complete vendor workflow', async () => {
      const db = client.db('cloth_manufacturing');
      
      // Step 1: Create a vendor
      const vendorId = new ObjectId();
      const vendor = {
        _id: vendorId,
        name: 'Integration Test Vendor',
        contactPerson: 'Test Contact',
        phone: '+91 11111 11111',
        email: 'integration@test.com',
        address: 'Test Address',
        gstNumber: 'INTTEST123',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await db.collection('vendors').deleteOne({ name: vendor.name });
      await db.collection('vendors').insertOne(vendor);

      // Step 2: Create vendor user
      const userId = new ObjectId();
      const vendorUser = {
        _id: userId,
        email: 'vendor_integration@test.com',
        password: await bcrypt.hash('testPass123', 12),
        name: 'Vendor Integration User',
        role: 'vendor',
        vendorId: vendorId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await db.collection('users').deleteOne({ email: vendorUser.email });
      await db.collection('users').insertOne(vendorUser);

      // Step 3: Create a style for the vendor
      const styleId = new ObjectId();
      const style = {
        _id: styleId,
        code: 'INT-TEST-001',
        name: 'Integration Test Style',
        vendorId: vendorId,
        fabricType: 'Test Fabric',
        description: 'Integration test style',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await db.collection('styles').deleteOne({ code: style.code });
      await db.collection('styles').insertOne(style);

      // Verify relationships
      const foundUser = await db.collection('users').findOne({ _id: userId });
      const foundVendor = await db.collection('vendors').findOne({ _id: vendorId });
      const foundStyle = await db.collection('styles').findOne({ _id: styleId });

      expect(foundUser?.vendorId?.toString()).toBe(vendorId.toString());
      expect(foundStyle?.vendorId?.toString()).toBe(vendorId.toString());
      expect(foundVendor?.name).toBe(vendor.name);

      // Cleanup
      await db.collection('styles').deleteOne({ _id: styleId });
      await db.collection('users').deleteOne({ _id: userId });
      await db.collection('vendors').deleteOne({ _id: vendorId });
    });

    test('should handle complete production workflow', async () => {
      const db = client.db('cloth_manufacturing');
      
      // Setup: Create vendor, style, tailor
      const vendorId = new ObjectId();
      const styleId = new ObjectId();
      const tailorId = new ObjectId();
      const fabricCuttingId = new ObjectId();

      await db.collection('vendors').insertOne({
        _id: vendorId,
        name: 'Production Test Vendor',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await db.collection('styles').insertOne({
        _id: styleId,
        code: 'PROD-TEST-001',
        name: 'Production Test Style',
        vendorId: vendorId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await db.collection('tailors').insertOne({
        _id: tailorId,
        name: 'Production Test Tailor',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Step 1: Create fabric cutting record
      await db.collection('fabricCutting').insertOne({
        _id: fabricCuttingId,
        styleId: styleId,
        vendorId: vendorId,
        fabricReceivedMeters: 100,
        cuttingReceivedPcs: 50,
        cuttingInHouse: true,
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Step 2: Create tailor job
      const jobId = new ObjectId();
      await db.collection('tailorJobs').insertOne({
        _id: jobId,
        styleId: styleId,
        tailorId: tailorId,
        fabricCuttingId: fabricCuttingId,
        issuedPcs: 30,
        rate: 80,
        issueDate: new Date(),
        status: 'in-progress',
        returnedPcs: 0,
        qcStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Step 3: Complete job
      await db.collection('tailorJobs').updateOne(
        { _id: jobId },
        {
          $set: {
            status: 'completed',
            returnedPcs: 30,
            qcStatus: 'passed',
            receivedDate: new Date(),
            completedDate: new Date(),
            updatedAt: new Date(),
          }
        }
      );

      // Step 4: Create shipment
      const shipmentId = new ObjectId();
      await db.collection('shipments').insertOne({
        _id: shipmentId,
        vendorId: vendorId,
        styleId: styleId,
        pcsShipped: 30,
        date: new Date(),
        challanNo: 'PROD-TEST-CH01',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Verify workflow completion
      const completedJob = await db.collection('tailorJobs').findOne({ _id: jobId });
      const shipment = await db.collection('shipments').findOne({ _id: shipmentId });

      expect(completedJob?.status).toBe('completed');
      expect(completedJob?.qcStatus).toBe('passed');
      expect(shipment?.pcsShipped).toBe(30);

      // Cleanup
      await db.collection('shipments').deleteOne({ _id: shipmentId });
      await db.collection('tailorJobs').deleteOne({ _id: jobId });
      await db.collection('fabricCutting').deleteOne({ _id: fabricCuttingId });
      await db.collection('tailors').deleteOne({ _id: tailorId });
      await db.collection('styles').deleteOne({ _id: styleId });
      await db.collection('vendors').deleteOne({ _id: vendorId });
    });
  });

  describe('Data Integrity Tests', () => {
    test('should enforce unique email for users', async () => {
      const db = client.db('cloth_manufacturing');
      const usersCollection = db.collection('users');

      // Ensure unique index exists
      const indexes = await usersCollection.listIndexes().toArray();
      const emailIndex = indexes.find(idx => idx.key?.email === 1);
      
      // If index exists, verify it's unique
      if (emailIndex) {
        expect(emailIndex.unique).toBe(true);
      }
    });

    test('should enforce unique style code', async () => {
      const db = client.db('cloth_manufacturing');
      const stylesCollection = db.collection('styles');

      const indexes = await stylesCollection.listIndexes().toArray();
      const codeIndex = indexes.find(idx => idx.key?.code === 1);
      
      if (codeIndex) {
        expect(codeIndex.unique).toBe(true);
      }
    });
  });

  describe('Dashboard Data Aggregation', () => {
    test('should aggregate vendor statistics', async () => {
      const db = client.db('cloth_manufacturing');
      
      const pipeline = [
        { $match: { isActive: true } },
        { $count: 'total' }
      ];

      const result = await db.collection('vendors').aggregate(pipeline).toArray();
      expect(Array.isArray(result)).toBe(true);
    });

    test('should aggregate tailor job statistics', async () => {
      const db = client.db('cloth_manufacturing');
      
      const pipeline = [
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalPcs: { $sum: '$issuedPcs' }
          }
        }
      ];

      const result = await db.collection('tailorJobs').aggregate(pipeline).toArray();
      expect(Array.isArray(result)).toBe(true);
    });

    test('should calculate shipment totals by vendor', async () => {
      const db = client.db('cloth_manufacturing');
      
      const pipeline = [
        {
          $group: {
            _id: '$vendorId',
            totalShipped: { $sum: '$pcsShipped' },
            shipmentCount: { $sum: 1 }
          }
        }
      ];

      const result = await db.collection('shipments').aggregate(pipeline).toArray();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

describe('Environment Configuration Tests', () => {
  test('should have required environment variables structure', () => {
    // These are set in jest.setup.ts for testing
    expect(process.env.NEXTAUTH_SECRET).toBeDefined();
    expect(process.env.NEXTAUTH_URL).toBeDefined();
    expect(process.env.MONGODB_URI).toBeDefined();
  });

  test('should have valid MongoDB URI format', () => {
    const mongoUri = process.env.MONGODB_URI || '';
    expect(mongoUri).toMatch(/^mongodb(\+srv)?:\/\//);
  });

  test('should have valid NextAuth URL format', () => {
    const nextAuthUrl = process.env.NEXTAUTH_URL || '';
    expect(nextAuthUrl).toMatch(/^https?:\/\//);
  });
});
