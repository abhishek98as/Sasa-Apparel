import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb';
import bcrypt from 'bcryptjs';

// Use MongoDB Atlas connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://abhishek98as_db_user:CMbGMzthpNVcq9SY@cluster0.37zw1rl.mongodb.net/cloth_manufacturing?retryWrites=true&w=majority&appName=Cluster0';

async function seed() {
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
    
    console.log('Clearing existing data...');
    await Promise.all([
      db.collection('users').deleteMany({}),
      db.collection('vendors').deleteMany({}),
      db.collection('styles').deleteMany({}),
      db.collection('tailors').deleteMany({}),
      db.collection('fabricCutting').deleteMany({}),
      db.collection('tailorJobs').deleteMany({}),
      db.collection('shipments').deleteMany({}),
      db.collection('rates').deleteMany({}),
    ]);

    console.log('Creating indexes...');
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('vendors').createIndex({ name: 1 });
    await db.collection('styles').createIndex({ code: 1 }, { unique: true });
    await db.collection('styles').createIndex({ vendorId: 1 });
    await db.collection('fabricCutting').createIndex({ styleId: 1 });
    await db.collection('fabricCutting').createIndex({ vendorId: 1 });
    await db.collection('fabricCutting').createIndex({ date: -1 });
    await db.collection('tailorJobs').createIndex({ tailorId: 1 });
    await db.collection('tailorJobs').createIndex({ styleId: 1 });
    await db.collection('tailorJobs').createIndex({ status: 1 });
    await db.collection('shipments').createIndex({ vendorId: 1 });
    await db.collection('shipments').createIndex({ styleId: 1 });
    await db.collection('shipments').createIndex({ date: -1 });
    await db.collection('rates').createIndex({ styleId: 1, vendorId: 1 });

    // Create vendors
    console.log('Creating vendors...');
    const vendorIds = [new ObjectId(), new ObjectId(), new ObjectId()];
    await db.collection('vendors').insertMany([
      {
        _id: vendorIds[0],
        name: 'Fashion Hub Exports',
        contactPerson: 'Rahul Sharma',
        phone: '+91 98765 43210',
        email: 'rahul@fashionhub.com',
        address: '123 Textile Market, Surat, Gujarat',
        gstNumber: 'GSTIN1234567890',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: vendorIds[1],
        name: 'Trendy Garments',
        contactPerson: 'Priya Patel',
        phone: '+91 87654 32109',
        email: 'priya@trendygarments.com',
        address: '456 Fashion Street, Mumbai, Maharashtra',
        gstNumber: 'GSTIN0987654321',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: vendorIds[2],
        name: 'Classic Wear Co.',
        contactPerson: 'Amit Kumar',
        phone: '+91 76543 21098',
        email: 'amit@classicwear.com',
        address: '789 Cloth Market, Delhi',
        gstNumber: 'GSTIN1122334455',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // Create tailors
    console.log('Creating tailors...');
    const tailorIds = [new ObjectId(), new ObjectId(), new ObjectId(), new ObjectId()];
    await db.collection('tailors').insertMany([
      {
        _id: tailorIds[0],
        name: 'Ramesh Tailor',
        phone: '+91 99887 76655',
        address: 'Shop 12, Local Market',
        specialization: 'Shirts',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: tailorIds[1],
        name: 'Suresh Stitching',
        phone: '+91 88776 65544',
        address: 'Shop 15, Main Road',
        specialization: 'Pants & Trousers',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: tailorIds[2],
        name: 'Kumar Tailors',
        phone: '+91 77665 54433',
        address: 'Shop 8, Industrial Area',
        specialization: 'Dresses',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: tailorIds[3],
        name: 'Singh Stitching Works',
        phone: '+91 66554 43322',
        address: 'Unit 5, Garment Complex',
        specialization: 'All Types',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // Create styles
    console.log('Creating styles...');
    const styleIds = [new ObjectId(), new ObjectId(), new ObjectId(), new ObjectId()];
    await db.collection('styles').insertMany([
      {
        _id: styleIds[0],
        code: 'STY-001',
        name: 'Classic Cotton Shirt',
        vendorId: vendorIds[0],
        fabricType: 'Cotton',
        description: 'Premium cotton formal shirt',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: styleIds[1],
        code: 'STY-002',
        name: 'Linen Summer Dress',
        vendorId: vendorIds[1],
        fabricType: 'Linen',
        description: 'Lightweight summer dress',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: styleIds[2],
        code: 'STY-003',
        name: 'Denim Casual Pants',
        vendorId: vendorIds[2],
        fabricType: 'Denim',
        description: 'Casual denim pants',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: styleIds[3],
        code: 'STY-004',
        name: 'Silk Kurta',
        vendorId: vendorIds[0],
        fabricType: 'Silk',
        description: 'Traditional silk kurta',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // Create rates
    console.log('Creating rates...');
    await db.collection('rates').insertMany([
      {
        styleId: styleIds[0],
        vendorId: vendorIds[0],
        vendorRate: 450,
        effectiveDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        styleId: styleIds[1],
        vendorId: vendorIds[1],
        vendorRate: 650,
        effectiveDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        styleId: styleIds[2],
        vendorId: vendorIds[2],
        vendorRate: 550,
        effectiveDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        styleId: styleIds[3],
        vendorId: vendorIds[0],
        vendorRate: 850,
        effectiveDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // Create fabric/cutting records
    console.log('Creating fabric cutting records...');
    const fabricCuttingIds = [new ObjectId(), new ObjectId(), new ObjectId()];
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    await db.collection('fabricCutting').insertMany([
      {
        _id: fabricCuttingIds[0],
        styleId: styleIds[0],
        vendorId: vendorIds[0],
        fabricReceivedMeters: 500,
        cuttingReceivedPcs: 200,
        cuttingInHouse: false,
        date: today,
        notes: 'First batch of cotton shirts',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: fabricCuttingIds[1],
        styleId: styleIds[1],
        vendorId: vendorIds[1],
        fabricReceivedMeters: 300,
        cuttingReceivedPcs: 120,
        cuttingInHouse: true,
        date: yesterday,
        notes: 'Cut in-house for summer dresses',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: fabricCuttingIds[2],
        styleId: styleIds[2],
        vendorId: vendorIds[2],
        fabricReceivedMeters: 400,
        cuttingReceivedPcs: 150,
        cuttingInHouse: false,
        date: lastWeek,
        notes: 'Denim pants cutting received',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // Create tailor jobs
    console.log('Creating tailor jobs...');
    await db.collection('tailorJobs').insertMany([
      {
        styleId: styleIds[0],
        tailorId: tailorIds[0],
        fabricCuttingId: fabricCuttingIds[0],
        issuedPcs: 50,
        rate: 80,
        issueDate: today,
        status: 'in-progress',
        returnedPcs: 0,
        qcStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        styleId: styleIds[0],
        tailorId: tailorIds[1],
        fabricCuttingId: fabricCuttingIds[0],
        issuedPcs: 50,
        rate: 80,
        issueDate: today,
        status: 'in-progress',
        returnedPcs: 20,
        qcStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        styleId: styleIds[1],
        tailorId: tailorIds[2],
        fabricCuttingId: fabricCuttingIds[1],
        issuedPcs: 60,
        rate: 120,
        issueDate: yesterday,
        status: 'completed',
        returnedPcs: 60,
        qcStatus: 'passed',
        receivedDate: today,
        completedDate: today,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        styleId: styleIds[2],
        tailorId: tailorIds[3],
        fabricCuttingId: fabricCuttingIds[2],
        issuedPcs: 100,
        rate: 90,
        issueDate: lastWeek,
        status: 'completed',
        returnedPcs: 100,
        qcStatus: 'passed',
        receivedDate: yesterday,
        completedDate: yesterday,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // Create shipments
    console.log('Creating shipments...');
    await db.collection('shipments').insertMany([
      {
        vendorId: vendorIds[1],
        styleId: styleIds[1],
        pcsShipped: 60,
        date: today,
        challanNo: 'CH240501',
        notes: 'First shipment of summer dresses',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        vendorId: vendorIds[2],
        styleId: styleIds[2],
        pcsShipped: 80,
        date: yesterday,
        challanNo: 'CH240502',
        notes: 'Partial shipment of denim pants',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // Create users
    console.log('Creating users...');
    const adminPassword = await bcrypt.hash('admin123', 12);
    const vendorPassword = await bcrypt.hash('vendor123', 12);
    const tailorPassword = await bcrypt.hash('tailor123', 12);

    await db.collection('users').insertMany([
      {
        email: 'admin@sasa.com',
        password: adminPassword,
        name: 'Admin User',
        role: 'admin',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        email: 'vendor@test.com',
        password: vendorPassword,
        name: 'Fashion Hub User',
        role: 'vendor',
        vendorId: vendorIds[0],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        email: 'vendor2@test.com',
        password: vendorPassword,
        name: 'Trendy Garments User',
        role: 'vendor',
        vendorId: vendorIds[1],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        email: 'tailor@test.com',
        password: tailorPassword,
        name: 'Ramesh Tailor',
        role: 'tailor',
        tailorId: tailorIds[0],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    console.log('✅ Database seeded successfully!');
    console.log('\nTest credentials:');
    console.log('  Admin: admin@sasa.com / admin123');
    console.log('  Vendor: vendor@test.com / vendor123');
    console.log('  Tailor: tailor@test.com / tailor123');
    
  } catch (error) {
    console.error('Seed error:', error);
    throw error;
  } finally {
    await client.close();
  }
}

seed().catch(console.error);

