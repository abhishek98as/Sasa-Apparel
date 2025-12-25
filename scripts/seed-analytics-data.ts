/**
 * Generate sample analytics test data
 * 
 * This script creates sample data for:
 * - Fabric cutting records
 * - Tailor jobs
 * - Shipments
 * - QC inspections
 * - Approvals
 * 
 * Usage:
 * npx tsx scripts/seed-analytics-data.ts
 */

import { getDb, COLLECTIONS } from '../src/lib/mongodb';
import { ObjectId } from 'mongodb';
import { subDays, format } from 'date-fns';

const TENANT_ID = new ObjectId();
const NUM_DAYS = 90;
const NUM_STYLES = 10;
const NUM_VENDORS = 5;
const NUM_TAILORS = 8;

async function seedAnalyticsData() {
  console.log('[Seed Analytics] Starting...');
  
  const db = await getDb();
  
  // Create sample styles
  const styles = Array.from({ length: NUM_STYLES }, (_, i) => ({
    _id: new ObjectId(),
    tenantId: TENANT_ID,
    styleName: `Style-${String(i + 1).padStart(3, '0')}`,
    styleCode: `STY${String(i + 1).padStart(3, '0')}`,
    createdAt: new Date(),
    updatedAt: new Date()
  }));
  
  await db.collection(COLLECTIONS.STYLES).insertMany(styles);
  console.log(`[Seed Analytics] Created ${styles.length} styles`);
  
  // Create sample vendors
  const vendors = Array.from({ length: NUM_VENDORS }, (_, i) => ({
    _id: new ObjectId(),
    tenantId: TENANT_ID,
    vendorName: `Vendor ${String.fromCharCode(65 + i)}`,
    vendorCode: `VEN${String(i + 1).padStart(3, '0')}`,
    createdAt: new Date(),
    updatedAt: new Date()
  }));
  
  await db.collection(COLLECTIONS.VENDORS).insertMany(vendors);
  console.log(`[Seed Analytics] Created ${vendors.length} vendors`);
  
  // Create sample tailors
  const tailors = Array.from({ length: NUM_TAILORS }, (_, i) => ({
    _id: new ObjectId(),
    tenantId: TENANT_ID,
    tailorName: `Tailor ${i + 1}`,
    tailorCode: `TAI${String(i + 1).padStart(3, '0')}`,
    createdAt: new Date(),
    updatedAt: new Date()
  }));
  
  await db.collection('tailors').insertMany(tailors);
  console.log(`[Seed Analytics] Created ${tailors.length} tailors`);
  
  // Generate daily data
  let totalRecords = 0;
  
  for (let dayOffset = 0; dayOffset < NUM_DAYS; dayOffset++) {
    const date = subDays(new Date(), NUM_DAYS - dayOffset);
    
    // Fabric cutting records
    const cuttingRecords = styles.slice(0, randomInt(3, NUM_STYLES)).map(style => ({
      _id: new ObjectId(),
      tenantId: TENANT_ID,
      styleId: style._id,
      vendorId: randomChoice(vendors)._id,
      cuttingReceivedPcs: randomInt(500, 2000),
      sizeBreakdown: generateSizeBreakdown(),
      createdAt: date,
      updatedAt: date
    }));
    
    if (cuttingRecords.length > 0) {
      await db.collection(COLLECTIONS.FABRIC_CUTTING).insertMany(cuttingRecords);
      totalRecords += cuttingRecords.length;
    }
    
    // Tailor jobs
    const tailorJobs = styles.slice(0, randomInt(2, NUM_STYLES)).map(style => {
      const issuedPcs = randomInt(300, 1500);
      const isCompleted = Math.random() > 0.3;
      const returnedPcs = isCompleted ? issuedPcs - randomInt(0, 50) : randomInt(0, issuedPcs);
      
      return {
        _id: new ObjectId(),
        styleId: style._id,
        tailorId: randomChoice(tailors)._id,
        issuedPcs,
        returnedPcs,
        status: isCompleted ? 'completed' : 'in_progress',
        issueDate: subDays(date, randomInt(1, 5)),
        completedAt: isCompleted ? date : null,
        createdAt: subDays(date, randomInt(1, 5)),
        updatedAt: date
      };
    });
    
    if (tailorJobs.length > 0) {
      await db.collection(COLLECTIONS.TAILOR_JOBS).insertMany(tailorJobs);
      totalRecords += tailorJobs.length;
    }
    
    // Tailor payments
    const completedJobs = tailorJobs.filter(j => j.status === 'completed');
    const tailorPayments = completedJobs.map(job => ({
      _id: new ObjectId(),
      styleId: job.styleId,
      tailorId: job.tailorId,
      amount: job.returnedPcs * randomInt(30, 80),
      paidAt: date,
      createdAt: date,
      updatedAt: date
    }));
    
    if (tailorPayments.length > 0) {
      await db.collection(COLLECTIONS.TAILOR_PAYMENTS).insertMany(tailorPayments);
      totalRecords += tailorPayments.length;
    }
    
    // Shipments
    const shipments = styles.slice(0, randomInt(1, Math.floor(NUM_STYLES / 2))).map(style => {
      const shippedQty = randomInt(500, 1500);
      const rate = randomInt(800, 1500);
      const invoiceValue = shippedQty * rate;
      
      return {
        _id: new ObjectId(),
        tenantId: TENANT_ID,
        styleId: style._id,
        vendorId: randomChoice(vendors)._id,
        shippedQty,
        invoiceValue,
        paymentStatus: randomChoice(['pending', 'partial', 'paid']),
        shippedAt: date,
        createdAt: date,
        updatedAt: date
      };
    });
    
    if (shipments.length > 0) {
      await db.collection(COLLECTIONS.SHIPMENTS).insertMany(shipments);
      totalRecords += shipments.length;
    }
    
    // QC Inspections
    const qcInspections = styles.slice(0, randomInt(1, Math.floor(NUM_STYLES / 3))).map(style => {
      const inspectedPcs = randomInt(300, 1000);
      const passedPcs = Math.floor(inspectedPcs * (0.85 + Math.random() * 0.15));
      const failedPcs = inspectedPcs - passedPcs;
      
      return {
        _id: new ObjectId(),
        tenantId: TENANT_ID,
        styleId: style._id,
        inspectedPcs,
        passedPcs,
        failedPcs,
        inspectedAt: date,
        createdAt: date,
        updatedAt: date
      };
    });
    
    if (qcInspections.length > 0) {
      await db.collection(COLLECTIONS.QC_INSPECTIONS).insertMany(qcInspections);
      totalRecords += qcInspections.length;
    }
    
    // Approvals (samples)
    const approvals = styles.slice(0, randomInt(0, Math.floor(NUM_STYLES / 4))).map(style => ({
      _id: new ObjectId(),
      tenantId: TENANT_ID,
      styleId: style._id,
      vendorId: randomChoice(vendors)._id,
      status: randomChoice(['approved', 'approved', 'approved', 'pending', 'rejected']),
      approvedAt: Math.random() > 0.4 ? date : null,
      createdAt: date,
      updatedAt: date
    }));
    
    if (approvals.length > 0) {
      await db.collection(COLLECTIONS.APPROVALS).insertMany(approvals);
      totalRecords += approvals.length;
    }
    
    if ((dayOffset + 1) % 10 === 0) {
      console.log(`[Seed Analytics] Processed ${dayOffset + 1}/${NUM_DAYS} days (${totalRecords} records)`);
    }
  }
  
  console.log(`[Seed Analytics] ✓ Created ${totalRecords} total records`);
  console.log(`[Seed Analytics] ✓ Tenant ID: ${TENANT_ID}`);
  console.log('\n[Seed Analytics] Next steps:');
  console.log('1. Run ETL: npx tsx -e "import { refreshDailyAnalytics } from \'./src/lib/analytics/aggregation-engine\'; refreshDailyAnalytics(\'<TENANT_ID>\', new Date())"');
  console.log('2. View dashboard: http://localhost:3000/dashboard/analytics');
  console.log('3. Update your session to use this tenantId for testing');
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generateSizeBreakdown() {
  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const breakdown: Record<string, number> = {};
  
  sizes.forEach(size => {
    if (Math.random() > 0.3) {
      breakdown[size] = randomInt(50, 300);
    }
  });
  
  return breakdown;
}

// Run if called directly
if (require.main === module) {
  seedAnalyticsData()
    .then(() => {
      console.log('[Seed Analytics] Done!');
      process.exit(0);
    })
    .catch(err => {
      console.error('[Seed Analytics] Error:', err);
      process.exit(1);
    });
}

export { seedAnalyticsData };
