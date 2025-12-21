'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { PageLoader } from '@/components/ui/loading';
import { useToast } from '@/components/ui/toast';
import { formatNumber, formatDate, formatCurrency } from '@/lib/utils';
import { Plus, Users, Package, AlertCircle } from 'lucide-react';

interface Style {
  _id: string;
  code: string;
  name: string;
}

interface FabricCutting {
  _id: string;
  styleId: string;
  style?: Style;
  vendorId: string;
  cuttingReceivedPcs: number;
  date: string;
  sizeBreakdown?: { size: string; quantity: number }[];
}

interface TailorCapacity {
  tailorId: string;
  tailorName: string;
  phone: string;
  specialization?: string;
  pendingPcs: number;
  totalIssued: number;
  totalReturned: number;
}

interface Assignment {
  tailorId: string;
  tailorName: string;
  pcs: number;
  rate: number;
  sizeBreakdown?: { size: string; quantity: number }[];
}

export default function DistributionPage() {
  const { showToast } = useToast();
  const [cuttingRecords, setCuttingRecords] = useState<FabricCutting[]>([]);
  const [tailorCapacities, setTailorCapacities] = useState<TailorCapacity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCutting, setSelectedCutting] = useState<FabricCutting | null>(null);
  const [availablePcs, setAvailablePcs] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Assignment form
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [defaultRate, setDefaultRate] = useState(80);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [cuttingRes, capacityRes] = await Promise.all([
        fetch('/api/fabric-cutting'),
        fetch('/api/tailor-jobs/capacity'),
      ]);
      const [cuttingData, capacityData] = await Promise.all([
        cuttingRes.json(),
        capacityRes.json(),
      ]);

      if (cuttingData.success) setCuttingRecords(cuttingData.data);
      if (capacityData.success) setTailorCapacities(capacityData.data);
    } catch (error) {
      showToast('Failed to fetch data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCutting = async (cutting: FabricCutting) => {
    setSelectedCutting(cutting);
    setAssignments([]);

    try {
      const response = await fetch(`/api/fabric-cutting/${cutting._id}/available`);
      const result = await response.json();
      if (result.success) {
        setAvailablePcs(result.data.available);
      }
    } catch (error) {
      showToast('Failed to fetch available pieces', 'error');
    }

    setIsModalOpen(true);
  };

  const handleAddAssignment = (tailor: TailorCapacity) => {
    // Check if already added
    if (assignments.find((a) => a.tailorId === tailor.tailorId)) {
      showToast('Tailor already added', 'warning');
      return;
    }

    setAssignments([
      ...assignments,
      {
        tailorId: tailor.tailorId,
        tailorName: tailor.tailorName,
        pcs: 0,
        rate: defaultRate,
        sizeBreakdown: selectedCutting?.sizeBreakdown?.map(s => ({ size: s.size, quantity: 0 })),
      },
    ]);
  };

  const handleUpdateAssignment = (
    index: number,
    field: 'pcs' | 'rate',
    value: number
  ) => {
    const updated = [...assignments];
    // @ts-ignore
    updated[index][field] = value;
    setAssignments(updated);
  };

  const handleSizeChange = (
    assignmentIndex: number,
    sizeIndex: number,
    value: number
  ) => {
    const updated = [...assignments];
    if (updated[assignmentIndex].sizeBreakdown) {
      updated[assignmentIndex].sizeBreakdown![sizeIndex].quantity = value;
      // Recalculate total pcs
      updated[assignmentIndex].pcs = updated[assignmentIndex].sizeBreakdown!.reduce(
        (sum, s) => sum + s.quantity,
        0
      );
    }
    setAssignments(updated);
  };

  const handleRemoveAssignment = (index: number) => {
    setAssignments(assignments.filter((_, i) => i !== index));
  };

  const totalAssigned = assignments.reduce((sum, a) => sum + a.pcs, 0);
  const totalCost = assignments.reduce((sum, a) => sum + a.pcs * a.rate, 0);

  const handleDistribute = async () => {
    if (totalAssigned === 0) {
      showToast('Please assign pieces to at least one tailor', 'error');
      return;
    }

    if (totalAssigned > availablePcs) {
      showToast(`Cannot assign more than available (${availablePcs})`, 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create jobs for each assignment
      for (const assignment of assignments) {
        if (assignment.pcs > 0) {
          const response = await fetch('/api/tailor-jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              styleId: selectedCutting!.styleId,
              tailorId: assignment.tailorId,
              fabricCuttingId: selectedCutting!._id,
              issuedPcs: assignment.pcs,
              rate: assignment.rate,
              sizeBreakdown: assignment.sizeBreakdown,
            }),
          });

          const result = await response.json();
          if (!result.success) {
            throw new Error(result.error);
          }
        }
      }

      showToast('Work distributed successfully!', 'success');
      setIsModalOpen(false);
      setSelectedCutting(null);
      setAssignments([]);
      fetchData();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Distribution failed',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-suggest distribution
  const handleAutoSuggest = () => {
    if (availablePcs === 0) return;

    const activeTailors = tailorCapacities.slice(0, 4); // Top 4 tailors by capacity
    const pcsPerTailor = Math.floor(availablePcs / activeTailors.length);
    const remainder = availablePcs % activeTailors.length;

    const suggested = activeTailors.map((tailor, index) => ({
      tailorId: tailor.tailorId,
      tailorName: tailor.tailorName,
      pcs: pcsPerTailor + (index < remainder ? 1 : 0),
      rate: defaultRate,
      sizeBreakdown: selectedCutting?.sizeBreakdown?.map(s => ({
        size: s.size,
        quantity: Math.floor(pcsPerTailor / (selectedCutting.sizeBreakdown?.length || 1)) // Rough distribution
      })),
    }));

    setAssignments(suggested);
  };

  if (isLoading) {
    return <PageLoader />;
  }

  // Filter cutting records that have available pieces
  const recordsWithAvailable = cuttingRecords.filter((r) => r.cuttingReceivedPcs > 0);

  return (
    <div className="animate-fade-in">
      <Header
        title="Cutting Distribution"
        subtitle="Distribute cutting to tailors for production"
      />

      <div className="p-6 space-y-6">
        {/* Tailor Capacity Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Tailor Workload Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {tailorCapacities.map((tailor) => (
                <div
                  key={tailor.tailorId}
                  className="p-4 bg-surface-50 rounded-lg"
                >
                  <p className="font-medium text-sm truncate">{tailor.tailorName}</p>
                  <p className="text-2xl font-bold mt-1">{tailor.pendingPcs}</p>
                  <p className="text-xs text-surface-500">Pending pcs</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cutting Records */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Select Cutting to Distribute
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recordsWithAvailable.length === 0 ? (
                <div className="col-span-full py-8 text-center text-surface-500">
                  No cutting records available for distribution
                </div>
              ) : (
                recordsWithAvailable.map((record) => (
                  <div
                    key={record._id}
                    className="p-4 border border-surface-200 rounded-lg hover:border-primary-300 hover:bg-primary-50/50 cursor-pointer transition-colors"
                    onClick={() => handleSelectCutting(record)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{record.style?.name}</p>
                        <p className="text-sm text-surface-500">
                          {record.style?.code}
                        </p>
                      </div>
                      <Badge variant="info">
                        {formatNumber(record.cuttingReceivedPcs)} pcs
                      </Badge>
                    </div>
                    <p className="text-sm text-surface-500 mt-2">
                      Received: {formatDate(record.date)}
                    </p>
                    <Button size="sm" className="mt-3 w-full">
                      <Plus className="w-4 h-4" />
                      Distribute
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setAssignments([]);
        }}
        title={`Distribute: ${selectedCutting?.style?.name}`}
        size="xl"
      >
        <div className="space-y-6">
          {/* Info */}
          <div className="flex items-center gap-4 p-4 bg-surface-50 rounded-lg">
            <div>
              <p className="text-sm text-surface-500">Available for Distribution</p>
              <p className="text-2xl font-bold">{formatNumber(availablePcs)} pcs</p>
            </div>
            <div className="ml-auto">
              <Input
                label="Default Rate (₹/pc)"
                type="number"
                value={defaultRate}
                onChange={(e) => setDefaultRate(parseInt(e.target.value) || 0)}
                className="w-32"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Tailor Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Select Tailors</h4>
                <Button size="sm" variant="secondary" onClick={handleAutoSuggest}>
                  Auto-Suggest
                </Button>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {tailorCapacities.map((tailor) => (
                  <div
                    key={tailor.tailorId}
                    className="flex items-center justify-between p-3 border border-surface-200 rounded-lg hover:bg-surface-50 cursor-pointer"
                    onClick={() => handleAddAssignment(tailor)}
                  >
                    <div>
                      <p className="font-medium text-sm">{tailor.tailorName}</p>
                      <p className="text-xs text-surface-500">
                        Pending: {tailor.pendingPcs} pcs
                        {tailor.specialization && ` • ${tailor.specialization}`}
                      </p>
                    </div>
                    <Plus className="w-4 h-4 text-surface-400" />
                  </div>
                ))}
              </div>
            </div>

            {/* Assignments */}
            <div>
              <h4 className="font-medium mb-3">Assignments</h4>
              {assignments.length === 0 ? (
                <div className="py-8 text-center text-surface-500 border border-dashed border-surface-300 rounded-lg">
                  Click on tailors to add assignments
                </div>
              ) : (
                <div className="space-y-3">
                  {assignments.map((assignment, index) => (
                    <div
                      key={assignment.tailorId}
                      className="p-3 border border-surface-200 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-sm">
                          {assignment.tailorName}
                        </p>
                        <button
                          onClick={() => handleRemoveAssignment(index)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          label="Pieces"
                          type="number"
                          min="0"
                          max={availablePcs}
                          value={assignment.pcs}
                          disabled={!!assignment.sizeBreakdown}
                          onChange={(e) =>
                            handleUpdateAssignment(
                              index,
                              'pcs',
                              parseInt(e.target.value) || 0
                            )
                          }
                        />
                        <Input
                          label="Rate (₹)"
                          type="number"
                          min="0"
                          value={assignment.rate}
                          onChange={(e) =>
                            handleUpdateAssignment(
                              index,
                              'rate',
                              parseInt(e.target.value) || 0
                            )
                          }
                        />
                      </div>

                      {/* Size Breakdown Inputs */}
                      {selectedCutting?.sizeBreakdown && assignment.sizeBreakdown && (
                        <div className="mt-2 p-2 bg-surface-50 rounded border border-surface-200">
                          <p className="text-xs font-medium text-surface-500 mb-2">Size Breakdown</p>
                          <div className="grid grid-cols-4 gap-2">
                            {assignment.sizeBreakdown.map((size, sIndex) => (
                              <div key={size.size}>
                                <label className="text-[10px] uppercase text-surface-500">{size.size}</label>
                                <Input
                                  type="number"
                                  min="0"
                                  className="h-8 text-sm"
                                  value={size.quantity}
                                  onChange={(e) => handleSizeChange(index, sIndex, parseInt(e.target.value) || 0)}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          {assignments.length > 0 && (
            <div className="p-4 bg-surface-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-surface-500">Total Assigned</p>
                  <p className="text-xl font-bold">
                    {formatNumber(totalAssigned)} / {formatNumber(availablePcs)} pcs
                  </p>
                </div>
                <div>
                  <p className="text-sm text-surface-500">Estimated Cost</p>
                  <p className="text-xl font-bold">{formatCurrency(totalCost)}</p>
                </div>
              </div>
              {totalAssigned > availablePcs && (
                <div className="flex items-center gap-2 mt-3 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">
                    Cannot assign more than available pieces
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                setAssignments([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDistribute}
              isLoading={isSubmitting}
              disabled={totalAssigned === 0 || totalAssigned > availablePcs}
            >
              Distribute Work
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

