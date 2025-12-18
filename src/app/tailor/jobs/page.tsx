'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
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
import { useToast } from '@/components/ui/toast';
import { formatNumber, formatDate, formatCurrency } from '@/lib/utils';
import { Search } from 'lucide-react';

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
  status: string;
  qcStatus: string;
  completedDate?: string;
}

export default function TailorJobsPage() {
  const { showToast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [returnedPcs, setReturnedPcs] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/tailor-jobs');
      const result = await response.json();
      if (result.success) {
        setJobs(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateJob = async () => {
    if (!selectedJob) return;
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/tailor-jobs/${selectedJob._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnedPcs }),
      });

      const result = await response.json();

      if (result.success) {
        showToast('Job updated successfully', 'success');
        setSelectedJob(null);
        fetchJobs();
      } else {
        showToast(result.error, 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.style?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.style?.code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !filterStatus || job.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="neutral">Pending</Badge>;
      case 'in-progress':
        return <Badge variant="warning">In Progress</Badge>;
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="animate-fade-in">
      <Header
        title="My Jobs"
        subtitle="View and update your assigned work"
      />

      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <Input
              placeholder="Search by style..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            options={[
              { value: '', label: 'All Status' },
              { value: 'in-progress', label: 'In Progress' },
              { value: 'completed', label: 'Completed' },
            ]}
            className="w-40"
          />
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Style</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Returned</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Earnings</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.length === 0 ? (
                  <TableEmpty message="No jobs found" colSpan={9} />
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
                      <TableCell>{formatNumber(job.issuedPcs)}</TableCell>
                      <TableCell className="font-semibold text-accent-600">
                        {formatNumber(job.returnedPcs)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            job.issuedPcs - job.returnedPcs > 0
                              ? 'text-amber-600 font-medium'
                              : 'text-surface-500'
                          }
                        >
                          {formatNumber(job.issuedPcs - job.returnedPcs)}
                        </span>
                      </TableCell>
                      <TableCell>{formatCurrency(job.rate)}</TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(job.returnedPcs * job.rate)}
                      </TableCell>
                      <TableCell>{getStatusBadge(job.status)}</TableCell>
                      <TableCell>
                        {job.status === 'in-progress' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedJob(job);
                              setReturnedPcs(job.returnedPcs);
                            }}
                          >
                            Update
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Update Modal */}
      <Modal
        isOpen={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        title="Update Returned Pieces"
      >
        {selectedJob && (
          <div className="space-y-4">
            <div className="p-4 bg-surface-50 rounded-lg">
              <p className="font-medium">{selectedJob.style?.name}</p>
              <p className="text-sm text-surface-500">
                Issued: {formatNumber(selectedJob.issuedPcs)} pcs
              </p>
            </div>

            <Input
              label="Returned Pieces"
              type="number"
              min={selectedJob.returnedPcs}
              max={selectedJob.issuedPcs}
              value={returnedPcs}
              onChange={(e) => setReturnedPcs(parseInt(e.target.value) || 0)}
              helperText={`Max: ${selectedJob.issuedPcs}`}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={() => setSelectedJob(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateJob} isLoading={isSubmitting}>
                Update
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

