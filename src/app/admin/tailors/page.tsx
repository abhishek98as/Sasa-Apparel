'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { formatNumber, formatDate } from '@/lib/utils';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Calendar,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface Tailor {
  _id: string;
  name: string;
  phone: string;
  address?: string;
  specialization?: string;
  skills?: string[];
  dailyCapacity?: number;
  leaves?: { date: string; reason: string; approved?: boolean }[];
  overtime?: { date: string; hours: number; notes?: string }[];
  isActive: boolean;
}

interface ScheduleData {
  _id: string;
  name: string;
  phone: string;
  skills: string[];
  dailyCapacity: number;
  pendingPcs: number;
  pendingJobs: number;
  daysNeeded: number;
  upcomingLeaves: { date: string; reason: string }[];
  totalCapacity: number;
  availableCapacity: number;
  workloadStatus: 'available' | 'moderate' | 'overloaded';
  utilizationRate: number;
}

export default function TailorsPage() {
  const { showToast } = useToast();
  const [tailors, setTailors] = useState<Tailor[]>([]);
  const [scheduleData, setScheduleData] = useState<ScheduleData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'schedule'>('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTailor, setEditingTailor] = useState<Tailor | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Leave/Overtime modals
  const [leaveModal, setLeaveModal] = useState<{ tailorId: string; name: string } | null>(null);
  const [overtimeModal, setOvertimeModal] = useState<{ tailorId: string; name: string } | null>(null);
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [overtimeDate, setOvertimeDate] = useState('');
  const [overtimeHours, setOvertimeHours] = useState(2);
  const [overtimeNotes, setOvertimeNotes] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    specialization: '',
    skills: [] as string[],
    dailyCapacity: 100, // Default capacity
    isActive: true,
  });
  const [skillInput, setSkillInput] = useState('');

  useEffect(() => {
    fetchTailors();
    fetchSchedule();
  }, []);

  const fetchTailors = async () => {
    try {
      const response = await fetch('/api/tailors');
      const result = await response.json();
      if (result.success) {
        setTailors(result.data);
      }
    } catch (error) {
      showToast('Failed to fetch tailors', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSchedule = async () => {
    try {
      const response = await fetch('/api/tailors/schedule?weeksAhead=2');
      const result = await response.json();
      if (result.success) {
        setScheduleData(result.data.schedule);
      }
    } catch (error) {
      console.error('Failed to fetch schedule:', error);
    }
  };

  const handleOpenModal = (tailor?: Tailor) => {
    if (tailor) {
      setEditingTailor(tailor);
      setFormData({
        name: tailor.name,
        phone: tailor.phone,
        address: tailor.address || '',
        specialization: tailor.specialization || '',
        skills: tailor.skills || [],
        dailyCapacity: tailor.dailyCapacity || 100,
        isActive: tailor.isActive,
      });
    } else {
      setEditingTailor(null);
      setFormData({
        name: '',
        phone: '',
        address: '',
        specialization: '',
        skills: [],
        dailyCapacity: 100, // Default capacity
        isActive: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingTailor
        ? `/api/tailors/${editingTailor._id}`
        : '/api/tailors';
      const method = editingTailor ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        showToast(result.message, 'success');
        setIsModalOpen(false);
        fetchTailors();
        fetchSchedule();
      } else {
        showToast(result.error, 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (tailor: Tailor) => {
    if (!confirm(`Are you sure you want to deactivate "${tailor.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/tailors/${tailor._id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        showToast(result.message, 'success');
        fetchTailors();
        fetchSchedule();
      } else {
        showToast(result.error, 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    }
  };

  const handleAddLeave = async () => {
    if (!leaveModal || !leaveDate || !leaveReason) return;
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/tailors/${leaveModal.tailorId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: leaveDate, reason: leaveReason }),
      });

      const result = await response.json();

      if (result.success) {
        showToast('Leave recorded', 'success');
        setLeaveModal(null);
        setLeaveDate('');
        setLeaveReason('');
        fetchTailors();
        fetchSchedule();
      } else {
        showToast(result.error, 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddOvertime = async () => {
    if (!overtimeModal || !overtimeDate || overtimeHours <= 0) return;
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/tailors/${overtimeModal.tailorId}/overtime`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: overtimeDate,
          hours: overtimeHours,
          notes: overtimeNotes || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showToast('Overtime recorded', 'success');
        setOvertimeModal(null);
        setOvertimeDate('');
        setOvertimeHours(2);
        setOvertimeNotes('');
        fetchTailors();
        fetchSchedule();
      } else {
        showToast(result.error, 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData({ ...formData, skills: [...formData.skills, skillInput.trim()] });
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills.filter((s) => s !== skill) });
  };

  const getWorkloadBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge variant="success">Available</Badge>;
      case 'moderate':
        return <Badge variant="warning">Moderate</Badge>;
      case 'overloaded':
        return <Badge variant="danger">Overloaded</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const filteredTailors = tailors.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.phone.includes(searchTerm)
  );

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="animate-fade-in">
      <Header
        title="Tailors"
        subtitle="Manage workforce, capacity, and scheduling"
        actions={
          <Button onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4" />
            Add Tailor
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-surface-200 dark:border-surface-700">
          {[
            { key: 'list', label: 'Tailor List', icon: Users },
            { key: 'schedule', label: 'Capacity & Schedule', icon: Calendar },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-surface-500 hover:text-surface-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* List Tab */}
        {activeTab === 'list' && (
          <>
            {/* Search */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <Input
                  placeholder="Search tailors..."
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
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Skills</TableHead>
                      <TableHead>Daily Capacity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTailors.length === 0 ? (
                      <TableEmpty message="No tailors found" colSpan={6} />
                    ) : (
                      filteredTailors.map((tailor) => (
                        <TableRow key={tailor._id}>
                          <TableCell className="font-medium">{tailor.name}</TableCell>
                          <TableCell>{tailor.phone}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {tailor.skills && tailor.skills.length > 0 ? (
                                tailor.skills.slice(0, 3).map((skill) => (
                                  <Badge key={skill} variant="info">
                                    {skill}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-surface-400">-</span>
                              )}
                              {tailor.skills && tailor.skills.length > 3 && (
                                <Badge variant="neutral">+{tailor.skills.length - 3}</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{formatNumber(tailor.dailyCapacity || 100)} pcs/day</TableCell>
                          <TableCell>
                            <Badge variant={tailor.isActive ? 'success' : 'danger'}>
                              {tailor.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenModal(tailor)}
                                className="p-1.5 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg text-surface-500 hover:text-surface-700"
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() =>
                                  setLeaveModal({ tailorId: tailor._id, name: tailor.name })
                                }
                                className="p-1.5 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg text-surface-500 hover:text-amber-600"
                                title="Add Leave"
                              >
                                <Calendar className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() =>
                                  setOvertimeModal({ tailorId: tailor._id, name: tailor.name })
                                }
                                className="p-1.5 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg text-surface-500 hover:text-blue-600"
                                title="Add Overtime"
                              >
                                <Clock className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(tailor)}
                                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-surface-500 hover:text-red-600"
                                title="Delete"
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
          </>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="py-4 flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                      {scheduleData.filter((s) => s.workloadStatus === 'available').length}
                    </p>
                    <p className="text-sm text-surface-500">Available</p>
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
                      {scheduleData.filter((s) => s.workloadStatus === 'moderate').length}
                    </p>
                    <p className="text-sm text-surface-500">Moderate Load</p>
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
                      {scheduleData.filter((s) => s.workloadStatus === 'overloaded').length}
                    </p>
                    <p className="text-sm text-surface-500">Overloaded</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4 flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                      {formatNumber(scheduleData.reduce((sum, s) => sum + s.availableCapacity, 0))}
                    </p>
                    <p className="text-sm text-surface-500">Total Available Capacity</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Schedule Cards */}
            <Card>
              <CardHeader>
                <CardTitle>Weekly Capacity Overview (Next 2 Weeks)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {scheduleData.map((tailor) => (
                    <div
                      key={tailor._id}
                      className={`p-4 rounded-lg border ${
                        tailor.workloadStatus === 'available'
                          ? 'border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800'
                          : tailor.workloadStatus === 'moderate'
                          ? 'border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800'
                          : 'border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium">{tailor.name}</h4>
                          <p className="text-xs text-surface-500">{tailor.phone}</p>
                        </div>
                        {getWorkloadBadge(tailor.workloadStatus)}
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-surface-500">Daily Capacity</span>
                          <span className="font-medium">{tailor.dailyCapacity} pcs</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-surface-500">Pending Work</span>
                          <span className="font-medium">{formatNumber(tailor.pendingPcs)} pcs</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-surface-500">Available Capacity</span>
                          <span className="font-medium text-green-600">
                            {formatNumber(tailor.availableCapacity)} pcs
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-surface-500">Days to Complete</span>
                          <span className="font-medium">{tailor.daysNeeded} days</span>
                        </div>

                        {/* Utilization Bar */}
                        <div className="pt-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span>Utilization</span>
                            <span>{tailor.utilizationRate}%</span>
                          </div>
                          <div className="h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                tailor.utilizationRate > 90
                                  ? 'bg-red-500'
                                  : tailor.utilizationRate > 60
                                  ? 'bg-amber-500'
                                  : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(100, tailor.utilizationRate)}%` }}
                            />
                          </div>
                        </div>

                        {/* Skills */}
                        {tailor.skills.length > 0 && (
                          <div className="pt-2">
                            <p className="text-xs text-surface-500 mb-1">Skills</p>
                            <div className="flex flex-wrap gap-1">
                              {tailor.skills.map((skill) => (
                                <Badge key={skill} variant="info">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Upcoming Leaves */}
                        {tailor.upcomingLeaves.length > 0 && (
                          <div className="pt-2">
                            <p className="text-xs text-surface-500 mb-1">Upcoming Leaves</p>
                            <div className="space-y-1">
                              {tailor.upcomingLeaves.map((leave, idx) => (
                                <div
                                  key={idx}
                                  className="text-xs p-1.5 bg-surface-100 dark:bg-surface-800 rounded"
                                >
                                  {formatDate(leave.date)} - {leave.reason}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Add/Edit Tailor Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTailor ? 'Edit Tailor' : 'Add New Tailor'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input
            label="Phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
          />

          <Input
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          <Input
            label="Specialization"
            value={formData.specialization}
            onChange={(e) =>
              setFormData({ ...formData, specialization: e.target.value })
            }
            placeholder="e.g., Shirts, Pants, Dresses"
          />

          <Input
            label="Daily Capacity (pcs/day)"
            type="number"
            value={formData.dailyCapacity}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setFormData({ ...formData, dailyCapacity: isNaN(val) ? 1 : Math.max(1, val) });
            }}
            min={1}
            max={1000000}
            helperText="Enter any value from 1 to 1,000,000 pieces per day"
          />

          {/* Skills */}
          <div>
            <label className="label">Skills</label>
            <div className="flex gap-2 mb-2">
              <Input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                placeholder="e.g., Cotton, Silk, Formal"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSkill();
                  }
                }}
              />
              <Button type="button" variant="secondary" onClick={addSkill}>
                Add
              </Button>
            </div>
            {formData.skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.skills.map((skill) => (
                  <Badge
                    key={skill}
                    variant="info"
                    className="cursor-pointer"
                    onClick={() => removeSkill(skill)}
                  >
                    {skill} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) =>
                setFormData({ ...formData, isActive: e.target.checked })
              }
              className="rounded border-surface-300"
            />
            <label htmlFor="isActive" className="text-sm text-surface-700 dark:text-surface-300">
              Active
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {editingTailor ? 'Update Tailor' : 'Create Tailor'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Leave Modal */}
      <Modal
        isOpen={!!leaveModal}
        onClose={() => {
          setLeaveModal(null);
          setLeaveDate('');
          setLeaveReason('');
        }}
        title={`Add Leave - ${leaveModal?.name}`}
      >
        <div className="space-y-4">
          <Input
            label="Date"
            type="date"
            value={leaveDate}
            onChange={(e) => setLeaveDate(e.target.value)}
            required
          />
          <Input
            label="Reason"
            value={leaveReason}
            onChange={(e) => setLeaveReason(e.target.value)}
            placeholder="e.g., Personal, Sick, Festival"
            required
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setLeaveModal(null)}>
              Cancel
            </Button>
            <Button onClick={handleAddLeave} isLoading={isSubmitting} disabled={!leaveDate || !leaveReason}>
              Add Leave
            </Button>
          </div>
        </div>
      </Modal>

      {/* Overtime Modal */}
      <Modal
        isOpen={!!overtimeModal}
        onClose={() => {
          setOvertimeModal(null);
          setOvertimeDate('');
          setOvertimeHours(2);
          setOvertimeNotes('');
        }}
        title={`Add Overtime - ${overtimeModal?.name}`}
      >
        <div className="space-y-4">
          <Input
            label="Date"
            type="date"
            value={overtimeDate}
            onChange={(e) => setOvertimeDate(e.target.value)}
            required
          />
          <Input
            label="Hours"
            type="number"
            value={overtimeHours}
            onChange={(e) => setOvertimeHours(parseFloat(e.target.value) || 0)}
            min={0.5}
            step={0.5}
            required
          />
          <Input
            label="Notes (optional)"
            value={overtimeNotes}
            onChange={(e) => setOvertimeNotes(e.target.value)}
            placeholder="e.g., Rush order, Weekend work"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setOvertimeModal(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddOvertime}
              isLoading={isSubmitting}
              disabled={!overtimeDate || overtimeHours <= 0}
            >
              Add Overtime
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
