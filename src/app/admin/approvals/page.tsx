'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/loading';
import { useToast } from '@/components/ui/toast';
import { formatDate } from '@/lib/utils';
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react';

interface ApprovalRequest {
  _id: string;
  entityType: string;
  entityId: string;
  action: string;
  payload: {
    collection: string;
    type: string;
    data?: Record<string, unknown>;
  };
  requestedBy: {
    userId: string;
    name: string;
    role: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  decisionBy?: string;
  decisionRemarks?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ApprovalsPage() {
  const { showToast } = useToast();
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<{
    approval: ApprovalRequest;
    action: 'approve' | 'reject';
  } | null>(null);
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchApprovals();
  }, [statusFilter]);

  const fetchApprovals = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/approvals?status=${statusFilter}`);
      const result = await response.json();
      if (result.success) {
        setApprovals(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch approvals:', error);
      showToast('Failed to load approvals', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async () => {
    if (!actionModal) return;
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/approvals/${actionModal.approval._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionModal.action,
          remarks: remarks || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showToast(
          actionModal.action === 'approve'
            ? 'Request approved successfully'
            : 'Request rejected',
          'success'
        );
        setActionModal(null);
        setRemarks('');
        fetchApprovals();
      } else {
        showToast(result.error || 'Action failed', 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEntityLabel = (type: string) => {
    const labels: Record<string, string> = {
      user: 'User',
      vendor: 'Vendor',
      tailor: 'Tailor',
      style: 'Style',
      fabricCutting: 'Fabric Cutting',
      tailorJob: 'Tailor Job',
      shipment: 'Shipment',
      rate: 'Rate',
      inventoryItem: 'Inventory Item',
      qcChecklist: 'QC Checklist',
      qcInspection: 'QC Inspection',
    };
    return labels[type] || type;
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      update: 'Update',
      delete: 'Delete',
      create: 'Create',
    };
    return labels[action] || action;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'approved':
        return <Badge variant="success">Approved</Badge>;
      case 'rejected':
        return <Badge variant="danger">Rejected</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const renderPayloadDiff = (payload: ApprovalRequest['payload']) => {
    if (!payload.data) return <p className="text-surface-500">No changes to display</p>;

    // Sanitize data: remove internal fields that shouldn't be shown
    const sanitizedData = { ...payload.data };
    // Remove sensitive/internal fields
    const internalFields = ['_id', 'password', 'passwordHash', 'createdAt', 'updatedAt', '__v', 'internalNotes'];
    internalFields.forEach(field => {
      if (field in sanitizedData) {
        delete sanitizedData[field];
      }
    });

    return (
      <div className="space-y-2">
        <p className="text-xs text-surface-500 uppercase tracking-wide">
          Type: {payload.type === 'softDelete' ? 'Delete' : 'Update'}
        </p>
        <div className="bg-surface-50 dark:bg-surface-800 rounded-lg p-3 overflow-auto max-h-60">
          <pre className="text-xs text-surface-700 dark:text-surface-300 whitespace-pre-wrap">
            {JSON.stringify(sanitizedData, null, 2)}
          </pre>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="animate-fade-in">
      <Header
        title="Approvals"
        subtitle="Review and act on pending requests from managers and tailors"
      />

      <div className="p-4 sm:p-6 space-y-4">
        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-3">
              <Filter className="w-4 h-4 text-surface-500" />
              <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
                Status:
              </span>
              <div className="flex gap-2">
                {['pending', 'approved', 'rejected', ''].map((status) => (
                  <button
                    key={status || 'all'}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      statusFilter === status
                        ? 'bg-primary-600 text-white'
                        : 'bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300'
                    }`}
                  >
                    {status === '' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="py-4 flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                  {approvals.filter((a) => a.status === 'pending').length}
                </p>
                <p className="text-sm text-surface-500">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                  {statusFilter === 'approved' ? approvals.length : '-'}
                </p>
                <p className="text-sm text-surface-500">Approved</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                  {statusFilter === 'rejected' ? approvals.length : '-'}
                </p>
                <p className="text-sm text-surface-500">Rejected</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Approvals List */}
        <Card>
          <CardHeader>
            <CardTitle>
              {statusFilter
                ? `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Requests`
                : 'All Requests'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {approvals.length === 0 ? (
              <div className="py-12 text-center text-surface-500">
                No {statusFilter || ''} approval requests found
              </div>
            ) : (
              <div className="space-y-3">
                {approvals.map((approval) => (
                  <div
                    key={approval._id}
                    className="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden"
                  >
                    {/* Header Row */}
                    <div
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800"
                      onClick={() =>
                        setExpandedId(expandedId === approval._id ? null : approval._id)
                      }
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-surface-100 dark:bg-surface-800 rounded-lg">
                          <User className="w-4 h-4 text-surface-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-surface-900 dark:text-surface-50">
                              {getActionLabel(approval.action)}
                            </span>
                            <span className="text-surface-500">
                              {getEntityLabel(approval.entityType)}
                            </span>
                            {getStatusBadge(approval.status)}
                          </div>
                          <p className="text-sm text-surface-500 mt-1">
                            Requested by{' '}
                            <span className="font-medium">{approval.requestedBy.name}</span>
                            {' '}({approval.requestedBy.role}) on{' '}
                            {formatDate(approval.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {approval.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionModal({ approval, action: 'approve' });
                              }}
                            >
                              <CheckCircle className="w-4 h-4" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionModal({ approval, action: 'reject' });
                              }}
                            >
                              <XCircle className="w-4 h-4" />
                              Reject
                            </Button>
                          </>
                        )}
                        {expandedId === approval._id ? (
                          <ChevronUp className="w-5 h-5 text-surface-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-surface-400" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedId === approval._id && (
                      <div className="border-t border-surface-200 dark:border-surface-700 p-4 bg-surface-50 dark:bg-surface-800/50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                              Request Details
                            </h4>
                            <div className="space-y-1 text-sm">
                              <p>
                                <span className="text-surface-500">Date Requested:</span>{' '}
                                {formatDate(approval.createdAt)}
                              </p>
                              <p>
                                <span className="text-surface-500">Requester Role:</span>{' '}
                                {approval.requestedBy.role.charAt(0).toUpperCase() + approval.requestedBy.role.slice(1)}
                              </p>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                              Changes
                            </h4>
                            {renderPayloadDiff(approval.payload)}
                          </div>
                        </div>
                        {approval.decisionRemarks && (
                          <div className="mt-4 p-3 bg-surface-100 dark:bg-surface-700 rounded-lg">
                            <p className="text-sm">
                              <span className="font-medium">Decision Remarks:</span>{' '}
                              {approval.decisionRemarks}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Modal */}
      <Modal
        isOpen={!!actionModal}
        onClose={() => {
          setActionModal(null);
          setRemarks('');
        }}
        title={actionModal?.action === 'approve' ? 'Approve Request' : 'Reject Request'}
      >
        {actionModal && (
          <div className="space-y-4">
            <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
              <p className="text-sm">
                <span className="font-medium">Action:</span>{' '}
                {getActionLabel(actionModal.approval.action)}{' '}
                {getEntityLabel(actionModal.approval.entityType)}
              </p>
              <p className="text-sm mt-1">
                <span className="font-medium">Requested by:</span>{' '}
                {actionModal.approval.requestedBy.name}
              </p>
            </div>

            <Input
              label="Remarks (optional)"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add any notes about this decision..."
            />

            {actionModal.action === 'approve' && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Approving this request will apply the changes immediately.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setActionModal(null);
                  setRemarks('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant={actionModal.action === 'approve' ? 'primary' : 'danger'}
                onClick={handleAction}
                isLoading={isSubmitting}
              >
                {actionModal.action === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
