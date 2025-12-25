'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
import { Plus, Search, Filter, Eye } from 'lucide-react';
import { ImageUpload } from '@/components/ui/image-upload';

// Types
interface Sample {
    _id: string;
    styleCode: string;
    styleName: string;
    vendorName: string;
    status: string;
    currentVersion: number;
    expectedBy?: string;
    createdAt: string;
    images?: string[];
}

interface Style {
    _id: string;
    code: string;
    name: string;
}

const statusColors: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
    requested: 'warning',
    in_production_sample: 'info',
    sample_submitted: 'info',
    approved: 'success',
    rejected: 'danger',
    changes_requested: 'warning',
    production_in_progress: 'neutral',
    cut_sent_to_vendor: 'info',
    in_house_cut: 'info',
    completed: 'success',
};

const statusLabels: Record<string, string> = {
    requested: 'Requested',
    in_production_sample: 'In Production',
    sample_submitted: 'Submitted',
    approved: 'Approved',
    rejected: 'Rejected',
    changes_requested: 'Changes Requested',
    production_in_progress: 'Production Started',
    cut_sent_to_vendor: 'Cut Sent',
    in_house_cut: 'In-House Cut',
    completed: 'Completed',
};

export default function SamplesPage() {
    const { data: session } = useSession();
    const { showToast } = useToast();
    const router = useRouter();

    const [samples, setSamples] = useState<Sample[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Create Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [styles, setStyles] = useState<Style[]>([]);
    const [creating, setCreating] = useState(false);
    const [formData, setFormData] = useState({
        styleId: '',
        expectedBy: '',
        notes: '',
        attachments: [] as string[],
    });

    useEffect(() => {
        fetchSamples();
        if (session?.user?.role === 'vendor' || session?.user?.role === 'admin') {
            fetchStyles();
        }
    }, [session, statusFilter]);

    const fetchSamples = async () => {
        try {
            setLoading(true);
            let url = '/api/samples';
            if (statusFilter !== 'all') {
                url += `?status=${statusFilter}`;
            }
            const res = await fetch(url);
            const json = await res.json();
            if (json.success) {
                setSamples(json.data);
            } else {
                showToast(json.error || 'Failed to fetch samples', 'error');
            }
        } catch (error) {
            showToast('Error loading samples', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchStyles = async () => {
        try {
            // Only active styles
            const res = await fetch('/api/styles?active=true');
            const json = await res.json();
            if (json.success) {
                setStyles(json.data);
            }
        } catch (error) {
            console.error('Failed to fetch styles');
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.styleId) {
            showToast('Please select a style', 'error');
            return;
        }

        setCreating(true);
        try {
            // Find style details
            const selectedStyle = styles.find(s => s._id === formData.styleId);

            const payload = {
                ...formData,
                styleCode: selectedStyle?.code,
                styleName: selectedStyle?.name,
            };

            const res = await fetch('/api/samples', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const json = await res.json();

            if (json.success) {
                showToast('Sample request created!', 'success');
                setIsModalOpen(false);
                setFormData({
                    styleId: '',
                    expectedBy: '',
                    notes: '',
                    attachments: [],
                });
                fetchSamples();
            } else {
                showToast(json.error, 'error');
            }
        } catch (error) {
            showToast('Failed to create sample request', 'error');
        } finally {
            setCreating(false);
        }
    };

    const addAttachment = (res: any) => {
        // Assuming res.url or res.filePath depending on imagekit response
        // Using res.url for now
        if (res.url) {
            setFormData(prev => ({
                ...prev,
                attachments: [...prev.attachments, res.url]
            }));
        }
    };

    const filteredSamples = samples.filter(s =>
        (s.styleCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.styleName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.vendorName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading && !samples.length) {
        return <PageLoader />;
    }

    const canCreate = session?.user?.role === 'vendor' || session?.user?.role === 'admin';

    return (
        <div className="animate-fade-in">
            <Header
                title="Sample Management"
                subtitle="Track and manage style samples"
                actions={
                    canCreate && (
                        <Button onClick={() => setIsModalOpen(true)}>
                            <Plus className="w-4 h-4" />
                            New Sample Request
                        </Button>
                    )
                }
            />

            <div className="p-6 space-y-6">
                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                        <Input
                            placeholder="Search by style code, name or vendor..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <div className="w-full md:w-64">
                        <Select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            options={[
                                { value: 'all', label: 'All Statuses' },
                                { value: 'requested', label: 'Requested' },
                                { value: 'in_production_sample', label: 'In Production' },
                                { value: 'sample_submitted', label: 'Submitted' },
                                { value: 'approved', label: 'Approved' },
                                { value: 'rejected', label: 'Rejected' },
                                { value: 'changes_requested', label: 'Changes Requested' },
                            ]}
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
                                    <TableHead>Vendor</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Version</TableHead>
                                    <TableHead>Expected By</TableHead>
                                    <TableHead>Created At</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredSamples.length === 0 ? (
                                    <TableEmpty message="No samples found" colSpan={7} />
                                ) : (
                                    filteredSamples.map((sample) => (
                                        <TableRow key={sample._id} className="cursor-pointer hover:bg-surface-50" onClick={() => router.push(`/samples/${sample._id}`)}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium text-surface-900">{sample.styleCode}</p>
                                                    <p className="text-sm text-surface-500">{sample.styleName}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>{sample.vendorName}</TableCell>
                                            <TableCell>
                                                <Badge variant={statusColors[sample.status] || 'neutral'}>
                                                    {statusLabels[sample.status] || sample.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="neutral" className="bg-surface-100 text-surface-700">
                                                    v{sample.currentVersion}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {sample.expectedBy ? new Date(sample.expectedBy).toLocaleDateString() : '-'}
                                            </TableCell>
                                            <TableCell>
                                                {new Date(sample.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/samples/${sample._id}`);
                                                }}>
                                                    <Eye className="w-4 h-4 mr-1" />
                                                    View
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

            {/* Create Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Request New Sample"
                size="lg"
            >
                <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-surface-700 mb-1">Style *</label>
                        <select
                            className="w-full h-10 px-3 rounded-lg border border-surface-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                            value={formData.styleId}
                            onChange={(e) => setFormData({ ...formData, styleId: e.target.value })}
                            required
                        >
                            <option value="">Select a style</option>
                            {styles.map(s => (
                                <option key={s._id} value={s._id}>{s.code} - {s.name}</option>
                            ))}
                        </select>
                    </div>

                    <Input
                        type="date"
                        label="Expected By"
                        value={formData.expectedBy}
                        onChange={(e) => setFormData({ ...formData, expectedBy: e.target.value })}
                    />

                    <div>
                        <label className="block text-sm font-medium text-surface-700 mb-1">Initial Notes / Instructions</label>
                        <textarea
                            className="w-full p-3 rounded-lg border border-surface-200 focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[100px]"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Enter specific instructions for this sample..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-surface-700 mb-2">Reference Images</label>
                        <ImageUpload
                            onSuccess={addAttachment}
                            folder="/samples/references"
                        />
                        {formData.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {formData.attachments.map((url, i) => (
                                    <img key={i} src={url} alt="Attachment" className="w-16 h-16 object-cover rounded border border-surface-200" />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" isLoading={creating}>Submit Request</Button>
                    </div>
                </form>
            </Modal>

        </div>
    );
}
