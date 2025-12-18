'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@/components/ui/table';
import { PageLoader } from '@/components/ui/loading';
import { useToast } from '@/components/ui/toast';
import { formatNumber, formatDate, formatCurrency } from '@/lib/utils';
import { Download, FileSpreadsheet, FileText, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Vendor {
  _id: string;
  name: string;
}

interface Tailor {
  _id: string;
  name: string;
}

type ReportType = 'production' | 'tailor' | 'shipment' | 'fabric';

export default function ReportsPage() {
  const { showToast } = useToast();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [tailors, setTailors] = useState<Tailor[]>([]);
  const [reportData, setReportData] = useState<unknown[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [reportType, setReportType] = useState<ReportType>('production');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [tailorId, setTailorId] = useState('');

  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      const [vendorsRes, tailorsRes] = await Promise.all([
        fetch('/api/vendors?active=true'),
        fetch('/api/tailors?active=true'),
      ]);
      const [vendorsData, tailorsData] = await Promise.all([
        vendorsRes.json(),
        tailorsRes.json(),
      ]);

      if (vendorsData.success) setVendors(vendorsData.data);
      if (tailorsData.success) setTailors(tailorsData.data);
    } catch (error) {
      console.error('Failed to fetch master data:', error);
    }
  };

  const fetchReport = async () => {
    setIsLoading(true);

    try {
      const params = new URLSearchParams({ type: reportType });
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (vendorId) params.append('vendorId', vendorId);
      if (tailorId) params.append('tailorId', tailorId);

      const response = await fetch(`/api/reports?${params}`);
      const result = await response.json();

      if (result.success) {
        setReportData(result.data);
      } else {
        showToast(result.error, 'error');
      }
    } catch (error) {
      showToast('Failed to fetch report', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!reportData.length) {
      showToast('No data to export', 'warning');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(reportData as object[]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${reportType}_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('Report exported successfully', 'success');
  };

  const reportTypes = [
    { value: 'production', label: 'Style Production Report' },
    { value: 'tailor', label: 'Tailor Performance Report' },
    { value: 'shipment', label: 'Vendor Shipment Report' },
    { value: 'fabric', label: 'Fabric Utilization Report' },
  ];

  const renderTable = () => {
    if (isLoading) {
      return <PageLoader />;
    }

    if (!reportData.length) {
      return (
        <div className="py-12 text-center text-surface-500">
          Select filters and click "Generate Report" to view data
        </div>
      );
    }

    switch (reportType) {
      case 'production':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Style</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Fabric Type</TableHead>
                <TableHead>Fabric (m)</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>In Production</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Shipped</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(reportData as any[]).map((row, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{row.styleName}</p>
                      <p className="text-xs text-surface-500">{row.styleCode}</p>
                    </div>
                  </TableCell>
                  <TableCell>{row.vendorName}</TableCell>
                  <TableCell>{row.fabricType}</TableCell>
                  <TableCell>{formatNumber(row.totalFabricMeters || 0)}</TableCell>
                  <TableCell>{formatNumber(row.totalReceived || 0)}</TableCell>
                  <TableCell className="text-amber-600">
                    {formatNumber(row.inProduction || 0)}
                  </TableCell>
                  <TableCell className="text-blue-600">
                    {formatNumber(row.completed || 0)}
                  </TableCell>
                  <TableCell className="font-semibold text-accent-600">
                    {formatNumber(row.shipped || 0)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'tailor':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tailor</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead>Jobs</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Returned</TableHead>
                <TableHead>Pending</TableHead>
                <TableHead>QC Pass/Fail</TableHead>
                <TableHead>Earnings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(reportData as any[]).map((row, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{row.tailorName}</TableCell>
                  <TableCell>{row.phone}</TableCell>
                  <TableCell>{row.specialization || '-'}</TableCell>
                  <TableCell>{row.totalJobs}</TableCell>
                  <TableCell>{formatNumber(row.totalIssued || 0)}</TableCell>
                  <TableCell className="font-semibold">
                    {formatNumber(row.totalReturned || 0)}
                  </TableCell>
                  <TableCell className="text-amber-600">
                    {formatNumber(row.pending || 0)}
                  </TableCell>
                  <TableCell>
                    <span className="text-accent-600">{row.qcPassed}</span>
                    {' / '}
                    <span className="text-red-600">{row.qcFailed}</span>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(row.totalEarnings || 0)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'shipment':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Challan No</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Style</TableHead>
                <TableHead>Pieces</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(reportData as any[]).map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{formatDate(row.date)}</TableCell>
                  <TableCell className="font-mono text-sm">{row.challanNo}</TableCell>
                  <TableCell>{row.vendorName}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{row.styleName}</p>
                      <p className="text-xs text-surface-500">{row.styleCode}</p>
                    </div>
                  </TableCell>
                  <TableCell>{formatNumber(row.pcsShipped)}</TableCell>
                  <TableCell>{row.rate ? formatCurrency(row.rate) : '-'}</TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(row.amount || 0)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'fabric':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Style</TableHead>
                <TableHead>Fabric Type</TableHead>
                <TableHead>Fabric (m)</TableHead>
                <TableHead>Cutting (pcs)</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Utilization</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(reportData as any[]).map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{formatDate(row.date)}</TableCell>
                  <TableCell>{row.vendorName}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{row.styleName}</p>
                      <p className="text-xs text-surface-500">{row.styleCode}</p>
                    </div>
                  </TableCell>
                  <TableCell>{row.fabricType}</TableCell>
                  <TableCell>{formatNumber(row.fabricReceivedMeters)}</TableCell>
                  <TableCell className="font-semibold">
                    {formatNumber(row.cuttingReceivedPcs)}
                  </TableCell>
                  <TableCell>
                    {row.cuttingInHouse ? 'In-house' : 'Pre-cut'}
                  </TableCell>
                  <TableCell>
                    {row.utilizationRate
                      ? `${row.utilizationRate.toFixed(2)} pcs/m`
                      : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      default:
        return null;
    }
  };

  return (
    <div className="animate-fade-in">
      <Header
        title="Reports"
        subtitle="Generate and export business reports"
      />

      <div className="p-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Report Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select
                label="Report Type"
                value={reportType}
                onChange={(e) => {
                  setReportType(e.target.value as ReportType);
                  setReportData([]);
                }}
                options={reportTypes}
              />

              <Input
                label="From Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />

              <Input
                label="To Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />

              {(reportType === 'shipment' || reportType === 'fabric') && (
                <Select
                  label="Vendor"
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                  options={[
                    { value: '', label: 'All Vendors' },
                    ...vendors.map((v) => ({ value: v._id, label: v.name })),
                  ]}
                />
              )}

              {reportType === 'tailor' && (
                <Select
                  label="Tailor"
                  value={tailorId}
                  onChange={(e) => setTailorId(e.target.value)}
                  options={[
                    { value: '', label: 'All Tailors' },
                    ...tailors.map((t) => ({ value: t._id, label: t.name })),
                  ]}
                />
              )}
            </div>

            <div className="flex items-center gap-3 mt-4">
              <Button onClick={fetchReport} isLoading={isLoading}>
                Generate Report
              </Button>
              <Button
                variant="secondary"
                onClick={exportToExcel}
                disabled={!reportData.length}
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export to Excel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {reportTypes.find((r) => r.value === reportType)?.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">{renderTable()}</CardContent>
        </Card>
      </div>
    </div>
  );
}

