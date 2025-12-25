/**
 * Audit Logging Utility
 * 
 * Server-side audit logging for tracking all sensitive operations.
 * Logs are stored in MongoDB and never exposed to clients in production.
 */

import { ObjectId } from 'mongodb';
import { getDb, COLLECTIONS } from './mongodb';
import { AuditEvent, EntityType, EventAction, UserRole } from './types';

interface AuditLogEntry {
  entityType: EntityType;
  entityId: string | ObjectId;
  action: EventAction;
  actorId: string | ObjectId;
  actorName: string;
  actorRole: UserRole;
  changes?: Record<string, { old: unknown; new: unknown }>;
  metadata?: Record<string, unknown>;
  internalNotes?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const db = await getDb();
    
    const auditEvent: Omit<AuditEvent, '_id'> = {
      entityType: entry.entityType,
      entityId: typeof entry.entityId === 'string' ? new ObjectId(entry.entityId) : entry.entityId,
      action: entry.action,
      actorId: typeof entry.actorId === 'string' ? new ObjectId(entry.actorId) : entry.actorId,
      actorName: entry.actorName,
      actorRole: entry.actorRole,
      changes: entry.changes,
      metadata: entry.metadata,
      internalNotes: entry.internalNotes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await db.collection(COLLECTIONS.AUDIT_LOGS).insertOne(auditEvent);
  } catch (error) {
    // Log to server console but don't throw - audit should not break main operations
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Log a status change event
 */
export async function logStatusChange(params: {
  entityType: EntityType;
  entityId: string | ObjectId;
  oldStatus: string;
  newStatus: string;
  actorId: string | ObjectId;
  actorName: string;
  actorRole: UserRole;
  reason?: string;
}): Promise<void> {
  await createAuditLog({
    entityType: params.entityType,
    entityId: params.entityId,
    action: 'status_change',
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    changes: {
      status: { old: params.oldStatus, new: params.newStatus }
    },
    metadata: params.reason ? { reason: params.reason } : undefined
  });
}

/**
 * Log a distribution event
 */
export async function logDistribution(params: {
  fabricCuttingId: string | ObjectId;
  tailorId: string | ObjectId;
  tailorName: string;
  styleId: string | ObjectId;
  piecesDistributed: number;
  sizeBreakdown?: { size: string; qty: number }[];
  actorId: string | ObjectId;
  actorName: string;
  actorRole: UserRole;
}): Promise<void> {
  await createAuditLog({
    entityType: 'distribution',
    entityId: params.fabricCuttingId,
    action: 'distribute',
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    metadata: {
      tailorId: params.tailorId.toString(),
      tailorName: params.tailorName,
      styleId: params.styleId.toString(),
      piecesDistributed: params.piecesDistributed,
      sizeBreakdown: params.sizeBreakdown
    }
  });
}

/**
 * Log a payment event
 */
export async function logPayment(params: {
  entityType: 'tailorPayment' | 'shipment';
  entityId: string | ObjectId;
  amount: number;
  paymentType: string;
  recipientId: string | ObjectId;
  recipientName: string;
  actorId: string | ObjectId;
  actorName: string;
  actorRole: UserRole;
}): Promise<void> {
  await createAuditLog({
    entityType: params.entityType,
    entityId: params.entityId,
    action: 'payment',
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    metadata: {
      amount: params.amount,
      paymentType: params.paymentType,
      recipientId: params.recipientId.toString(),
      recipientName: params.recipientName
    }
  });
}

/**
 * Log an approval/rejection event
 */
export async function logApproval(params: {
  entityType: EntityType;
  entityId: string | ObjectId;
  approved: boolean;
  remarks?: string;
  actorId: string | ObjectId;
  actorName: string;
  actorRole: UserRole;
}): Promise<void> {
  await createAuditLog({
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.approved ? 'approve' : 'reject',
    actorId: params.actorId,
    actorName: params.actorName,
    actorRole: params.actorRole,
    metadata: params.remarks ? { remarks: params.remarks } : undefined
  });
}

/**
 * Log an unauthorized access attempt
 */
export async function logUnauthorizedAccess(params: {
  attemptedAction: string;
  attemptedResource: string;
  actorId?: string | ObjectId;
  actorName?: string;
  actorRole?: UserRole;
  ipAddress?: string;
}): Promise<void> {
  try {
    const db = await getDb();
    
    await db.collection(COLLECTIONS.AUDIT_LOGS).insertOne({
      entityType: 'user',
      entityId: params.actorId ? new ObjectId(params.actorId.toString()) : new ObjectId(),
      action: 'reject',
      actorId: params.actorId ? new ObjectId(params.actorId.toString()) : new ObjectId(),
      actorName: params.actorName || 'Unknown',
      actorRole: params.actorRole || 'tailor',
      metadata: {
        type: 'unauthorized_access',
        attemptedAction: params.attemptedAction,
        attemptedResource: params.attemptedResource,
        ipAddress: params.ipAddress
      },
      internalNotes: 'Unauthorized access attempt detected',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to log unauthorized access:', error);
  }
}

/**
 * Get audit logs for an entity (admin only)
 */
export async function getAuditLogs(params: {
  entityType?: EntityType;
  entityId?: string;
  action?: EventAction;
  actorId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  skip?: number;
}): Promise<Omit<AuditEvent, 'internalNotes' | 'stackTrace'>[]> {
  const db = await getDb();
  
  const filter: Record<string, unknown> = {};
  
  if (params.entityType) filter.entityType = params.entityType;
  if (params.entityId) filter.entityId = new ObjectId(params.entityId);
  if (params.action) filter.action = params.action;
  if (params.actorId) filter.actorId = new ObjectId(params.actorId);
  
  if (params.startDate || params.endDate) {
    filter.createdAt = {};
    if (params.startDate) (filter.createdAt as Record<string, Date>).$gte = params.startDate;
    if (params.endDate) (filter.createdAt as Record<string, Date>).$lte = params.endDate;
  }
  
  const logs = await db.collection(COLLECTIONS.AUDIT_LOGS)
    .find(filter, {
      // Never return internal notes or stack traces
      projection: { internalNotes: 0, stackTrace: 0 }
    })
    .sort({ createdAt: -1 })
    .skip(params.skip || 0)
    .limit(params.limit || 100)
    .toArray();
  
  return logs as unknown as Omit<AuditEvent, 'internalNotes' | 'stackTrace'>[];
}

/**
 * Sanitize audit log for client response
 * Removes all internal/developer information
 */
export function sanitizeAuditLog(log: AuditEvent): Record<string, unknown> {
  const { internalNotes, stackTrace, ...sanitized } = log;
  return {
    ...sanitized,
    _id: sanitized._id?.toString(),
    entityId: sanitized.entityId?.toString(),
    actorId: sanitized.actorId?.toString(),
  };
}
