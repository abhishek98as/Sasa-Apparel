import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';

// Fix: Load env before importing modules that use it
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifyETL() {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI not found');

    // Dynamic import to ensure env is ready
    const { refreshDailyAnalytics } = await import('../src/lib/analytics/etl');

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db('cloth_manufacturing');

    const tenantId = 'test-tenant-' + new Date().getTime();
    const styleId = new ObjectId();
    const today = new Date();

    try {
        console.log('--- Starting Analytics Verification ---');
        console.log(`Tenant: ${tenantId}`);

        // 1. Seed Mock Data
        console.log('Seeding mock Fabric Cutting data...');
        await db.collection('fabricCutting').insertOne({
            tenantId,
            styleId,
            totalQty: 100,
            createdAt: today,
            updatedAt: today
        });

        console.log('Seeding mock Tailor Jobs...');
        await db.collection('tailorJobs').insertOne({
            styleId, // Note: ETL looks up style->tenantId
            issuedPcs: 50,
            rate: 10,
            issueDate: today,
            tailorId: new ObjectId(),
            status: 'in-progress'
        });

        // Create Style to link tenant
        await db.collection('styles').insertOne({
            _id: styleId,
            tenantId,
            name: 'Test Style'
        });

        // 2. Run ETL
        console.log('Running ETL refresh...');
        const result = await refreshDailyAnalytics(tenantId, today);
        console.log('ETL Result:', result);

        // 3. Verify Aggregates
        const dailyStats = await db.collection('analyticsDaily').findOne({
            tenantId,
            styleId: styleId.toString()
        });

        console.log('Daily Stats Retrieved:', dailyStats);

        if (!dailyStats) throw new Error('No daily stats found!');

        if (dailyStats.cuttingReceived !== 100) {
            throw new Error(`Expected cuttingReceived 100, got ${dailyStats.cuttingReceived}`);
        }
        if (dailyStats.inProductionPcs !== 50) {
            throw new Error(`Expected inProductionPcs 50, got ${dailyStats.inProductionPcs}`);
        }
        if (dailyStats.tailorExpense !== 500) {
            throw new Error(`Expected tailorExpense 500, got ${dailyStats.tailorExpense}`);
        }

        console.log('✅ Verification SUCCEEDED!');

    } catch (err) {
        console.error('❌ Verification FAILED:', err);
    } finally {
        // Cleanup
        await db.collection('fabricCutting').deleteMany({ tenantId });
        await db.collection('styles').deleteOne({ _id: styleId });
        await db.collection('analyticsDaily').deleteMany({ tenantId });
        await client.close();
    }
}

verifyETL();
