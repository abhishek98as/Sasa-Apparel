'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { PageLoader } from '@/components/ui/loading';
import { useToast } from '@/components/ui/toast';
import { ImageUpload } from '@/components/ui/image-upload';
import {
    CheckCircle, XCircle, Clock, FileText, Send,
    MessageSquare, History, ChevronRight, Upload,
    AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface User {
    _id: string;
    name: string;
    role: string;
}

interface SampleVersion {
    _id: string;
    versionNumber: number;
    status: string;
    submittedBy: { name: string, role: string };
    attachments: string[];
    notes?: string;
    createdAt: string;
}

interface SampleComment {
    _id: string;
    userName: string;
    userRole: string;
    content: string;
    createdAt: string;
    attachments: string[];
    isInternal: boolean;
}

interface Sample {
    _id: string;
    styleCode: string;
    styleName: string;
    vendorName: string;
    vendorId: string;
    status: string;
    currentVersion: number;
    expectedBy?: string;
    createdAt: string;
    versions?: SampleVersion[];
    comments?: SampleComment[];
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

export default function SampleDetailPage({ params }: { params: { id: string } }) {
    const { data: session } = useSession();
    const router = useRouter();
    const { showToast } = useToast();
    const [sample, setSample] = useState<Sample | null>(null);
    const [loading, setLoading] = useState(true);

    // Actions State
    const [commentText, setCommentText] = useState('');
    const [sendingComment, setSendingComment] = useState(false);

    // Version Upload Modal
    const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
    const [versionNotes, setVersionNotes] = useState('');
    const [versionAttachments, setVersionAttachments] = useState<string[]>([]);
    const [submittingVersion, setSubmittingVersion] = useState(false);

    // Approval/Rejection Modal
    const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
    const [decisionType, setDecisionType] = useState<'approve' | 'reject' | 'changes' | null>(null);
    const [decisionNote, setDecisionNote] = useState('');
    const [submittingDecision, setSubmittingDecision] = useState(false);

    useEffect(() => {
        fetchSample();
    }, [params.id]);

    const fetchSample = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/samples/${params.id}`);
            const json = await res.json();
            if (json.success) {
                setSample(json.data);
            } else {
                showToast(json.error, 'error');
                router.push('/samples');
            }
        } catch (error) {
            showToast('Failed to load sample', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleComment = async () => {
        if (!commentText.trim()) return;
        setSendingComment(true);
        try {
            const res = await fetch(`/api/samples/${params.id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: commentText }),
            });
            const json = await res.json();
            if (json.success) {
                setCommentText('');
                fetchSample(); // Refresh to see comment
            } else {
                showToast(json.error, 'error');
            }
        } catch (error) {
            showToast('Failed to post comment', 'error');
        } finally {
            setSendingComment(false);
        }
    };

    const handleSubmitVersion = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmittingVersion(true);
        try {
            const res = await fetch(`/api/samples/${params.id}/versions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    notes: versionNotes,
                    attachments: versionAttachments
                }),
            });
            const json = await res.json();
            if (json.success) {
                showToast('New version submitted!', 'success');
                setIsVersionModalOpen(false);
                setVersionNotes('');
                setVersionAttachments([]);
                fetchSample();
            } else {
                showToast(json.error, 'error');
            }
        } catch (error) {
            showToast('Failed to submit version', 'error');
        } finally {
            setSubmittingVersion(false);
        }
    };

    const handleDecision = async () => {
        if (!decisionType) return;
        setSubmittingDecision(true);
        let status = '';
        if (decisionType === 'approve') status = 'approved';
        if (decisionType === 'reject') status = 'rejected';
        if (decisionType === 'changes') status = 'changes_requested';

        try {
            // First update status
            const res = await fetch(`/api/samples/${params.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, notes: decisionNote }),
            });

            // Also add a comment if note exists
            if (decisionNote.trim()) {
                await fetch(`/api/samples/${params.id}/comments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: `[${statusLabels[status]}] ${decisionNote}` }),
                });
            }

            const json = await res.json();
            if (json.success) {
                showToast(`Sample ${statusLabels[status]}`, 'success');
                setIsDecisionModalOpen(false);
                setDecisionNote('');
                fetchSample();
            } else {
                showToast(json.error, 'error');
            }
        } catch (error) {
            showToast('Failed to update status', 'error');
        } finally {
            setSubmittingDecision(false);
        }
    };

    if (loading || !sample) return <PageLoader />;

    const isVendor = session?.user?.role === 'vendor';
    const isManufacturer = session?.user?.role === 'admin' || session?.user?.role === 'manager'; // Manufacturer roles
    const currentVersion = sample.versions && sample.versions.length > 0 ? sample.versions[0] : null; // Assuming sorted descending from API

    return (
        <div className="animate-fade-in pb-10">
            <Header
                title={`Sample: ${sample.styleCode}`}
                subtitle={`Version ${sample.currentVersion} • ${sample.styleName}`}
                actions={
                    <div className="flex gap-2">
                        {isManufacturer && (sample.status === 'requested' || sample.status === 'changes_requested') && (
                            <Button onClick={() => setIsVersionModalOpen(true)}>
                                <Upload className="w-4 h-4 mr-2" />
                                Submit Sample
                            </Button>
                        )}
                        {isVendor && sample.status === 'sample_submitted' && (
                            <>
                                <Button variant="danger" onClick={() => { setDecisionType('reject'); setIsDecisionModalOpen(true); }}>
                                    Reject
                                </Button>
                                <Button variant="secondary" onClick={() => { setDecisionType('changes'); setIsDecisionModalOpen(true); }}>
                                    Request Changes
                                </Button>
                                <Button variant="success" onClick={() => { setDecisionType('approve'); setIsDecisionModalOpen(true); }}>
                                    Approve
                                </Button>
                            </>
                        )}
                    </div>
                }
            />

            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Status Banner */}
                    <Card className="border-l-4 border-l-primary-500">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-surface-500 font-medium uppercase tracking-wide">Current Status</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant={statusColors[sample.status] || 'neutral'} className="text-lg px-3 py-1">
                                        {statusLabels[sample.status]}
                                    </Badge>
                                    <span className="text-sm text-surface-500">
                                        Updated {new Date(sample.versions?.[0]?.createdAt || sample.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                            {/* Visual Status Indicator Icon */}
                            {sample.status === 'approved' && <CheckCircle className="w-10 h-10 text-green-500" />}
                            {sample.status === 'rejected' && <XCircle className="w-10 h-10 text-red-500" />}
                            {sample.status === 'requested' && <AlertCircle className="w-10 h-10 text-amber-500" />}
                        </CardContent>
                    </Card>

                    {/* Latest Version Details */}
                    {currentVersion && (
                        <Card>
                            <div className="p-4 border-b border-surface-200 flex justify-between items-center bg-surface-50">
                                <h3 className="font-semibold text-surface-800 flex items-center gap-2">
                                    <History className="w-4 h-4" /> Latest Version (v{currentVersion.versionNumber})
                                </h3>
                                <span className="text-xs text-surface-500">Submitted by {currentVersion.submittedBy.name}</span>
                            </div>
                            <CardContent className="p-6">
                                {currentVersion.notes && (
                                    <div className="mb-6 bg-surface-50 p-4 rounded-lg border border-surface-100">
                                        <p className="text-surface-700 text-sm whitespace-pre-wrap">{currentVersion.notes}</p>
                                    </div>
                                )}

                                <h4 className="text-sm font-medium text-surface-700 mb-3">Attachments & Images</h4>
                                {currentVersion.attachments.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {currentVersion.attachments.map((url, i) => (
                                            <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-surface-200 group">
                                                <img src={url} alt={`Version ${currentVersion.versionNumber} Image ${i}`} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                    <a href={url} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 bg-white/90 p-2 rounded-full text-sm font-medium shadow-sm">View</a>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-surface-400 italic">No attachments for this version.</p>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Comments Section */}
                    <Card>
                        <div className="p-4 border-b border-surface-200">
                            <h3 className="font-semibold text-surface-800 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4" /> Comments & Activity
                            </h3>
                        </div>
                        <CardContent className="p-0">
                            <div className="max-h-[500px] overflow-y-auto p-4 space-y-4">
                                {(!sample.comments || sample.comments.length === 0) ? (
                                    <div className="text-center py-8 text-surface-400 text-sm">No comments yet. Start the discussion!</div>
                                ) : (
                                    sample.comments.map((comment) => (
                                        <div key={comment._id} className={cn("flex gap-3", comment.userRole === session?.user?.role ? "flex-row-reverse" : "")}>
                                            <div className="w-8 h-8 rounded-full bg-surface-200 flex items-center justify-center shrink-0 text-xs font-bold text-surface-600">
                                                {comment.userName.charAt(0)}
                                            </div>
                                            <div className={cn(
                                                "max-w-[80%] p-3 rounded-lg text-sm",
                                                comment.userRole === session?.user?.role
                                                    ? "bg-primary-50 text-surface-900 rounded-tr-none"
                                                    : "bg-surface-100 text-surface-900 rounded-tl-none"
                                            )}>
                                                <div className="flex justify-between items-center gap-4 mb-1">
                                                    <span className="font-semibold text-xs">{comment.userName}</span>
                                                    <span className="text-xs text-surface-400">{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <p className="whitespace-pre-wrap">{comment.content}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Comment Input */}
                            <div className="p-4 border-t border-surface-200 bg-surface-50">
                                <div className="flex gap-2">
                                    <input
                                        className="flex-1 px-4 py-2 text-sm rounded-lg border border-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="Type a comment..."
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleComment()}
                                    />
                                    <Button onClick={handleComment} disabled={sendingComment || !commentText.trim()} size="sm">
                                        <Send className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <Card>
                        <CardContent className="p-4 space-y-4">
                            <div>
                                <h4 className="text-xs font-semibold text-surface-500 uppercase">Vendor</h4>
                                <p className="font-medium text-surface-900">{sample.vendorName}</p>
                            </div>
                            <div>
                                <h4 className="text-xs font-semibold text-surface-500 uppercase">Expected By</h4>
                                <p className="font-medium text-surface-900 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-surface-400" />
                                    {sample.expectedBy ? new Date(sample.expectedBy).toLocaleDateString() : 'No Date Set'}
                                </p>
                            </div>
                            <div>
                                <h4 className="text-xs font-semibold text-surface-500 uppercase">Style</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="neutral">{sample.styleCode}</Badge>
                                    <span className="text-sm">{sample.styleName}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Version History List */}
                    <Card>
                        <div className="p-3 border-b border-surface-200">
                            <h4 className="font-semibold text-xs text-surface-500 uppercase">Version History</h4>
                        </div>
                        <div className="divide-y divide-surface-100">
                            {(sample.versions || []).map((ver) => (
                                <div key={ver._id} className="p-3 hover:bg-surface-50 transition-colors flex justify-between items-center group cursor-pointer">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm">Version {ver.versionNumber}</span>
                                            {ver.versionNumber === sample.currentVersion && <Badge variant="neutral" className="text-[10px] px-1 py-0 h-4">Latest</Badge>}
                                        </div>
                                        <span className="text-xs text-surface-500">{new Date(ver.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <Badge variant="neutral" className="text-[10px]">{statusLabels[ver.status]}</Badge>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

            </div>

            {/* Version Modal */}
            <Modal isOpen={isVersionModalOpen} onClose={() => setIsVersionModalOpen(false)} title="Submit New Sample Version">
                <form onSubmit={handleSubmitVersion} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-surface-700 mb-2">Upload Photos/Attachments *</label>
                        <ImageUpload onSuccess={(res) => { if (res.url) setVersionAttachments(prev => [...prev, res.url]) }} folder="/samples/versions" />
                        <div className="flex flex-wrap gap-2 mt-2">
                            {versionAttachments.map((url, i) => (
                                <img key={i} src={url} className="w-16 h-16 object-cover rounded border" />
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-surface-700 mb-1">Notes *</label>
                        <textarea
                            className="w-full p-3 border rounded-lg min-h-[100px]"
                            value={versionNotes}
                            onChange={(e) => setVersionNotes(e.target.value)}
                            placeholder="Describe changes or details about this sample version..."
                            required
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="secondary" onClick={() => setIsVersionModalOpen(false)}>Cancel</Button>
                        <Button type="submit" isLoading={submittingVersion} disabled={versionAttachments.length === 0}>Submit</Button>
                    </div>
                </form>
            </Modal>

            {/* Decision Modal */}
            <Modal isOpen={isDecisionModalOpen} onClose={() => setIsDecisionModalOpen(false)} title={`Confirm ${decisionType === 'changes' ? 'Changes Request' : decisionType}`}>
                <div className="space-y-4">
                    <p className="text-sm text-surface-600">
                        You are about to <strong>{decisionType === 'changes' ? 'request changes for' : decisionType}</strong> this sample.
                    </p>
                    <div>
                        <label className="block text-sm font-medium text-surface-700 mb-1">Comments (Optional)</label>
                        <textarea
                            className="w-full p-3 border rounded-lg min-h-[80px]"
                            value={decisionNote}
                            onChange={(e) => setDecisionNote(e.target.value)}
                            placeholder="Add a reason or comment..."
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="secondary" onClick={() => setIsDecisionModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleDecision} isLoading={submittingDecision} variant={decisionType === 'reject' ? 'danger' : decisionType === 'changes' ? 'secondary' : 'success'}>
                            Confirm
                        </Button>
                    </div>
                </div>
            </Modal>

        </div>
    );
}
