import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { createObjectCsvStringifier } from 'csv-writer';
import * as XLSX from 'xlsx';

/**
 * POST /api/analytics/export
 * Initiates an export job for analytics data
 * 
 * Body:
 * {
 *   exportType: 'kpis' | 'trends' | 'breakdown' | 'table',
 *   format: 'csv' | 'xlsx' | 'json',
 *   filters: {...},
 *   filename?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { exportType, format = 'csv', filters, filename } = body;

    if (!exportType) {
      return NextResponse.json({ error: 'exportType is required' }, { status: 400 });
    }

    const db = await getDb();

    // Create export job
    const exportJob = {
      tenantId: session.user.tenantId ? new ObjectId(session.user.tenantId) : undefined,
      userId: new ObjectId(session.user.id),
      userName: session.user.name || session.user.email,
      userRole: session.user.role,
      exportType,
      format,
      filters,
      status: 'pending' as const,
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection(COLLECTIONS.EXPORT_JOBS).insertOne(exportJob);
    const jobId = result.insertedId;

    // Start async export processing
    processExport(jobId.toString(), exportType, format, filters, session).catch(err => {
      console.error('[Export Error]', err);
    });

    return NextResponse.json({
      success: true,
      jobId: jobId.toString(),
      message: 'Export job initiated. Check status using GET /api/analytics/export/:jobId'
    });

  } catch (error: any) {
    console.error('[Export Initiation Error]', error);
    return NextResponse.json(
      { error: 'Failed to initiate export', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/analytics/export/:jobId
 * Get export job status and download URL
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const jobId = url.pathname.split('/').pop();

    if (!jobId || !ObjectId.isValid(jobId)) {
      return NextResponse.json({ error: 'Invalid jobId' }, { status: 400 });
    }

    const db = await getDb();
    const job = await db.collection(COLLECTIONS.EXPORT_JOBS).findOne({
      _id: new ObjectId(jobId),
      userId: new ObjectId(session.user.id) // User can only see their own jobs
    });

    if (!job) {
      return NextResponse.json({ error: 'Export job not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      job: {
        id: job._id,
        status: job.status,
        progress: job.progress,
        fileUrl: job.fileUrl,
        fileSize: job.fileSize,
        rowCount: job.rowCount,
        error: job.error,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        expiresAt: job.expiresAt
      }
    });

  } catch (error: any) {
    console.error('[Export Status Error]', error);
    return NextResponse.json(
      { error: 'Failed to fetch export status', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Process export in background
 */
async function processExport(
  jobId: string,
  exportType: string,
  format: string,
  filters: any,
  session: any
) {
  const db = await getDb();
  
  try {
    // Update status to processing
    await db.collection(COLLECTIONS.EXPORT_JOBS).updateOne(
      { _id: new ObjectId(jobId) },
      {
        $set: {
          status: 'processing',
          startedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );

    // Fetch data based on export type
    let data: any[] = [];
    
    if (exportType === 'kpis') {
      data = await fetchKPIData(filters, session);
    } else if (exportType === 'trends') {
      data = await fetchTrendData(filters, session);
    } else if (exportType === 'breakdown') {
      data = await fetchBreakdownData(filters, session);
    } else if (exportType === 'table') {
      data = await fetchTableData(filters, session);
    }

    // Generate file based on format
    let fileContent: string;
    let mimeType: string;
    let fileExtension: string;

    if (format === 'csv') {
      fileContent = generateCSV(data);
      mimeType = 'text/csv';
      fileExtension = 'csv';
    } else if (format === 'json') {
      fileContent = JSON.stringify(data, null, 2);
      mimeType = 'application/json';
      fileExtension = 'json';
    } else if (format === 'xlsx') {
      fileContent = generateXLSX(data);
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      fileExtension = 'xlsx';
    } else {
      throw new Error(`Unsupported export format: ${format}`);
    }

    // In production, upload to cloud storage (S3, Azure Blob) and generate signed URL
    // For now, we'll store base64 in DB (not recommended for large files)
    let fileBase64: string;
    
    if (format === 'xlsx') {
      // XLSX is already in base64 format from generateXLSX
      fileBase64 = fileContent;
    } else {
      fileBase64 = Buffer.from(fileContent).toString('base64');
    }
    
    const fileUrl = `data:${mimeType};base64,${fileBase64}`;
    const fileSize = fileContent.length;

    // Update job with completed status
    await db.collection(COLLECTIONS.EXPORT_JOBS).updateOne(
      { _id: new ObjectId(jobId) },
      {
        $set: {
          status: 'completed',
          progress: 100,
          fileUrl,
          fileSize,
          rowCount: data.length,
          completedAt: new Date(),
          expiresAt: new Date(Date.now() + 3600000), // 1 hour
          updatedAt: new Date()
        }
      }
    );

  } catch (error: any) {
    console.error('[Export Processing Error]', error);
    
    await db.collection(COLLECTIONS.EXPORT_JOBS).updateOne(
      { _id: new ObjectId(jobId) },
      {
        $set: {
          status: 'failed',
          error: error.message,
          updatedAt: new Date()
        }
      }
    );
  }
}

async function fetchKPIData(filters: any, session: any) {
  // Simplified - in production use AnalyticsQueryService
  const db = await getDb();
  return await db.collection(COLLECTIONS.ANALYTICS_DAILY)
    .find({})
    .limit(1000)
    .toArray();
}

async function fetchTrendData(filters: any, session: any) {
  const db = await getDb();
  return await db.collection(COLLECTIONS.ANALYTICS_DAILY)
    .find({})
    .sort({ date: 1 })
    .limit(1000)
    .toArray();
}

async function fetchBreakdownData(filters: any, session: any) {
  const db = await getDb();
  return await db.collection(COLLECTIONS.ANALYTICS_DAILY)
    .aggregate([
      { $group: { _id: '$styleId', total: { $sum: '$pcsShipped' } } },
      { $sort: { total: -1 } },
      { $limit: 100 }
    ])
    .toArray();
}

async function fetchTableData(filters: any, session: any) {
  const db = await getDb();
  return await db.collection(COLLECTIONS.ANALYTICS_DAILY)
    .find({})
    .limit(5000)
    .toArray();
}

function generateCSV(data: any[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvStringifier = createObjectCsvStringifier({
    header: headers.map(h => ({ id: h, title: h }))
  });

  const headerString = csvStringifier.getHeaderString();
  const recordsString = csvStringifier.stringifyRecords(data);
  
  return headerString + recordsString;
}

function generateXLSX(data: any[]): string {
  if (data.length === 0) {
    // Create empty workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([['No data available']]);
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  }

  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Convert data to worksheet
  const ws = XLSX.utils.json_to_sheet(data);
  
  // Auto-size columns
  const colWidths = Object.keys(data[0]).map(key => ({
    wch: Math.max(key.length, ...data.map(row => String(row[key] || '').length))
  }));
  ws['!cols'] = colWidths;
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Analytics Data');
  
  // Write to base64 string
  return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
}
