'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { PageLoader } from '@/components/ui/loading';
import { useToast } from '@/components/ui/toast';
import { formatDate } from '@/lib/utils';
import {
  Plus,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ListChecks,
  ClipboardCheck,
  Trash2,
  Eye,
} from 'lucide-react';

interface Style {
  _id: string;
  code: string;
  name: string;
}

interface Tailor {
  _id: string;
  name: string;
}

interface QCChecklistItem {
  label: string;
  category: 'stitching' | 'fabric' | 'measurement' | 'other';
  isCritical?: boolean;
}

interface QCChecklist {
  _id: string;
  styleId: string;
  items: QCChecklistItem[];
  version: number;
  isActive: boolean;
  createdAt: string;
}

interface QCDefect {
  category: 'stitching' | 'fabric' | 'measurement' | 'other';
  description: string;
  severity?: 'low' | 'medium' | 'high';
}

interface QCInspection {
  _id: string;
  styleId: string;
  jobId?: string;
  checklistId?: string;
  status: 'pending' | 'passed' | 'failed' | 'rework';
  defects?: QCDefect[];
  photos?: string[];
  rejectionReason?: string;
  reworkAssignedTo?: string;
  inspectedBy: { userId: string; name: string };
  createdAt: string;
}

const defectCategories = ['stitching', 'fabric', 'measurement', 'other'] as const;

