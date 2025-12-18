'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { PageLoader } from '@/components/ui/loading';
import { useToast } from '@/components/ui/toast';
import { formatNumber, formatDate, formatCurrency } from '@/lib/utils';
import { ClipboardList, Package, CheckCircle, DollarSign } from 'lucide-react';

interface Style {
  _id: string;
  code: string;
  name: string;
}

interface Job {
  _id: string;
  styleId: string;
  style?: Style;
  issuedPcs: number;
  returnedPcs: number;
  rate: number;
  issueDate: string;
  status: string;
  qcStatus: string;
}

interface DashboardData {
  stats: {
    totalJobs: number;
    activeJobs: number;
    completedJobs: number;
    totalIssued: number;
    totalReturned: number;
    pendingPcs: number;
    totalEarnings: number;
  };
  activeJobs: Job[];
  completedJobs: Job[];
}

export default function TailorDashboard() {
  const { showToast } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [returnedPcs, setReturnedPcs] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/tailor/dashboard');
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
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
        fetchData();
      } else {
        showToast(result.error, 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <PageLoader />;
  }

  const stats = data?.stats || {
    totalJobs: 0,
    activeJobs: 0,
    completedJobs: 0,
    totalIssued: 0,
    totalReturned: 0,
    pendingPcs: 0,
    totalEarnings: 0,
  };

  return (
    <div className="animate-fade-in">
      <Header
        title="Tailor Dashboard"
        subtitle="View your assignments and submit completed work"
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Active Jobs"
            value={stats.activeJobs}
            icon={ClipboardList}
            className="animate-slide-up stagger-1"
          />
          <StatCard
            title="Pending Pieces"
            value={formatNumber(stats.pendingPcs)}
            icon={Package}
            className="animate-slide-up stagger-2"
          />
          <StatCard
            title="Completed"
            value={formatNumber(stats.totalReturned)}
            icon={CheckCircle}
            className="animate-slide-up stagger-3"
          />
          <StatCard
            title="Total Earnings"
            value={formatCurrency(stats.totalEarnings)}
            icon={DollarSign}
            className="animate-slide-up stagger-4"
          />
        </div>

        {/* Active Jobs */}
        <Card>
          <CardHeader>
            <CardTitle>Active Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.activeJobs && data.activeJobs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.activeJobs.map((job) => (
                  <div
                    key={job._id}
                    className="p-4 border border-surface-200 rounded-lg"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold">{job.style?.name}</h4>
                        <p className="text-sm text-surface-500">
                          {job.style?.code}
                        </p>
                      </div>
                      <Badge variant="warning">In Progress</Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-surface-500">Issue Date</span>
                        <span>{formatDate(job.issueDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-surface-500">Issued</span>
                        <span className="font-semibold">{formatNumber(job.issuedPcs)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-surface-500">Returned</span>
                        <span className="font-semibold text-accent-600">
                          {formatNumber(job.returnedPcs)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-surface-500">Pending</span>
                        <span className="font-semibold text-amber-600">
                          {formatNumber(job.issuedPcs - job.returnedPcs)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-surface-500">Rate</span>
                        <span>{formatCurrency(job.rate)}/pc</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3">
                      <div className="w-full h-2 bg-surface-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent-500 rounded-full transition-all"
                          style={{
                            width: `${(job.returnedPcs / job.issuedPcs) * 100}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-surface-500 mt-1 text-center">
                        {Math.round((job.returnedPcs / job.issuedPcs) * 100)}%
                        complete
                      </p>
                    </div>

                    <Button
                      className="w-full mt-4"
                      onClick={() => {
                        setSelectedJob(job);
                        setReturnedPcs(job.returnedPcs);
                      }}
                    >
                      Update Progress
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-surface-500">
                No active assignments
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recently Completed */}
        <Card>
          <CardHeader>
            <CardTitle>Recently Completed</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.completedJobs && data.completedJobs.length > 0 ? (
              <div className="space-y-3">
                {data.completedJobs.map((job) => (
                  <div
                    key={job._id}
                    className="flex items-center justify-between p-3 bg-surface-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{job.style?.name}</p>
                      <p className="text-sm text-surface-500">
                        {job.style?.code} • {formatDate(job.issueDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatNumber(job.returnedPcs)} pcs
                      </p>
                      <p className="text-sm text-accent-600">
                        {formatCurrency(job.returnedPcs * job.rate)}
                      </p>
                    </div>
                    <Badge
                      variant={job.qcStatus === 'passed' ? 'success' : 'warning'}
                    >
                      {job.qcStatus === 'passed' ? 'QC Passed' : 'QC Pending'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-surface-500">
                No completed jobs yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Update Modal */}
      <Modal
        isOpen={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        title="Update Progress"
      >
        {selectedJob && (
          <div className="space-y-4">
            <div className="p-4 bg-surface-50 rounded-lg">
              <p className="font-medium">{selectedJob.style?.name}</p>
              <p className="text-sm text-surface-500">
                Issued: {formatNumber(selectedJob.issuedPcs)} pcs •
                Rate: {formatCurrency(selectedJob.rate)}/pc
              </p>
            </div>

            <Input
              label="Returned Pieces"
              type="number"
              min={selectedJob.returnedPcs}
              max={selectedJob.issuedPcs}
              value={returnedPcs}
              onChange={(e) => setReturnedPcs(parseInt(e.target.value) || 0)}
              helperText={`Previously returned: ${selectedJob.returnedPcs}. Max: ${selectedJob.issuedPcs}`}
            />

            <div className="p-4 bg-accent-50 rounded-lg">
              <p className="text-sm text-surface-600">
                Estimated earnings for this job:
              </p>
              <p className="text-xl font-bold text-accent-600">
                {formatCurrency(returnedPcs * selectedJob.rate)}
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={() => setSelectedJob(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdateJob}
                isLoading={isSubmitting}
                disabled={returnedPcs < selectedJob.returnedPcs}
              >
                Update
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

