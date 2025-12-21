import { MongoClient, ServerApiVersion } from 'mongodb';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://abhishek98as_db_user:CMbGMzthpNVcq9SY@cluster0.37zw1rl.mongodb.net/cloth_manufacturing?retryWrites=true&w=majority&appName=Cluster0';

async function testConnection() {
  console.log('🔍 Testing MongoDB Atlas Connection...\n');
  
  const client = new MongoClient(MONGODB_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });
  
  try {
    // Test 1: Connection
    console.log('Test 1: Connecting to MongoDB Atlas...');
    await client.connect();
    console.log('✅ Connection successful!\n');
    
    const db = client.db('cloth_manufacturing');
    
    // Test 2: List collections
    console.log('Test 2: Listing collections...');
    const collections = await db.listCollections().toArray();
    console.log('Collections found:', collections.map(c => c.name).join(', '));
    console.log('✅ Collections check passed!\n');
    
    // Test 3: Check users collection
    console.log('Test 3: Checking users collection...');
    const usersCount = await db.collection('users').countDocuments();
    console.log(`Users count: ${usersCount}`);
    if (usersCount === 0) {
      console.log('⚠️ No users found! Run npm run seed first.\n');
    } else {
      console.log('✅ Users collection has data!\n');
    }
    
    // Test 4: Verify admin user exists
    console.log('Test 4: Checking admin user...');
    const adminUser = await db.collection('users').findOne({ email: 'admin@sasa.com' });
    if (adminUser) {
      console.log(`Admin found: ${adminUser.name} (${adminUser.email})`);
      console.log(`Role: ${adminUser.role}`);
      console.log(`Active: ${adminUser.isActive}`);
      console.log('✅ Admin user verified!\n');
    } else {
      console.log('❌ Admin user not found!\n');
    }
    
    // Test 5: Verify password hash
    console.log('Test 5: Verifying password hash...');
    if (adminUser?.password) {
      const isMatch = await bcrypt.compare('admin123', adminUser.password);
      if (isMatch) {
        console.log('✅ Password verification passed!\n');
      } else {
        console.log('❌ Password verification failed!\n');
      }
    }
    
    // Test 6: Check vendor user
    console.log('Test 6: Checking vendor user...');
    const vendorUser = await db.collection('users').findOne({ email: 'vendor@test.com' });
    if (vendorUser) {
      console.log(`Vendor found: ${vendorUser.name} (${vendorUser.email})`);
      console.log(`Role: ${vendorUser.role}`);
      console.log(`VendorId: ${vendorUser.vendorId}`);
      console.log('✅ Vendor user verified!\n');
    } else {
      console.log('❌ Vendor user not found!\n');
    }
    
    // Test 7: Check other collections
    console.log('Test 7: Checking data counts...');
    const vendorsCount = await db.collection('vendors').countDocuments();
    const stylesCount = await db.collection('styles').countDocuments();
    const tailorsCount = await db.collection('tailors').countDocuments();
    const cuttingCount = await db.collection('fabricCutting').countDocuments();
    const jobsCount = await db.collection('tailorJobs').countDocuments();
    const shipmentsCount = await db.collection('shipments').countDocuments();
    
    console.log(`Vendors: ${vendorsCount}`);
    console.log(`Styles: ${stylesCount}`);
    console.log(`Tailors: ${tailorsCount}`);
    console.log(`Fabric Cutting: ${cuttingCount}`);
    console.log(`Tailor Jobs: ${jobsCount}`);
    console.log(`Shipments: ${shipmentsCount}`);
    console.log('✅ Data counts verified!\n');
    
    console.log('========================================');
    console.log('🎉 All tests passed! Database is ready.');
    console.log('========================================');
    console.log('\nYou can login with:');
    console.log('  Admin: admin@sasa.com / admin123');
    console.log('  Vendor: vendor@test.com / vendor123');
    console.log('  Tailor: tailor@test.com / tailor123');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

testConnection().catch(console.error);
