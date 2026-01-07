/**
 * Backfill Financial Data
 * 
 * Run this script to calculate and store financial data for a date range.
 * Useful for historical data or catching up after system downtime.
 * 
 * Usage:
 *   npx tsx scripts/backfill-financial-data.ts 2025-01-01 2025-01-31
 */

import { format, addDays, parseISO } from 'date-fns';

const CRON_SECRET = process.env.CRON_SECRET || 'dev-secret';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function backfillFinancialData(startDateStr: string, endDateStr: string) {
  const startDate = parseISO(startDateStr);
  const endDate = parseISO(endDateStr);

  console.log(`🚀 Backfilling financial data from ${startDateStr} to ${endDateStr}`);
  console.log(`📊 This will process ${Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1} days\n`);

  let currentDate = startDate;
  let successCount = 0;
  let errorCount = 0;

  while (currentDate <= endDate) {
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    console.log(`Processing ${dateStr}...`);

    try {
      const response = await fetch(
        `${API_URL}/api/cron/financial-calculation?date=${dateStr}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${CRON_SECRET}`
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        console.log(`  ✅ ${dateStr} completed`);
        successCount++;
      } else {
        console.error(`  ❌ ${dateStr} failed:`, data.error);
        errorCount++;
      }
    } catch (error) {
      console.error(`  ❌ ${dateStr} error:`, error);
      errorCount++;
    }

    // Move to next day
    currentDate = addDays(currentDate, 1);

    // Small delay to avoid overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n📊 Backfill Summary:`);
  console.log(`   ✅ Success: ${successCount} days`);
  console.log(`   ❌ Errors: ${errorCount} days`);
  console.log(`   📈 Total: ${successCount + errorCount} days processed`);
}

// Get arguments
const startDate = process.argv[2];
const endDate = process.argv[3];

if (!startDate || !endDate || startDate === '--help' || startDate === '-h') {
  console.log(`
Usage:
  npx tsx scripts/backfill-financial-data.ts <start-date> <end-date>

Example:
  npx tsx scripts/backfill-financial-data.ts 2025-01-01 2025-01-31

Date format: YYYY-MM-DD
  `);
  process.exit(startDate === '--help' || startDate === '-h' ? 0 : 1);
}

backfillFinancialData(startDate, endDate);

