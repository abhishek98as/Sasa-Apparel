'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
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
import { Search, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface Style {
  _id: string;
  code: string;
  name: string;
}

interface Tailor {
  _id: string;
  name: string;
}

interface TailorJob {
  _id: string;
  styleId: string;
  style?: Style;
  tailorId: string;
  tailor?: Tailor;
  issuedPcs: number;
  returnedPcs: number;
  rate: number;
  issueDate: string;
  status: 'pending' | 'in-progress' | 'completed' | 'returned';
  qcStatus: 'pending' | 'passed' | 'failed' | 'rework';
  qcNotes?: string;
  completedDate?: string;
}

export default function ProductionPage() {
  const { showToast } = useToast();
  const [jobs, setJobs] = useState<TailorJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<TailorJob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [updateData, setUpdateData] = useState({
    returnedPcs: 0,
    qcStatus: 'pending' as 'pending' | 'passed' | 'failed' | 'rework',
    qcNotes: '',
  });

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
      showToast('Failed to fetch jobs', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (job: TailorJob) => {
    setSelectedJob(job);
    setUpdateData({
      returnedPcs: job.returnedPcs,
      qcStatus: job.qcStatus,
      qcNotes: job.qcNotes || '',
    });
    setIsModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedJob) return;
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/tailor-jobs/${selectedJob._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (result.success) {
        showToast('Job updated successfully', 'success');
        setIsModalOpen(false);
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
      job.style?.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.tailor?.name.toLowerCase().includes(searchTerm.toLowerCase());

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
      case 'returned':
        return <Badge variant="info">Returned</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getQCBadge = (qcStatus: string) => {
    switch (qcStatus) {
      case 'pending':
        return <Badge variant="neutral">QC Pending</Badge>;
      case 'passed':
        return <Badge variant="success">QC Passed</Badge>;
      case 'failed':
        return <Badge variant="danger">QC Failed</Badge>;
      case 'rework':
        return <Badge variant="warning">Rework</Badge>;
      default:
        return <Badge>{qcStatus}</Badge>;
    }
  };

  // Stats
  const totalInProgress = jobs.filter((j) => j.status === 'in-progress').length;
  const totalCompleted = jobs.filter((j) => j.status === 'completed').length;
  const totalPending = jobs.reduce((sum, j) => sum + (j.issuedPcs - j.returnedPcs), 0);
  const totalCost = jobs.reduce((sum, j) => sum + j.returnedPcs * j.rate, 0);

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="animate-fade-in">
      <Header
        title="Production Tracking"
        subtitle="Monitor tailor jobs and quality control"
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-surface-500">In Progress</p>
                  <p className="text-xl font-bold">{totalInProgress}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-accent-600" />
                </div>
                <div>
                  <p className="text-sm text-surface-500">Completed</p>
                  <p className="text-xl font-bold">{totalCompleted}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-surface-500">Pending Pcs</p>
                  <p className="text-xl font-bold">{formatNumber(totalPending)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div>
                <p className="text-sm text-surface-500">Total Cost</p>
                <p className="text-xl font-bold">{formatCurrency(totalCost)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <Input
              placeholder="Search by style or tailor..."
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
              { value: 'pending', label: 'Pending' },
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
                  <TableHead>Tailor</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Returned</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>QC</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.length === 0 ? (
                  <TableEmpty message="No jobs found" colSpan={11} />
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
                      <TableCell>{job.tailor?.name}</TableCell>
                      <TableCell>{formatDate(job.issueDate)}</TableCell>
                      <TableCell>{formatNumber(job.issuedPcs)}</TableCell>
                      <TableCell className="font-medium">
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
                      <TableCell>
                        {formatCurrency(job.returnedPcs * job.rate)}
                      </TableCell>
                      <TableCell>{getStatusBadge(job.status)}</TableCell>
                      <TableCell>{getQCBadge(job.qcStatus)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleOpenModal(job)}
                        >
                          Update
                        </Button>
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
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Update Job Status"
      >
        {selectedJob && (
          <div className="space-y-4">
            <div className="p-4 bg-surface-50 rounded-lg">
              <p className="font-medium">{selectedJob.style?.name}</p>
              <p className="text-sm text-surface-500">
                Tailor: {selectedJob.tailor?.name} • Issued:{' '}
                {formatNumber(selectedJob.issuedPcs)} pcs
              </p>
            </div>

            <Input
              label="Returned Pieces"
              type="number"
              min="0"
              max={selectedJob.issuedPcs}
              value={updateData.returnedPcs}
              onChange={(e) =>
                setUpdateData({
                  ...updateData,
                  returnedPcs: parseInt(e.target.value) || 0,
                })
              }
              helperText={`Max: ${selectedJob.issuedPcs} pcs`}
            />

            <Select
              label="QC Status"
              value={updateData.qcStatus}
              onChange={(e) =>
                setUpdateData({
                  ...updateData,
                  qcStatus: e.target.value as typeof updateData.qcStatus,
                })
              }
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'passed', label: 'Passed' },
                { value: 'failed', label: 'Failed' },
                { value: 'rework', label: 'Needs Rework' },
              ]}
            />

            <Input
              label="QC Notes"
              value={updateData.qcNotes}
              onChange={(e) =>
                setUpdateData({ ...updateData, qcNotes: e.target.value })
              }
              placeholder="Optional notes about quality..."
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} isLoading={isSubmitting}>
                Update Job
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

