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
import { Search, CheckCircle, Clock, AlertCircle, RefreshCw, Pencil, Trash2, XCircle } from 'lucide-react';

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
  rejectedPcs?: number;
  rejectionReason?: string;
  rate: number;
  issueDate: string;
  status: 'pending' | 'in-progress' | 'completed' | 'returned' | 'ready-to-ship' | 'shipped';
  qcStatus: 'pending' | 'passed' | 'failed' | 'rework' | 'rejected';
  qcNotes?: string;
  completedDate?: string;
  isRework?: boolean;
  sourceInspectionId?: string;
}

export default function ProductionPage() {
  const { showToast } = useToast();
  const [jobs, setJobs] = useState<TailorJob[]>([]);
  const [tailors, setTailors] = useState<Tailor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // Update modal (for returned pieces & QC)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<TailorJob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updateData, setUpdateData] = useState({
    returnedPcs: 0,
    qcStatus: 'pending' as 'pending' | 'passed' | 'failed' | 'rework' | 'rejected',
    qcNotes: '',
  });

  // Edit modal (for full job editing)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<TailorJob | null>(null);
  const [editData, setEditData] = useState({
    tailorId: '',
    issuedPcs: 0,
    returnedPcs: 0,
    rate: 0,
    status: 'in-progress' as 'pending' | 'in-progress' | 'completed' | 'returned' | 'ready-to-ship' | 'shipped',
    qcStatus: 'pending' as 'pending' | 'passed' | 'failed' | 'rework' | 'rejected',
    qcNotes: '',
  });

  // QC Rejection modal
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectingJob, setRejectingJob] = useState<TailorJob | null>(null);
  const [rejectData, setRejectData] = useState({
    rejectedPcs: 0,
    rejectionReason: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [jobsRes, tailorsRes] = await Promise.all([
        fetch('/api/tailor-jobs'),
        fetch('/api/tailors?active=true'),
      ]);
      const [jobsData, tailorsData] = await Promise.all([
        jobsRes.json(),
        tailorsRes.json(),
      ]);

      if (jobsData.success) setJobs(jobsData.data);
      if (tailorsData.success) setTailors(tailorsData.data);
    } catch (error) {
      showToast('Failed to fetch data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Open Update Modal (for returned pieces & QC)
  const handleOpenUpdateModal = (job: TailorJob) => {
    setSelectedJob(job);
    setUpdateData({
      returnedPcs: job.returnedPcs,
      qcStatus: job.qcStatus,
      qcNotes: job.qcNotes || '',
    });
    setIsUpdateModalOpen(true);
  };

  // Open Edit Modal (for full job editing)
  const handleOpenEditModal = (job: TailorJob) => {
    setEditingJob(job);
    setEditData({
      tailorId: job.tailorId,
      issuedPcs: job.issuedPcs,
      returnedPcs: job.returnedPcs,
      rate: job.rate,
      status: job.status,
      qcStatus: job.qcStatus,
      qcNotes: job.qcNotes || '',
    });
    setIsEditModalOpen(true);
  };

  // Handle Update (returned pieces & QC only)
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
        showToast(result.message || 'Job updated successfully', 'success');
        setIsUpdateModalOpen(false);
        fetchData();
      } else {
        showToast(result.error || 'Failed to update job', 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit (full job editing)
  const handleEdit = async () => {
    if (!editingJob) return;
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/tailor-jobs/${editingJob._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });

      const result = await response.json();

      if (result.success) {
        showToast(result.message || 'Job updated successfully', 'success');
        setIsEditModalOpen(false);
        fetchData();
      } else {
        showToast(result.error || 'Failed to update job', 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Reject Modal
  const handleOpenRejectModal = (job: TailorJob) => {
    setRejectingJob(job);
    setRejectData({
      rejectedPcs: job.rejectedPcs || 0,
      rejectionReason: job.rejectionReason || '',
    });
    setIsRejectModalOpen(true);
  };

  // Handle Rejection
  const handleReject = async () => {
    if (!rejectingJob) return;
    if (rejectData.rejectedPcs <= 0) {
      showToast('Please enter rejected pieces count', 'error');
      return;
    }
    if (!rejectData.rejectionReason.trim()) {
      showToast('Please enter a rejection reason', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/tailor-jobs/${rejectingJob._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qcStatus: 'rejected',
          rejectedPcs: rejectData.rejectedPcs,
          rejectionReason: rejectData.rejectionReason,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showToast('Job marked as rejected', 'success');
        setIsRejectModalOpen(false);
        fetchData();
      } else {
        showToast(result.error || 'Failed to reject job', 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete
  const handleDelete = async (job: TailorJob) => {
    if (!confirm(`Are you sure you want to delete this job for "${job.style?.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/tailor-jobs/${job._id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        showToast(result.message || 'Job deleted successfully', 'success');
        fetchData();
      } else {
        showToast(result.error || 'Failed to delete job', 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.style?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.style?.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.tailor?.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      !filterStatus ||
      (filterStatus === 'rework'
        ? job.isRework || job.qcStatus === 'rework'
        : job.status === filterStatus);

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string, isRework?: boolean) => {
    if (isRework) {
      return <Badge variant="danger">Rework</Badge>;
    }
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

  const getQCBadge = (qcStatus: string, rejectedPcs?: number) => {
    switch (qcStatus) {
      case 'pending':
        return <Badge variant="neutral">QC Pending</Badge>;
      case 'passed':
        return <Badge variant="success">QC Passed</Badge>;
      case 'failed':
        return <Badge variant="danger">QC Failed</Badge>;
      case 'rework':
        return <Badge variant="warning">Rework</Badge>;
      case 'rejected':
        return (
          <div>
            <Badge variant="danger">Rejected</Badge>
            {rejectedPcs && rejectedPcs > 0 && (
              <span className="text-xs text-red-600 ml-1">({rejectedPcs})</span>
            )}
          </div>
        );
      default:
        return <Badge>{qcStatus}</Badge>;
    }
  };

  // Stats
  const totalInProgress = jobs.filter((j) => j.status === 'in-progress' && !j.isRework).length;
  const totalCompleted = jobs.filter((j) => j.status === 'completed').length;
  const totalRework = jobs.filter((j) => j.isRework || j.qcStatus === 'rework').length;
  const totalPending = jobs.reduce((sum, j) => sum + ((j.issuedPcs || 0) - (j.returnedPcs || 0)), 0);
  const totalCost = jobs.reduce((sum, j) => sum + (j.returnedPcs || 0) * (j.rate || 0), 0);

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="animate-fade-in">
      <Header
        title="Production Tracking"
        subtitle="Monitor and edit tailor jobs and quality control"
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
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
                <div className="p-2 bg-accent-100 dark:bg-green-900/30 rounded-lg">
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
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <RefreshCw className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-surface-500">Rework</p>
                  <p className="text-xl font-bold">{totalRework}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
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
              { value: 'rework', label: 'Rework' },
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
                      <TableCell>{getStatusBadge(job.status, job.isRework)}</TableCell>
                      <TableCell>{getQCBadge(job.qcStatus, job.rejectedPcs)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleOpenUpdateModal(job)}
                            title="Update Return/QC"
                          >
                            Update
                          </Button>
                          {job.returnedPcs > 0 && job.qcStatus !== 'rejected' && (
                            <button
                              onClick={() => handleOpenRejectModal(job)}
                              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-surface-500 hover:text-red-600"
                              title="Reject QC"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEditModal(job)}
                            className="p-1.5 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg text-surface-500 hover:text-surface-700"
                            title="Edit Job"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(job)}
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-surface-500 hover:text-red-600"
                            title="Delete Job"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Update Modal (Returned Pieces & QC) */}
      <Modal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        title="Update Return & QC Status"
      >
        {selectedJob && (
          <div className="space-y-4">
            <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
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
              <Button variant="secondary" onClick={() => setIsUpdateModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} isLoading={isSubmitting}>
                Update
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal (Full Job Editing) */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Production Job"
        size="lg"
      >
        {editingJob && (
          <div className="space-y-4">
            <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
              <p className="font-medium">{editingJob.style?.name}</p>
              <p className="text-sm text-surface-500">
                Style Code: {editingJob.style?.code} • Issue Date: {formatDate(editingJob.issueDate)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Tailor"
                value={editData.tailorId}
                onChange={(e) =>
                  setEditData({ ...editData, tailorId: e.target.value })
                }
                options={tailors.map((t) => ({ value: t._id, label: t.name }))}
              />
              <Input
                label="Rate (₹/pc)"
                type="number"
                min="0"
                value={editData.rate}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    rate: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Issued Pieces"
                type="number"
                min="1"
                value={editData.issuedPcs}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    issuedPcs: parseInt(e.target.value) || 0,
                  })
                }
              />
              <Input
                label="Returned Pieces"
                type="number"
                min="0"
                max={editData.issuedPcs}
                value={editData.returnedPcs}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    returnedPcs: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Status"
                value={editData.status}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    status: e.target.value as typeof editData.status,
                  })
                }
                options={[
                  { value: 'pending', label: 'Pending' },
                  { value: 'in-progress', label: 'In Progress' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'returned', label: 'Returned' },
                  { value: 'ready-to-ship', label: 'Ready to Ship' },
                  { value: 'shipped', label: 'Shipped' },
                ]}
              />
              <Select
                label="QC Status"
                value={editData.qcStatus}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    qcStatus: e.target.value as typeof editData.qcStatus,
                  })
                }
                options={[
                  { value: 'pending', label: 'QC Pending' },
                  { value: 'passed', label: 'QC Passed' },
                  { value: 'failed', label: 'QC Failed' },
                  { value: 'rework', label: 'Rework' },
                  { value: 'rejected', label: 'Rejected' },
                ]}
              />
            </div>

            <Input
              label="QC Notes"
              value={editData.qcNotes}
              onChange={(e) =>
                setEditData({ ...editData, qcNotes: e.target.value })
              }
              placeholder="Optional notes..."
            />

            {/* Summary */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-surface-600 dark:text-surface-400">Pending Pieces:</span>
                <span className="font-medium">{formatNumber(editData.issuedPcs - editData.returnedPcs)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-surface-600 dark:text-surface-400">Total Amount:</span>
                <span className="font-medium">{formatCurrency(editData.returnedPcs * editData.rate)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEdit} isLoading={isSubmitting}>
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* QC Rejection Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Reject QC - Mark Defective"
      >
        {rejectingJob && (
          <div className="space-y-4">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="font-medium text-red-800 dark:text-red-200">
                {rejectingJob.style?.name}
              </p>
              <p className="text-sm text-red-600 dark:text-red-300">
                Tailor: {rejectingJob.tailor?.name} • Returned: {formatNumber(rejectingJob.returnedPcs)} pcs
              </p>
            </div>

            <Input
              label="Rejected Pieces"
              type="number"
              min="1"
              max={rejectingJob.returnedPcs}
              value={rejectData.rejectedPcs}
              onChange={(e) =>
                setRejectData({
                  ...rejectData,
                  rejectedPcs: parseInt(e.target.value) || 0,
                })
              }
              helperText={`Max: ${rejectingJob.returnedPcs} pcs (total returned)`}
            />

            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100"
                rows={3}
                value={rejectData.rejectionReason}
                onChange={(e) =>
                  setRejectData({ ...rejectData, rejectionReason: e.target.value })
                }
                placeholder="Describe the quality issue or defect..."
              />
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Note:</strong> Rejected pieces can be reassigned to the same or a different tailor for rework via the Distribution page.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={() => setIsRejectModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleReject} 
                isLoading={isSubmitting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
