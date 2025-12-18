/**
 * MongoDB Atlas Database Tests Runner
 * Run: npx tsx scripts/run-db-tests.ts
 * 
 * These tests verify MongoDB Atlas connection and all CRUD operations
 */

import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

const MONGODB_URI = 'mongodb+srv://abhishek98as_db_user:CMbGMzthpNVcq9SY@cluster0.37zw1rl.mongodb.net/cloth_manufacturing?retryWrites=true&w=majority&appName=Cluster0';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, error?: string) {
  results.push({ name, passed, error });
  if (passed) {
    console.log(`  ✅ ${name}`);
  } else {
    console.log(`  ❌ ${name}`);
    if (error) console.log(`     Error: ${error}`);
  }
}

async function runTests() {
  console.log('\n🧪 Running MongoDB Atlas Database Tests\n');
  console.log('=' .repeat(60) + '\n');

  const client = new MongoClient(MONGODB_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

  try {
    // ========== CONNECTION TESTS ==========
    console.log('📡 Connection Tests:');
    
    // Test 1: Basic connection
    try {
      await client.connect();
      await client.db("admin").command({ ping: 1 });
      logTest('Connect to MongoDB Atlas', true);
    } catch (e: any) {
      logTest('Connect to MongoDB Atlas', false, e.message);
      throw e; // Can't continue without connection
    }

    // Test 2: Access database
    try {
      const db = client.db('cloth_manufacturing');
      if (db.databaseName === 'cloth_manufacturing') {
        logTest('Access cloth_manufacturing database', true);
      } else {
        logTest('Access cloth_manufacturing database', false, 'Wrong database name');
      }
    } catch (e: any) {
      logTest('Access cloth_manufacturing database', false, e.message);
    }

    // Test 3: List collections
    try {
      const db = client.db('cloth_manufacturing');
      const collections = await db.listCollections().toArray();
      logTest(`List collections (found ${collections.length})`, true);
    } catch (e: any) {
      logTest('List collections', false, e.message);
    }

    // ========== USER TESTS ==========
    console.log('\n👤 User Authentication Tests:');
    
    const db = client.db('cloth_manufacturing');
    
    // Test 4: Find admin user
    try {
      const admin = await db.collection('users').findOne({ email: 'admin@sasa.com' });
      if (admin && admin.role === 'admin') {
        logTest('Find admin user (admin@sasa.com)', true);
      } else {
        logTest('Find admin user (admin@sasa.com)', false, 'User not found or invalid role');
      }
    } catch (e: any) {
      logTest('Find admin user (admin@sasa.com)', false, e.message);
    }

    // Test 5: Find vendor user  
    try {
      const vendor = await db.collection('users').findOne({ email: 'vendor@test.com' });
      if (vendor && vendor.role === 'vendor') {
        logTest('Find vendor user (vendor@test.com)', true);
      } else {
        logTest('Find vendor user (vendor@test.com)', false, 'User not found or invalid role');
      }
    } catch (e: any) {
      logTest('Find vendor user (vendor@test.com)', false, e.message);
    }

    // Test 6: Verify password hashing works
    try {
      const admin = await db.collection('users').findOne({ email: 'admin@sasa.com' });
      if (admin) {
        const isValid = await bcrypt.compare('admin123', admin.password);
        logTest('Verify admin password (admin123)', isValid, isValid ? undefined : 'Password mismatch');
      } else {
        logTest('Verify admin password (admin123)', false, 'Admin user not found');
      }
    } catch (e: any) {
      logTest('Verify admin password (admin123)', false, e.message);
    }

    // Test 7: Verify vendor password
    try {
      const vendor = await db.collection('users').findOne({ email: 'vendor@test.com' });
      if (vendor) {
        const isValid = await bcrypt.compare('vendor123', vendor.password);
        logTest('Verify vendor password (vendor123)', isValid, isValid ? undefined : 'Password mismatch');
      } else {
        logTest('Verify vendor password (vendor123)', false, 'Vendor user not found');
      }
    } catch (e: any) {
      logTest('Verify vendor password (vendor123)', false, e.message);
    }

    // ========== COLLECTION DATA TESTS ==========
    console.log('\n📊 Collection Data Tests:');

    const collections = ['users', 'vendors', 'styles', 'tailors', 'fabricCutting', 'tailorJobs', 'shipments', 'rates'];
    
    for (const collName of collections) {
      try {
        const count = await db.collection(collName).countDocuments();
        logTest(`Collection '${collName}' has ${count} documents`, count > 0, count === 0 ? 'No documents found' : undefined);
      } catch (e: any) {
        logTest(`Collection '${collName}'`, false, e.message);
      }
    }

    // ========== CRUD OPERATION TESTS ==========
    console.log('\n🔧 CRUD Operation Tests:');

    // Test: Create, Read, Update, Delete
    const testCollection = db.collection('test_crud');
    
    // Clean up before test
    await testCollection.deleteMany({ _test: true });
    
    // Create
    try {
      const insertResult = await testCollection.insertOne({ 
        _test: true, 
        message: 'Test document',
        timestamp: new Date()
      });
      logTest('Create document', insertResult.acknowledged);
    } catch (e: any) {
      logTest('Create document', false, e.message);
    }

    // Read
    try {
      const doc = await testCollection.findOne({ _test: true });
      logTest('Read document', doc !== null && doc.message === 'Test document');
    } catch (e: any) {
      logTest('Read document', false, e.message);
    }

    // Update
    try {
      const updateResult = await testCollection.updateOne(
        { _test: true },
        { $set: { message: 'Updated message' } }
      );
      logTest('Update document', updateResult.modifiedCount === 1);
    } catch (e: any) {
      logTest('Update document', false, e.message);
    }

    // Delete
    try {
      const deleteResult = await testCollection.deleteMany({ _test: true });
      logTest('Delete document', deleteResult.deletedCount >= 1);
    } catch (e: any) {
      logTest('Delete document', false, e.message);
    }

    // ========== RELATIONSHIP TESTS ==========
    console.log('\n🔗 Relationship Tests:');

    // Test: Vendor-Style relationship
    try {
      const vendor = await db.collection('vendors').findOne({});
      if (vendor) {
        const stylesCount = await db.collection('styles').countDocuments({ vendorId: vendor._id });
        logTest(`Vendor-Style relationship (${stylesCount} styles for vendor)`, true);
      } else {
        logTest('Vendor-Style relationship', false, 'No vendors found');
      }
    } catch (e: any) {
      logTest('Vendor-Style relationship', false, e.message);
    }

    // Test: Tailor-Job relationship
    try {
      const tailor = await db.collection('tailors').findOne({});
      if (tailor) {
        const jobsCount = await db.collection('tailorJobs').countDocuments({ tailorId: tailor._id });
        logTest(`Tailor-Job relationship (${jobsCount} jobs for tailor)`, true);
      } else {
        logTest('Tailor-Job relationship', false, 'No tailors found');
      }
    } catch (e: any) {
      logTest('Tailor-Job relationship', false, e.message);
    }

    // ========== AGGREGATION TESTS ==========
    console.log('\n📈 Aggregation Tests:');

    // Test: Job status aggregation
    try {
      const statusAgg = await db.collection('tailorJobs').aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]).toArray();
      logTest(`Job status aggregation (${statusAgg.length} statuses)`, statusAgg.length > 0);
    } catch (e: any) {
      logTest('Job status aggregation', false, e.message);
    }

    // Test: Shipment totals
    try {
      const shipmentAgg = await db.collection('shipments').aggregate([
        { $group: { _id: null, totalPcs: { $sum: '$pcsShipped' } } }
      ]).toArray();
      logTest(`Shipment totals aggregation`, true);
    } catch (e: any) {
      logTest('Shipment totals aggregation', false, e.message);
    }

  } catch (error) {
    console.error('\n💥 Fatal error:', error);
  } finally {
    await client.close();
  }

  // ========== SUMMARY ==========
  console.log('\n' + '=' .repeat(60));
  console.log('\n📋 TEST SUMMARY:\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log(`   Total:  ${total}`);
  console.log(`   Passed: ${passed} ✅`);
  console.log(`   Failed: ${failed} ❌`);
  console.log(`   Rate:   ${((passed / total) * 100).toFixed(1)}%\n`);
  
  if (failed > 0) {
    console.log('❌ Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name}: ${r.error || 'Unknown error'}`);
    });
  }
  
  console.log('\n' + '=' .repeat(60) + '\n');
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
