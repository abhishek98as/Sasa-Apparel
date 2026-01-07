import { getDb, COLLECTIONS } from '../src/lib/mongodb';

async function migrateInventoryFinancial() {
  console.log('Starting Inventory & Financial Management System migration...');
  
  try {
    const db = await getDb();
    
    // Create inventoryItems indexes
    console.log('Creating indexes for inventoryItems...');
    await db.collection(COLLECTIONS.INVENTORY_ITEMS).createIndex(
      { itemCode: 1 },
      { unique: true }
    );
    await db.collection(COLLECTIONS.INVENTORY_ITEMS).createIndex(
      { category: 1, isActive: 1 }
    );
    await db.collection(COLLECTIONS.INVENTORY_ITEMS).createIndex(
      { isActive: 1, currentStock: 1 }
    );
    
    // Create inventoryTransactions indexes
    console.log('Creating indexes for inventoryTransactions...');
    await db.collection(COLLECTIONS.INVENTORY_TRANSACTIONS).createIndex(
      { itemId: 1, transactionDate: -1 }
    );
    await db.collection(COLLECTIONS.INVENTORY_TRANSACTIONS).createIndex(
      { transactionType: 1, transactionDate: -1 }
    );
    await db.collection(COLLECTIONS.INVENTORY_TRANSACTIONS).createIndex(
      { referenceType: 1, referenceId: 1 }
    );
    
    // Create purchaseOrders indexes
    console.log('Creating indexes for purchaseOrders...');
    await db.collection(COLLECTIONS.PURCHASE_ORDERS).createIndex(
      { poNumber: 1 },
      { unique: true }
    );
    await db.collection(COLLECTIONS.PURCHASE_ORDERS).createIndex(
      { status: 1, orderDate: -1 }
    );
    await db.collection(COLLECTIONS.PURCHASE_ORDERS).createIndex(
      { supplier: 1, orderDate: -1 }
    );
    
    // Create financialPeriods indexes
    console.log('Creating indexes for financialPeriods...');
    await db.collection(COLLECTIONS.FINANCIAL_PERIODS).createIndex(
      { periodType: 1, periodKey: 1 },
      { unique: true }
    );
    await db.collection(COLLECTIONS.FINANCIAL_PERIODS).createIndex(
      { startDate: 1, endDate: 1 }
    );
    await db.collection(COLLECTIONS.FINANCIAL_PERIODS).createIndex(
      { periodType: 1, isFinalized: 1 }
    );
    
    // Create costEntries indexes
    console.log('Creating indexes for costEntries...');
    await db.collection(COLLECTIONS.COST_ENTRIES).createIndex(
      { entryDate: -1, costCategory: 1 }
    );
    await db.collection(COLLECTIONS.COST_ENTRIES).createIndex(
      { status: 1, entryDate: -1 }
    );
    await db.collection(COLLECTIONS.COST_ENTRIES).createIndex(
      { costCategory: 1, status: 1 }
    );
    
    console.log('✅ Migration completed successfully!');
    console.log('Collections created/updated:');
    console.log('  - inventoryItems');
    console.log('  - inventoryTransactions');
    console.log('  - purchaseOrders');
    console.log('  - financialPeriods');
    console.log('  - costEntries');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateInventoryFinancial();

