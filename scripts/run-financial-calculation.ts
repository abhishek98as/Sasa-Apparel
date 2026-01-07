/**
 * Manual Financial Calculation Runner
 * 
 * Run this script to manually trigger financial calculations for a specific date
 * or to backfill historical data.
 * 
 * Usage:
 *   npx tsx scripts/run-financial-calculation.ts
 *   npx tsx scripts/run-financial-calculation.ts 2025-01-07
 */

import { format, subDays } from 'date-fns';

const CRON_SECRET = process.env.CRON_SECRET || 'dev-secret';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function runFinancialCalculation(date?: string) {
  const targetDate = date || format(new Date(), 'yyyy-MM-dd');
  const url = `${API_URL}/api/cron/financial-calculation?date=${targetDate}`;

  console.log(`🚀 Running financial calculation for ${targetDate}...`);
  console.log(`📡 URL: ${url}\n`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`
      }
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ SUCCESS\n');
      console.log('Results:');
      console.log(JSON.stringify(data.results, null, 2));
    } else {
      console.error('❌ FAILED');
      console.error('Error:', data.error);
    }
  } catch (error) {
    console.error('❌ ERROR:', error);
  }
}

// Get date from command line argument or use today
const dateArg = process.argv[2];

if (dateArg === '--help' || dateArg === '-h') {
  console.log(`
Usage:
  npx tsx scripts/run-financial-calculation.ts [date]

Examples:
  npx tsx scripts/run-financial-calculation.ts                # Run for today
  npx tsx scripts/run-financial-calculation.ts 2025-01-07    # Run for specific date
  npx tsx scripts/run-financial-calculation.ts --help         # Show this help
  `);
  process.exit(0);
}

runFinancialCalculation(dateArg);