export default function QCPage() {
  const { showToast } = useToast();
  const [styles, setStyles] = useState<Style[]>([]);
  const [tailors, setTailors] = useState<Tailor[]>([]);
  const [checklists, setChecklists] = useState<QCChecklist[]>([]);
  const [inspections, setInspections] = useState<QCInspection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'checklists' | 'inspections'>('inspections');

  // Filters
  const [styleFilter, setStyleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [viewInspection, setViewInspection] = useState<QCInspection | null>(null);

  // Checklist form
  const [checklistForm, setChecklistForm] = useState({
    styleId: '',
    items: [] as QCChecklistItem[],
    isActive: true,
  });
  const [newItem, setNewItem] = useState<QCChecklistItem>({
    label: '',
    category: 'stitching',
    isCritical: false,
  });

  // Inspection form
  const [inspectionForm, setInspectionForm] = useState({
    styleId: '',
    jobId: '',
    status: 'pending' as QCInspection['status'],
    defects: [] as QCDefect[],
    rejectionReason: '',
    reworkAssignedTo: '',
  });
  const [newDefect, setNewDefect] = useState<QCDefect>({
    category: 'stitching',
    description: '',
    severity: 'medium',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [stylesRes, tailorsRes, checklistsRes, inspectionsRes] = await Promise.all([
        fetch('/api/styles?active=true'),
        fetch('/api/tailors?active=true'),
        fetch('/api/qc/checklists'),
        fetch('/api/qc/inspections'),
      ]);

      const [stylesData, tailorsData, checklistsData, inspectionsData] = await Promise.all([
        stylesRes.json(),
        tailorsRes.json(),
        checklistsRes.json(),
        inspectionsRes.json(),
      ]);

      if (stylesData.success) setStyles(stylesData.data);
      if (tailorsData.success) setTailors(tailorsData.data);
      if (checklistsData.success) setChecklists(checklistsData.data);
      if (inspectionsData.success) setInspections(inspectionsData.data);
    } catch (error) {
      console.error('Failed to fetch QC data:', error);
      showToast('Failed to load QC data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredInspections = inspections.filter((i) => {
    if (styleFilter && i.styleId !== styleFilter) return false;
    if (statusFilter && i.status !== statusFilter) return false;
    return true;
  });

  const getStyleName = (id: string) => styles.find((s) => s._id === id)?.name || 'Unknown';
  const getTailorName = (id: string) => tailors.find((t) => t._id === id)?.name || 'Unknown';

  const addChecklistItem = () => {
    if (!newItem.label.trim()) return;
    setChecklistForm({
      ...checklistForm,
      items: [...checklistForm.items, { ...newItem }],
    });
    setNewItem({ label: '', category: 'stitching', isCritical: false });
  };

  const removeChecklistItem = (index: number) => {
    setChecklistForm({
      ...checklistForm,
      items: checklistForm.items.filter((_, i) => i !== index),
    });
  };

  const addDefect = () => {
    if (!newDefect.description.trim()) return;
    setInspectionForm({
      ...inspectionForm,
      defects: [...inspectionForm.defects, { ...newDefect }],
    });
    setNewDefect({ category: 'stitching', description: '', severity: 'medium' });
  };

  const removeDefect = (index: number) => {
    setInspectionForm({
      ...inspectionForm,
      defects: inspectionForm.defects.filter((_, i) => i !== index),
    });
  };

  const handleSubmitChecklist = async () => {
    if (!checklistForm.styleId || checklistForm.items.length === 0) {
      showToast('Please select a style and add at least one item', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/qc/checklists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checklistForm),
      });

      const result = await response.json();

      if (result.success) {
        showToast('Checklist created successfully', 'success');
        setShowChecklistModal(false);
        setChecklistForm({ styleId: '', items: [], isActive: true });
        fetchData();
      } else {
        showToast(result.error || 'Failed to create checklist', 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitInspection = async () => {
    if (!inspectionForm.styleId) {
      showToast('Please select a style', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        styleId: inspectionForm.styleId,
        status: inspectionForm.status,
      };

      if (inspectionForm.defects.length > 0) {
        payload.defects = inspectionForm.defects;
      }
      if (inspectionForm.rejectionReason) {
        payload.rejectionReason = inspectionForm.rejectionReason;
      }
      if (inspectionForm.reworkAssignedTo) {
        payload.reworkAssignedTo = inspectionForm.reworkAssignedTo;
      }

      const response = await fetch('/api/qc/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        showToast('Inspection recorded successfully', 'success');
        setShowInspectionModal(false);
        setInspectionForm({
          styleId: '',
          jobId: '',
          status: 'pending',
          defects: [],
          rejectionReason: '',
          reworkAssignedTo: '',
        });
        fetchData();
      } else {
        showToast(result.error || 'Failed to record inspection', 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'passed':
        return <Badge variant="success">Passed</Badge>;
      case 'failed':
        return <Badge variant="danger">Failed</Badge>;
      case 'rework':
        return <Badge variant="warning">Rework</Badge>;
      default:
        return <Badge variant="neutral">Pending</Badge>;
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      stitching: 'info',
      fabric: 'warning',
      measurement: 'danger',
      other: 'neutral',
    };
    return <Badge variant={colors[category] as any}>{category}</Badge>;
  };

  // Stats
  const passedCount = inspections.filter((i) => i.status === 'passed').length;
  const failedCount = inspections.filter((i) => i.status === 'failed').length;
  const reworkCount = inspections.filter((i) => i.status === 'rework').length;

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="animate-fade-in">
      <Header
        title="Quality Control"
        subtitle="Checklists, inspections, and defect tracking"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowChecklistModal(true)}>
              <ListChecks className="w-4 h-4" />
              New Checklist
            </Button>
            <Button onClick={() => setShowInspectionModal(true)}>
              <Plus className="w-4 h-4" />
              New Inspection
            </Button>
          </div>
        }
      />

      <div className="p-4 sm:p-6 space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="py-4 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ClipboardCheck className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                  {inspections.length}
                </p>
                <p className="text-sm text-surface-500">Total Inspections</p>
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
                  {passedCount}
                </p>
                <p className="text-sm text-surface-500">Passed</p>
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
                  {failedCount}
                </p>
                <p className="text-sm text-surface-500">Failed</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                  {reworkCount}
                </p>
                <p className="text-sm text-surface-500">Rework</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-surface-200 dark:border-surface-700">
          {[
            { key: 'inspections', label: 'Inspections' },
            { key: 'checklists', label: 'Checklists' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-surface-500 hover:text-surface-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Inspections Tab */}
        {activeTab === 'inspections' && (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row gap-3 justify-between">
                <CardTitle>QC Inspections</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={styleFilter}
                    onChange={(e) => setStyleFilter(e.target.value)}
                    className="select w-40"
                  >
                    <option value="">All Styles</option>
                    {styles.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="select w-32"
                  >
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="passed">Passed</option>
                    <option value="failed">Failed</option>
                    <option value="rework">Rework</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Style</th>
                      <th>Status</th>
                      <th>Defects</th>
                      <th>Rework To</th>
                      <th>Inspected By</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInspections.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-surface-500">
                          No inspections found
                        </td>
                      </tr>
                    ) : (
                      filteredInspections.map((inspection) => (
                        <tr key={inspection._id}>
                          <td>{formatDate(inspection.createdAt)}</td>
                          <td className="font-medium">{getStyleName(inspection.styleId)}</td>
                          <td>{getStatusBadge(inspection.status)}</td>
                          <td>{inspection.defects?.length || 0}</td>
                          <td>
                            {inspection.reworkAssignedTo
                              ? getTailorName(inspection.reworkAssignedTo)
                              : '-'}
                          </td>
                          <td>{inspection.inspectedBy?.name || '-'}</td>
                          <td>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setViewInspection(inspection)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Checklists Tab */}
        {activeTab === 'checklists' && (
          <Card>
            <CardHeader>
              <CardTitle>QC Checklists by Style</CardTitle>
            </CardHeader>
            <CardContent>
              {checklists.length === 0 ? (
                <div className="py-8 text-center text-surface-500">
                  No checklists created yet. Create one to define QC criteria per style.
                </div>
              ) : (
                <div className="space-y-4">
                  {checklists.map((checklist) => (
                    <div
                      key={checklist._id}
                      className="border border-surface-200 dark:border-surface-700 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium">{getStyleName(checklist.styleId)}</h4>
                          <p className="text-sm text-surface-500">
                            Version {checklist.version} • {checklist.items.length} items
                          </p>
                        </div>
                        <Badge variant={checklist.isActive ? 'success' : 'neutral'}>
                          {checklist.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {checklist.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-sm p-2 bg-surface-50 dark:bg-surface-800 rounded"
                          >
                            <span className="flex-1">{item.label}</span>
                            {getCategoryBadge(item.category)}
                            {item.isCritical && (
                              <Badge variant="danger">Critical</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* New Checklist Modal */}
      <Modal
        isOpen={showChecklistModal}
        onClose={() => {
          setShowChecklistModal(false);
          setChecklistForm({ styleId: '', items: [], isActive: true });
        }}
        title="Create QC Checklist"
      >
        <div className="space-y-4">
          <Select
            label="Style"
            value={checklistForm.styleId}
            onChange={(e) => setChecklistForm({ ...checklistForm, styleId: e.target.value })}
            options={[
              { value: '', label: 'Select a style...' },
              ...styles.map((s) => ({ value: s._id, label: `${s.code} - ${s.name}` })),
            ]}
          />

          <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-4">
            <h4 className="text-sm font-medium mb-3">Checklist Items</h4>

            {checklistForm.items.length > 0 && (
              <div className="space-y-2 mb-4">
                {checklistForm.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-surface-50 dark:bg-surface-800 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{item.label}</span>
                      {getCategoryBadge(item.category)}
                      {item.isCritical && <Badge variant="danger">Critical</Badge>}
                    </div>
                    <button
                      onClick={() => removeChecklistItem(idx)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              <Input
                label="Item Label"
                value={newItem.label}
                onChange={(e) => setNewItem({ ...newItem, label: e.target.value })}
                placeholder="e.g., Check seam alignment"
              />
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Category"
                  value={newItem.category}
                  onChange={(e) =>
                    setNewItem({ ...newItem, category: e.target.value as typeof newItem.category })
                  }
                  options={defectCategories.map((c) => ({ value: c, label: c }))}
                />
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm pb-2.5">
                    <input
                      type="checkbox"
                      checked={newItem.isCritical}
                      onChange={(e) => setNewItem({ ...newItem, isCritical: e.target.checked })}
                      className="rounded"
                    />
                    Critical Item
                  </label>
                </div>
              </div>
              <Button variant="secondary" onClick={addChecklistItem} disabled={!newItem.label}>
                <Plus className="w-4 h-4" />
                Add Item
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowChecklistModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitChecklist}
              isLoading={isSubmitting}
              disabled={!checklistForm.styleId || checklistForm.items.length === 0}
            >
              Create Checklist
            </Button>
          </div>
        </div>
      </Modal>

      {/* New Inspection Modal */}
      <Modal
        isOpen={showInspectionModal}
        onClose={() => {
          setShowInspectionModal(false);
          setInspectionForm({
            styleId: '',
            jobId: '',
            status: 'pending',
            defects: [],
            rejectionReason: '',
            reworkAssignedTo: '',
          });
        }}
        title="Record QC Inspection"
      >
        <div className="space-y-4">
          <Select
            label="Style"
            value={inspectionForm.styleId}
            onChange={(e) => setInspectionForm({ ...inspectionForm, styleId: e.target.value })}
            options={[
              { value: '', label: 'Select a style...' },
              ...styles.map((s) => ({ value: s._id, label: `${s.code} - ${s.name}` })),
            ]}
          />

          <Select
            label="Status"
            value={inspectionForm.status}
            onChange={(e) =>
              setInspectionForm({
                ...inspectionForm,
                status: e.target.value as QCInspection['status'],
              })
            }
            options={[
              { value: 'pending', label: 'Pending' },
              { value: 'passed', label: 'Passed' },
              { value: 'failed', label: 'Failed' },
              { value: 'rework', label: 'Rework Required' },
            ]}
          />

          {(inspectionForm.status === 'failed' || inspectionForm.status === 'rework') && (
            <>
              <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-3">Defects Found</h4>

                {inspectionForm.defects.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {inspectionForm.defects.map((defect, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-surface-50 dark:bg-surface-800 rounded"
                      >
                        <div className="flex items-center gap-2">
                          {getCategoryBadge(defect.category)}
                          <span className="text-sm">{defect.description}</span>
                          <Badge
                            variant={
                              defect.severity === 'high'
                                ? 'danger'
                                : defect.severity === 'medium'
                                ? 'warning'
                                : 'neutral'
                            }
                          >
                            {defect.severity}
                          </Badge>
                        </div>
                        <button
                          onClick={() => removeDefect(idx)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Select
                      label="Category"
                      value={newDefect.category}
                      onChange={(e) =>
                        setNewDefect({
                          ...newDefect,
                          category: e.target.value as typeof newDefect.category,
                        })
                      }
                      options={defectCategories.map((c) => ({ value: c, label: c }))}
                    />
                    <Select
                      label="Severity"
                      value={newDefect.severity}
                      onChange={(e) =>
                        setNewDefect({
                          ...newDefect,
                          severity: e.target.value as typeof newDefect.severity,
                        })
                      }
                      options={[
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'high', label: 'High' },
                      ]}
                    />
                  </div>
                  <Input
                    label="Description"
                    value={newDefect.description}
                    onChange={(e) => setNewDefect({ ...newDefect, description: e.target.value })}
                    placeholder="Describe the defect..."
                  />
                  <Button
                    variant="secondary"
                    onClick={addDefect}
                    disabled={!newDefect.description}
                  >
                    <Plus className="w-4 h-4" />
                    Add Defect
                  </Button>
                </div>
              </div>

              <Input
                label="Rejection Reason"
                value={inspectionForm.rejectionReason}
                onChange={(e) =>
                  setInspectionForm({ ...inspectionForm, rejectionReason: e.target.value })
                }
                placeholder="Overall reason for rejection..."
              />

              {inspectionForm.status === 'rework' && (
                <Select
                  label="Assign Rework To"
                  value={inspectionForm.reworkAssignedTo}
                  onChange={(e) =>
                    setInspectionForm({ ...inspectionForm, reworkAssignedTo: e.target.value })
                  }
                  options={[
                    { value: '', label: 'Select tailor...' },
                    ...tailors.map((t) => ({ value: t._id, label: t.name })),
                  ]}
                />
              )}
            </>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowInspectionModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitInspection}
              isLoading={isSubmitting}
              disabled={!inspectionForm.styleId}
            >
              Record Inspection
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Inspection Modal */}
      <Modal
        isOpen={!!viewInspection}
        onClose={() => setViewInspection(null)}
        title="Inspection Details"
      >
        {viewInspection && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-surface-500">Style</p>
                <p className="font-medium">{getStyleName(viewInspection.styleId)}</p>
              </div>
              <div>
                <p className="text-sm text-surface-500">Status</p>
                {getStatusBadge(viewInspection.status)}
              </div>
              <div>
                <p className="text-sm text-surface-500">Inspected By</p>
                <p className="font-medium">{viewInspection.inspectedBy?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-surface-500">Date</p>
                <p className="font-medium">{formatDate(viewInspection.createdAt)}</p>
              </div>
            </div>

            {viewInspection.defects && viewInspection.defects.length > 0 && (
              <div>
                <p className="text-sm text-surface-500 mb-2">Defects Found</p>
                <div className="space-y-2">
                  {viewInspection.defects.map((defect, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-surface-50 dark:bg-surface-800 rounded flex items-center gap-2"
                    >
                      {getCategoryBadge(defect.category)}
                      <span className="text-sm">{defect.description}</span>
                      {defect.severity && (
                        <Badge
                          variant={
                            defect.severity === 'high'
                              ? 'danger'
                              : defect.severity === 'medium'
                              ? 'warning'
                              : 'neutral'
                          }
                        >
                          {defect.severity}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {viewInspection.rejectionReason && (
              <div>
                <p className="text-sm text-surface-500">Rejection Reason</p>
                <p className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm">
                  {viewInspection.rejectionReason}
                </p>
              </div>
            )}

            {viewInspection.reworkAssignedTo && (
              <div>
                <p className="text-sm text-surface-500">Rework Assigned To</p>
                <p className="font-medium">{getTailorName(viewInspection.reworkAssignedTo)}</p>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button variant="secondary" onClick={() => setViewInspection(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
