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

// User validation
export const userSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['admin', 'vendor', 'tailor']),
  vendorId: z.string().optional(),
  tailorId: z.string().optional(),
  isActive: z.boolean().default(true),
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

