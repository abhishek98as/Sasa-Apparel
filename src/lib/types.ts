import { ObjectId } from 'mongodb';

// User Roles
export type UserRole = 'admin' | 'vendor' | 'tailor';

// Base interface for MongoDB documents
export interface BaseDocument {
  _id?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// User
export interface User extends BaseDocument {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  vendorId?: ObjectId; // Only for vendor role
  tailorId?: ObjectId; // Only for tailor role
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
export interface Tailor extends BaseDocument {
  name: string;
  phone: string;
  address?: string;
  specialization?: string;
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
export type EventAction = 'create' | 'update' | 'delete' | 'login' | 'logout';
export type EntityType = 'user' | 'vendor' | 'style' | 'fabricCutting' | 'tailorJob' | 'shipment' | 'rate';

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

