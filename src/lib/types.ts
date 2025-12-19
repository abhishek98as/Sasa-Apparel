import { ObjectId } from 'mongodb';

// User Roles
export type UserRole = 'admin' | 'manager' | 'vendor' | 'tailor';

// Base interface for MongoDB documents
export interface BaseDocument {
  _id?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Manager Permissions - defines which menu items a manager can access
export interface ManagerPermissions {
  dashboard?: boolean;
  vendors?: boolean;
  tailors?: boolean;
  styles?: boolean;
  fabricCutting?: boolean;
  tailorJobs?: boolean;
  shipments?: boolean;
  rates?: boolean;
  users?: boolean;
  inventory?: boolean;
  qc?: boolean;
  payments?: boolean;
  approvals?: boolean;
}

// User
export interface User extends BaseDocument {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  vendorId?: ObjectId; // Only for vendor role
  tailorId?: ObjectId; // Only for tailor role
  permissions?: ManagerPermissions; // Only for manager role
  isActive: boolean;
  lastLogin?: Date;
}

// Vendor
export interface Vendor extends BaseDocument {
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address: string;
  gstNumber?: string;
  isActive: boolean;
}

// Style
export interface Style extends BaseDocument {
  code: string;
  name: string;
  vendorId: ObjectId;
  fabricType: string;
  description?: string;
  images?: string[];
  isActive: boolean;
}

// Fabric & Cutting Record
export interface FabricCutting extends BaseDocument {
  styleId: ObjectId;
  vendorId: ObjectId;
  fabricReceivedMeters: number;
  cuttingReceivedPcs: number;
  cuttingInHouse: boolean; // true if we cut in-house, false if pre-cut from vendor
  date: Date;
  notes?: string;
}

// Tailor
export interface TailorLeave {
  date: Date;
  reason: string;
  approved?: boolean;
}

export interface TailorOvertime {
  date: Date;
  hours: number;
  notes?: string;
}

export interface Tailor extends BaseDocument {
  name: string;
  phone: string;
  address?: string;
  specialization?: string;
  skills?: string[]; // Style types they excel at
  dailyCapacity?: number; // Max pieces per day
  leaves?: TailorLeave[];
  overtime?: TailorOvertime[];
  isActive: boolean;
}

// Tailor Job
export type JobStatus = 'pending' | 'in-progress' | 'completed' | 'returned';
export type QCStatus = 'pending' | 'passed' | 'failed' | 'rework';

export interface TailorJob extends BaseDocument {
  styleId: ObjectId;
  tailorId: ObjectId;
  fabricCuttingId: ObjectId;
  issuedPcs: number;
  rate: number; // ₹ per piece
  issueDate: Date;
  status: JobStatus;
  returnedPcs: number;
  qcStatus: QCStatus;
  qcNotes?: string;
  receivedDate?: Date;
  completedDate?: Date;
}

// Shipment
export interface Shipment extends BaseDocument {
  vendorId: ObjectId;
  styleId: ObjectId;
  pcsShipped: number;
  date: Date;
  challanNo: string;
  notes?: string;
}

// Rate (Vendor rate per style)
export interface Rate extends BaseDocument {
  styleId: ObjectId;
  vendorId: ObjectId;
  vendorRate: number; // ₹ per piece from vendor
  effectiveDate: Date;
}

// Audit Event
export type EventAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'approve' | 'reject';
export type EntityType =
  | 'user'
  | 'vendor'
  | 'style'
  | 'fabricCutting'
  | 'tailorJob'
  | 'shipment'
  | 'rate'
  | 'inventoryItem'
  | 'inventoryMovement'
  | 'reorderSuggestion'
  | 'qcChecklist'
  | 'qcInspection'
  | 'tailorPayment'
  | 'approval';

export interface AuditEvent extends BaseDocument {
  entityType: EntityType;
  entityId: ObjectId;
  action: EventAction;
  actorId: ObjectId;
  actorName: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  metadata?: Record<string, unknown>;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Dashboard metrics
export interface AdminDashboardMetrics {
  totalCuttingReceivedToday: number;
  totalCuttingReceivedMonth: number;
  cuttingInProduction: number;
  pcsCompleted: number;
  pcsShipped: number;
  expectedReceivable: number;
  totalTailoringExpense: number;
  pendingFromTailors: number;
}

export interface VendorDashboardMetrics {
  totalPcsReceived: number;
  totalPcsShipped: number;
  pendingPcs: number;
  styles: {
    styleId: string;
    styleName: string;
    pcsReceived: number;
    pcsShipped: number;
    pending: number;
  }[];
}

export interface TailorDashboardMetrics {
  assignedJobs: number;
  pendingPcs: number;
  completedPcs: number;
  totalEarnings: number;
}

// Tailor capacity for auto-suggest
export interface TailorCapacity {
  tailorId: ObjectId;
  tailorName: string;
  totalIssued: number;
  totalReturned: number;
  pendingPcs: number;
  availableCapacity: number; // Higher is better for assignment
}

// Inventory
export type InventoryUnit = 'kg' | 'piece' | 'meter';
export type InventoryItemType = 'raw' | 'accessory';

export interface InventoryItem extends BaseDocument {
  name: string;
  sku: string;
  type: InventoryItemType;
  unit: InventoryUnit;
  costPerUnit: number;
  minStock: number;
  currentStock: number;
  vendorId?: ObjectId;
  category?: string;
  tags?: string[];
  isActive: boolean;
}

export type InventoryMovementType = 'in' | 'out' | 'waste' | 'adjust';

export interface InventoryMovement extends BaseDocument {
  itemId: ObjectId;
  type: InventoryMovementType;
  quantity: number;
  unitCost?: number;
  reference?: string;
  notes?: string;
  relatedEntity?: {
    type: EntityType;
    id: ObjectId;
  };
  createdBy: {
    userId: ObjectId;
    name: string;
    role: UserRole;
  };
}

export type ReorderStatus = 'open' | 'acknowledged' | 'ordered' | 'closed';

export interface ReorderSuggestion extends BaseDocument {
  itemId: ObjectId;
  suggestedQty: number;
  status: ReorderStatus;
  generatedReason: string;
  approvedBy?: ObjectId;
  acknowledgedBy?: ObjectId;
}

// QC
export type DefectCategory = 'stitching' | 'fabric' | 'measurement' | 'other';

export interface QCChecklistItem {
  label: string;
  category: DefectCategory;
  isCritical?: boolean;
}

export interface QCChecklist extends BaseDocument {
  styleId: ObjectId;
  items: QCChecklistItem[];
  version: number;
  isActive: boolean;
}

export interface QCDefect {
  category: DefectCategory;
  description: string;
  severity?: 'low' | 'medium' | 'high';
}

export interface QCInspection extends BaseDocument {
  styleId: ObjectId;
  jobId?: ObjectId;
  checklistId?: ObjectId;
  status: QCStatus;
  defects?: QCDefect[];
  photos?: string[];
  rejectionReason?: string;
  reworkAssignedTo?: ObjectId;
  inspectedBy: {
    userId: ObjectId;
    name: string;
  };
}

// Tailor payments
export type PaymentEntryType = 'earning' | 'advance' | 'deduction' | 'payout';

export interface TailorPayment extends BaseDocument {
  tailorId: ObjectId;
  jobId?: ObjectId;
  amount: number;
  entryType: PaymentEntryType;
  description?: string;
  balanceAfter?: number;
  reference?: string;
  createdBy: {
    userId: ObjectId;
    name: string;
  };
}

// Approvals
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ApprovalRequest extends BaseDocument {
  entityType: EntityType;
  entityId: ObjectId;
  action: EventAction;
  payload: Record<string, unknown>;
  requestedBy: {
    userId: ObjectId;
    name: string;
    role: UserRole;
  };
  status: ApprovalStatus;
  decisionBy?: ObjectId;
  decisionRemarks?: string;
}

