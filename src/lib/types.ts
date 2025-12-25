import { ObjectId } from 'mongodb';

// User Roles
export type UserRole = 'admin' | 'manager' | 'vendor' | 'tailor';

// Base interface for MongoDB documents
export interface BaseDocument {
  _id?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Size Breakdown Interface - Enhanced with tracking
export interface SizeBreakdown {
  size: string;
  quantity: number;
  completedQty?: number;    // Track completed pieces per size
  shippedQty?: number;      // Track shipped pieces per size
  pendingQty?: number;      // Track pending pieces per size
}

// Payment Status
export type PaymentStatus = 'pending' | 'partial' | 'paid';

// Order Size Entry - for granular size tracking
export interface OrderSize extends BaseDocument {
  orderId?: ObjectId;
  styleId: ObjectId;
  fabricCuttingId?: ObjectId;
  sizeLabel: string;        // S, M, L, XL, or numeric sizes
  qty: number;              // Total quantity for this size
  completedQty: number;     // Pieces with status = 'completed'
  shippedQty: number;       // Pieces shipped
  pendingQty: number;       // Remaining pieces
  assignedToTailors?: TailorSizeAssignment[];
}

// Tailor Size Assignment - for distribution tracking
export interface TailorSizeAssignment {
  tailorId: ObjectId;
  tailorName: string;
  qty: number;
  assignedDate: Date;
  completedQty: number;
  status: JobStatus;
}

// Distribution Assignment Request
export interface DistributionAssignment {
  tailorId: string;
  sizeLabel: string;
  qty: number;
}

// Enhanced Rate with decimal support
export interface DecimalRate {
  value: number;          // Stored with full precision
  formatted: string;      // Formatted display value (e.g., "11.50")
  currency: string;       // Default: "INR"
}

// CRUD Permission for each module
export interface CRUDPermission {
  create?: boolean;
  read?: boolean;
  update?: boolean;
  delete?: boolean;
}

// Enhanced Action-based Permissions
export type PermissionAction = 
  | 'order:create' 
  | 'order:read' 
  | 'order:update' 
  | 'order:delete'
  | 'order:distribute'
  | 'assign:tailor'
  | 'payment:vendor'
  | 'payment:tailor'
  | 'approve:order'
  | 'approve:sample'
  | 'approve:payment'
  | 'style:create'
  | 'style:read'
  | 'style:update'
  | 'cutting:create'
  | 'cutting:read'
  | 'cutting:update'
  | 'shipment:create'
  | 'shipment:read'
  | 'qc:inspect'
  | 'qc:approve'
  | 'report:view'
  | 'report:export'
  | 'user:manage'
  | 'settings:manage';

// Manager Permissions - defines what a manager can access and do
export interface ManagerPermissions {
  // Each module can have granular CRUD permissions
  dashboard?: CRUDPermission;
  vendors?: CRUDPermission;
  tailors?: CRUDPermission;
  styles?: CRUDPermission;
  fabricCutting?: CRUDPermission;
  distribution?: CRUDPermission;
  production?: CRUDPermission;
  shipments?: CRUDPermission;
  rates?: CRUDPermission;
  inventory?: CRUDPermission;
  qc?: CRUDPermission;
  payments?: CRUDPermission;
  approvals?: CRUDPermission;
  reports?: CRUDPermission;
  users?: CRUDPermission;
  // Action-based permissions
  actions?: PermissionAction[];
}

// Helper type to check if module has any access
export type ModuleKey = Exclude<keyof ManagerPermissions, 'actions'>;

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
  // Session tracking
  sessionRole?: UserRole; // Currently selected role for multi-role users
  lastSessionRefresh?: Date;
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

// Style - Enhanced with fabric/cutting linking
export interface Style extends BaseDocument {
  code: string;
  name: string;
  vendorId: ObjectId;
  fabricType: string;
  description?: string;
  images?: string[];
  availableSizes?: string[]; // Defined sizes for this style
  isActive: boolean;
  // New: Linked resources for cutting record creation
  linkedFabricTypes?: string[];
  cuttingTemplateId?: ObjectId;
  defaultSizeBreakdown?: SizeBreakdown[];
}

// Fabric & Cutting Record - Enhanced
export interface FabricCutting extends BaseDocument {
  styleId: ObjectId;
  vendorId: ObjectId;
  fabricReceivedMeters: number;
  cuttingReceivedPcs: number;
  cuttingInHouse: boolean; // true if we cut in-house, false if pre-cut from vendor
  date: Date;
  sizeBreakdown?: SizeBreakdown[];
  notes?: string;
  // Enhanced tracking
  availablePcs?: number;        // Remaining pieces not yet distributed
  distributedPcs?: number;      // Pieces distributed to tailors
  completedPcs?: number;        // Pieces completed (status = 'completed' only)
  shippedPcs?: number;          // Pieces shipped
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
export type JobStatus = 'pending' | 'in-progress' | 'completed' | 'returned' | 'ready-to-ship' | 'shipped';
export type QCStatus = 'pending' | 'passed' | 'failed' | 'rework' | 'rejected';

export interface TailorJob extends BaseDocument {
  styleId: ObjectId;
  tailorId: ObjectId;
  fabricCuttingId: ObjectId;
  issuedPcs: number;
  rate: number; // ₹ per piece - stored as decimal
  issueDate: Date;
  status: JobStatus;
  returnedPcs: number;
  rejectedPcs?: number; // QC Rejected pieces
  rejectionReason?: string;
  qcStatus: QCStatus;
  qcNotes?: string;
  sizeBreakdown?: SizeBreakdown[];
  receivedDate?: Date;
  completedDate?: Date;
  // Enhanced tracking
  completedPcs?: number;  // Explicitly track completed pieces (status = 'completed')
}

// Shipment - Enhanced with payment status
export interface Shipment extends BaseDocument {
  vendorId: ObjectId;
  styleId: ObjectId;
  pcsShipped: number;
  date: Date;
  challanNo: string;
  sizeBreakdown?: SizeBreakdown[];
  notes?: string;
  // New: Payment tracking
  paymentStatus: PaymentStatus;
  invoiceAmount?: number;       // Decimal amount
  paidAmount?: number;          // Amount already paid
  paymentDate?: Date;
}

// Rate (Vendor rate per style) - Enhanced with decimal
export interface Rate extends BaseDocument {
  styleId: ObjectId;
  vendorId: ObjectId;
  vendorRate: number; // ₹ per piece from vendor - stored as decimal with 2 decimal places
  effectiveDate: Date;
  // New: Tailor rate support
  tailorRate?: number; // Rate paid to tailors for this style
}

// Audit Event - Enhanced
export type EventAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'approve' | 'reject' | 'distribute' | 'payment' | 'status_change';
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
  | 'approval'
  | 'orderSize'
  | 'distribution';

export interface AuditEvent extends BaseDocument {
  entityType: EntityType;
  entityId: ObjectId;
  action: EventAction;
  actorId: ObjectId;
  actorName: string;
  actorRole: UserRole;
  changes?: Record<string, { old: unknown; new: unknown }>;
  metadata?: Record<string, unknown>;
  // Security: never expose to client in production
  internalNotes?: string;
  stackTrace?: string; // Only for server logs
}

// Standardized API Error Response
export interface ApiError {
  code: string;
  message: string;
  ref?: string;           // Error reference for support
  // Never include in production:
  details?: string;       // Only in development
}

// API Response types - Enhanced
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

// Expected Receivable calculation
export interface ExpectedReceivable {
  total: number;
  byVendor: {
    vendorId: string;
    vendorName: string;
    amount: number;
    breakdown: {
      shipped: number;
      completed: number;
    };
  }[];
  statusFilter: string[];  // Configurable status list
  lastCalculated: Date;
}

// Feature Flags
export interface FeatureFlags {
  enableSizeDistribution: boolean;
  enableDecimalRates: boolean;
  enableEnhancedRBAC: boolean;
  enableAuditLogs: boolean;
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

// Sample Management
export type SampleStatus =
  | 'requested'
  | 'in_production_sample'
  | 'sample_submitted'
  | 'approved'
  | 'rejected'
  | 'changes_requested'
  | 'production_in_progress'
  | 'cut_sent_to_vendor'
  | 'in_house_cut'
  | 'completed';

export interface SampleVersion extends BaseDocument {
  sampleId: ObjectId;
  versionNumber: number;
  submittedBy: {
    userId: ObjectId;
    name: string;
    role: UserRole;
  };
  status: SampleStatus;
  attachments: string[];
  notes?: string;
  expectedCompletionDate?: Date;
}

export interface SampleComment extends BaseDocument {
  sampleId: ObjectId;
  userId: ObjectId;
  userName: string;
  userRole: UserRole;
  content: string;
  attachments?: string[];
  isInternal?: boolean; // If we want internal notes just for manufacturers
}

export interface Sample extends BaseDocument {
  styleId: ObjectId;
  styleCode: string;
  styleName: string;
  vendorId: ObjectId;
  vendorName: string;
  status: SampleStatus;
  currentVersion: number;
  expectedBy?: Date;
  proceedToProduction?: boolean; // If vendor approved with this flag
  images?: string[]; // Latest images
  techPack?: string; // Link to PDF/Doc
}


