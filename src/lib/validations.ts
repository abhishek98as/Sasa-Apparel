import { z } from 'zod';

// Vendor validation
export const vendorSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  contactPerson: z.string().min(2, 'Contact person name required'),
  phone: z.string().min(10, 'Valid phone number required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().min(5, 'Address required'),
  gstNumber: z.string().optional(),
  isActive: z.boolean().default(true),
});

// Style validation
export const styleSchema = z.object({
  code: z.string().min(1, 'Style code required'),
  name: z.string().min(2, 'Style name required'),
  vendorId: z.string().min(1, 'Vendor required'),
  fabricType: z.string().min(1, 'Fabric type required'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

// Tailor validation
export const tailorSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Valid phone number required'),
  address: z.string().optional(),
  specialization: z.string().optional(),
  isActive: z.boolean().default(true),
});

// Manager permissions schema
export const managerPermissionsSchema = z.object({
  dashboard: z.boolean().optional(),
  vendors: z.boolean().optional(),
  tailors: z.boolean().optional(),
  styles: z.boolean().optional(),
  fabricCutting: z.boolean().optional(),
  tailorJobs: z.boolean().optional(),
  shipments: z.boolean().optional(),
  rates: z.boolean().optional(),
  users: z.boolean().optional(),
  inventory: z.boolean().optional(),
  qc: z.boolean().optional(),
  payments: z.boolean().optional(),
  approvals: z.boolean().optional(),
});

// User validation
export const userSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['admin', 'manager', 'vendor', 'tailor']),
  vendorId: z.string().optional(),
  tailorId: z.string().optional(),
  permissions: managerPermissionsSchema.optional(),
  isActive: z.boolean().default(true),
});

// Inventory validation
export const inventoryItemSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  sku: z.string().min(1, 'SKU required'),
  type: z.enum(['raw', 'accessory']),
  unit: z.enum(['kg', 'piece', 'meter']),
  costPerUnit: z.number().min(0, 'Cost must be positive'),
  minStock: z.number().min(0, 'Min stock must be positive'),
  currentStock: z.number().min(0, 'Current stock must be positive').default(0),
  vendorId: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
});

export const inventoryMovementSchema = z.object({
  itemId: z.string().min(1, 'Item required'),
  type: z.enum(['in', 'out', 'waste', 'adjust']),
  quantity: z.number().positive('Quantity must be greater than zero'),
  unitCost: z.number().min(0).optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  relatedEntity: z
    .object({
      type: z.string(),
      id: z.string(),
    })
    .optional(),
});

export const reorderSuggestionSchema = z.object({
  itemId: z.string().min(1, 'Item required'),
  suggestedQty: z.number().positive('Suggested quantity must be greater than zero'),
  status: z.enum(['open', 'acknowledged', 'ordered', 'closed']).default('open'),
  generatedReason: z.string().optional(),
});

// QC validation
const defectCategorySchema = z.enum(['stitching', 'fabric', 'measurement', 'other']);

export const qcChecklistItemSchema = z.object({
  label: z.string().min(1, 'Checklist label required'),
  category: defectCategorySchema,
  isCritical: z.boolean().optional(),
});

export const qcChecklistSchema = z.object({
  styleId: z.string().min(1, 'Style required'),
  items: z.array(qcChecklistItemSchema).min(1, 'At least one checklist item required'),
  isActive: z.boolean().default(true),
});

export const qcInspectionSchema = z.object({
  styleId: z.string().min(1, 'Style required'),
  jobId: z.string().optional(),
  checklistId: z.string().optional(),
  status: z.enum(['pending', 'passed', 'failed', 'rework']),
  defects: z
    .array(
      z.object({
        category: defectCategorySchema,
        description: z.string().min(2, 'Description required'),
        severity: z.enum(['low', 'medium', 'high']).optional(),
      })
    )
    .optional(),
  photos: z.array(z.string()).optional(),
  rejectionReason: z.string().optional(),
  reworkAssignedTo: z.string().optional(),
});

// Payments validation
export const tailorPaymentSchema = z.object({
  tailorId: z.string().min(1, 'Tailor required'),
  jobId: z.string().optional(),
  amount: z.number(),
  entryType: z.enum(['earning', 'advance', 'deduction', 'payout']),
  description: z.string().optional(),
  reference: z.string().optional(),
});

// Fabric Cutting validation
export const fabricCuttingSchema = z.object({
  styleId: z.string().min(1, 'Style required'),
  vendorId: z.string().min(1, 'Vendor required'),
  fabricReceivedMeters: z.number().min(0, 'Must be positive'),
  cuttingReceivedPcs: z.number().min(1, 'Must be at least 1'),
  cuttingInHouse: z.boolean().default(false),
  date: z.string().or(z.date()),
  notes: z.string().optional(),
});

// Tailor Job validation
export const tailorJobSchema = z.object({
  styleId: z.string().min(1, 'Style required'),
  tailorId: z.string().min(1, 'Tailor required'),
  fabricCuttingId: z.string().min(1, 'Cutting record required'),
  issuedPcs: z.number().min(1, 'Must issue at least 1 piece'),
  rate: z.number().min(0, 'Rate must be positive'),
});

// Shipment validation
export const shipmentSchema = z.object({
  vendorId: z.string().min(1, 'Vendor required'),
  styleId: z.string().min(1, 'Style required'),
  pcsShipped: z.number().min(1, 'Must ship at least 1 piece'),
  date: z.string().or(z.date()),
  challanNo: z.string().min(1, 'Challan number required'),
  notes: z.string().optional(),
});

// Rate validation
export const rateSchema = z.object({
  styleId: z.string().min(1, 'Style required'),
  vendorId: z.string().min(1, 'Vendor required'),
  vendorRate: z.number().min(0, 'Rate must be positive'),
  effectiveDate: z.string().or(z.date()),
});

// Job update validation
export const jobUpdateSchema = z.object({
  returnedPcs: z.number().min(0).optional(),
  status: z.enum(['pending', 'in-progress', 'completed', 'returned']).optional(),
  qcStatus: z.enum(['pending', 'passed', 'failed', 'rework']).optional(),
  qcNotes: z.string().optional(),
});

export type VendorInput = z.infer<typeof vendorSchema>;
export type StyleInput = z.infer<typeof styleSchema>;
export type TailorInput = z.infer<typeof tailorSchema>;
export type UserInput = z.infer<typeof userSchema>;
export type FabricCuttingInput = z.infer<typeof fabricCuttingSchema>;
export type TailorJobInput = z.infer<typeof tailorJobSchema>;
export type ShipmentInput = z.infer<typeof shipmentSchema>;
export type RateInput = z.infer<typeof rateSchema>;
export type JobUpdateInput = z.infer<typeof jobUpdateSchema>;
export type InventoryItemInput = z.infer<typeof inventoryItemSchema>;
export type InventoryMovementInput = z.infer<typeof inventoryMovementSchema>;
export type ReorderSuggestionInput = z.infer<typeof reorderSuggestionSchema>;
export type QCChecklistInput = z.infer<typeof qcChecklistSchema>;
export type QCInspectionInput = z.infer<typeof qcInspectionSchema>;
export type TailorPaymentInput = z.infer<typeof tailorPaymentSchema>;

