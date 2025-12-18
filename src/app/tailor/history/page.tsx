'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { formatNumber, formatDate, formatCurrency } from '@/lib/utils';
import { Search, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Style {
  _id: string;
  code: string;
  name: string;
}

interface Job {
  _id: string;
  style?: Style;
  issuedPcs: number;
  returnedPcs: number;
  rate: number;
  issueDate: string;
  completedDate?: string;
  status: string;
  qcStatus: string;
  qcNotes?: string;
}

export default function TailorHistoryPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/tailor-jobs');
      const result = await response.json();
      if (result.success) {
        // Filter completed jobs only
        setJobs(result.data.filter((j: Job) => j.status === 'completed'));
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredJobs = jobs.filter(
    (job) =>
      job.style?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.style?.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalEarnings = filteredJobs.reduce(
    (sum, j) => sum + j.returnedPcs * j.rate,
    0
  );
  const totalPcs = filteredJobs.reduce((sum, j) => sum + j.returnedPcs, 0);

  const getQCIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-4 h-4 text-accent-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-amber-600" />;
    }
  };

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="animate-fade-in">
      <Header
        title="Work History"
        subtitle="View your completed jobs and earnings"
      />

      <div className="p-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-surface-500">Completed Jobs</p>
              <p className="text-2xl font-bold">{filteredJobs.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-surface-500">Total Pieces</p>
              <p className="text-2xl font-bold">{formatNumber(totalPcs)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-surface-500">Total Earnings</p>
              <p className="text-2xl font-bold text-accent-600">
                {formatCurrency(totalEarnings)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <Input
              placeholder="Search by style..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Style</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Completed Date</TableHead>
                  <TableHead>Pieces</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Earnings</TableHead>
                  <TableHead>QC Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.length === 0 ? (
                  <TableEmpty message="No completed jobs" colSpan={7} />
                ) : (
                  filteredJobs.map((job) => (
                    <TableRow key={job._id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{job.style?.name}</p>
                          <p className="text-xs text-surface-500">
                            {job.style?.code}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(job.issueDate)}</TableCell>
                      <TableCell>
                        {job.completedDate
                          ? formatDate(job.completedDate)
                          : '-'}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatNumber(job.returnedPcs)}
                      </TableCell>
                      <TableCell>{formatCurrency(job.rate)}</TableCell>
                      <TableCell className="font-semibold text-accent-600">
                        {formatCurrency(job.returnedPcs * job.rate)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getQCIcon(job.qcStatus)}
                          <span className="capitalize">{job.qcStatus}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

