/**
 * RBAC (Role-Based Access Control) Utility
 * 
 * Server-side permission enforcement for the Sasa Apparel portal.
 * All permission checks MUST be done server-side - never trust client-side checks.
 */

import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { UserRole, PermissionAction, ManagerPermissions, CRUDPermission, ModuleKey } from './types';
import { getDb, COLLECTIONS } from './mongodb';
import { ObjectId } from 'mongodb';

// Permission matrix for each role
const ROLE_PERMISSIONS: Record<UserRole, PermissionAction[]> = {
  admin: [
    // Admin has all permissions
    'order:create', 'order:read', 'order:update', 'order:delete', 'order:distribute',
    'assign:tailor', 'payment:vendor', 'payment:tailor',
    'approve:order', 'approve:sample', 'approve:payment',
    'style:create', 'style:update', 'cutting:create', 'cutting:update',
    'shipment:create', 'qc:inspect', 'qc:approve',
    'report:view', 'report:export', 'user:manage', 'settings:manage'
  ],
  manager: [
    // Manager permissions based on their specific permission settings
    // These are baseline permissions that all managers have
    'order:read', 'style:create', 'style:update',
    'cutting:read', 'shipment:read', 'report:view'
  ],
  vendor: [
    // Vendor has limited read-only access
    'order:read', 'style:read', 'shipment:read', 'report:view'
  ],
  tailor: [
    // Tailor has minimal access
    'order:read'
  ]
};

// Module to permission action mapping
const MODULE_ACTIONS: Record<ModuleKey, { create: PermissionAction; read: PermissionAction; update: PermissionAction; delete: PermissionAction }> = {
  dashboard: { create: 'order:create', read: 'order:read', update: 'order:update', delete: 'order:delete' },
  vendors: { create: 'order:create', read: 'order:read', update: 'order:update', delete: 'order:delete' },
  tailors: { create: 'assign:tailor', read: 'order:read', update: 'assign:tailor', delete: 'assign:tailor' },
  styles: { create: 'style:create', read: 'order:read', update: 'style:update', delete: 'style:update' },
  fabricCutting: { create: 'cutting:create', read: 'order:read', update: 'cutting:update', delete: 'cutting:update' },
  distribution: { create: 'order:distribute', read: 'order:read', update: 'order:distribute', delete: 'order:distribute' },
  production: { create: 'order:create', read: 'order:read', update: 'order:update', delete: 'order:delete' },
  shipments: { create: 'shipment:create', read: 'order:read', update: 'shipment:create', delete: 'shipment:create' },
  rates: { create: 'order:create', read: 'order:read', update: 'order:update', delete: 'order:delete' },
  inventory: { create: 'order:create', read: 'order:read', update: 'order:update', delete: 'order:delete' },
  qc: { create: 'qc:inspect', read: 'order:read', update: 'qc:approve', delete: 'qc:approve' },
  payments: { create: 'payment:tailor', read: 'order:read', update: 'payment:vendor', delete: 'payment:vendor' },
  approvals: { create: 'approve:order', read: 'order:read', update: 'approve:order', delete: 'approve:order' },
  reports: { create: 'report:export', read: 'report:view', update: 'report:export', delete: 'report:export' },
  users: { create: 'user:manage', read: 'order:read', update: 'user:manage', delete: 'user:manage' }
};

interface PermissionContext {
  userId?: string;
  role?: UserRole;
  permissions?: ManagerPermissions;
}

/**
 * Check if a user has a specific permission action
 */
export function hasPermission(
  context: PermissionContext,
  action: PermissionAction
): boolean {
  const { role, permissions } = context;
  
  if (!role) return false;
  
  // Admin always has all permissions
  if (role === 'admin') return true;
  
  // Check role-based permissions
  const rolePerms = ROLE_PERMISSIONS[role];
  if (rolePerms.includes(action)) return true;
  
  // For managers, check specific action permissions
  if (role === 'manager' && permissions?.actions) {
    return permissions.actions.includes(action);
  }
  
  return false;
}

/**
 * Check if a user has access to a module with specific CRUD operation
 */
export function hasModuleAccess(
  context: PermissionContext,
  module: ModuleKey,
  operation: keyof CRUDPermission
): boolean {
  const { role, permissions } = context;
  
  if (!role) return false;
  
  // Admin always has full access
  if (role === 'admin') return true;
  
  // For managers, check module-specific permissions
  if (role === 'manager' && permissions) {
    const modulePerms = permissions[module];
    if (modulePerms && modulePerms[operation]) {
      return true;
    }
  }
  
  // Map module operation to action and check
  const moduleActions = MODULE_ACTIONS[module];
  if (moduleActions) {
    const action = moduleActions[operation];
    return hasPermission(context, action);
  }
  
  return false;
}

/**
 * Get current user's permission context from session
 */
export async function getPermissionContext(): Promise<PermissionContext | null> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) return null;
  
  // Get full user data including permissions from database
  const db = await getDb();
  const user = await db.collection(COLLECTIONS.USERS).findOne({
    _id: new ObjectId(session.user.id)
  });
  
  if (!user) return null;
  
  return {
    userId: session.user.id,
    role: session.user.role,
    permissions: user.permissions as ManagerPermissions | undefined
  };
}

/**
 * Middleware-style permission check that throws if unauthorized
 */
export async function requirePermission(action: PermissionAction): Promise<PermissionContext> {
  const context = await getPermissionContext();
  
  if (!context) {
    throw new AuthorizationError('UNAUTHORIZED', 'Authentication required');
  }
  
  if (!hasPermission(context, action)) {
    throw new AuthorizationError('FORBIDDEN', 'You do not have permission to perform this action');
  }
  
  return context;
}

/**
 * Middleware-style module access check
 */
export async function requireModuleAccess(
  module: ModuleKey,
  operation: keyof CRUDPermission
): Promise<PermissionContext> {
  const context = await getPermissionContext();
  
  if (!context) {
    throw new AuthorizationError('UNAUTHORIZED', 'Authentication required');
  }
  
  if (!hasModuleAccess(context, module, operation)) {
    throw new AuthorizationError('FORBIDDEN', `You do not have ${operation} access to ${module}`);
  }
  
  return context;
}

/**
 * Custom authorization error
 */
export class AuthorizationError extends Error {
  code: string;
  
  constructor(code: string, message: string) {
    super(message);
    this.name = 'AuthorizationError';
    this.code = code;
  }
}

/**
 * Generate standardized error response
 */
export function createErrorResponse(code: string, message: string, ref?: string) {
  return {
    success: false,
    error: {
      code,
      message,
      ref: ref || `ERR-${Date.now()}`
    }
  };
}

/**
 * Get list of allowed actions for a user
 */
export function getAllowedActions(context: PermissionContext): PermissionAction[] {
  const { role, permissions } = context;
  
  if (!role) return [];
  
  if (role === 'admin') {
    return ROLE_PERMISSIONS.admin;
  }
  
  const actions = new Set<PermissionAction>(ROLE_PERMISSIONS[role]);
  
  // Add manager-specific actions
  if (role === 'manager' && permissions?.actions) {
    permissions.actions.forEach(action => actions.add(action));
  }
  
  return Array.from(actions);
}

/**
 * Validate session and role on resume
 */
export async function validateSessionRole(): Promise<{
  valid: boolean;
  role?: UserRole;
  redirectTo?: string;
  message?: string;
}> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return { valid: false, redirectTo: '/login', message: 'Session expired' };
  }
  
  // Verify user still exists and is active
  const db = await getDb();
  const user = await db.collection(COLLECTIONS.USERS).findOne({
    _id: new ObjectId(session.user.id),
    isActive: true
  });
  
  if (!user) {
    return { valid: false, redirectTo: '/login', message: 'Account not found or deactivated' };
  }
  
  // Verify role matches
  if (user.role !== session.user.role) {
    return { 
      valid: false, 
      redirectTo: '/login', 
      message: 'Session refreshed — re-login required' 
    };
  }
  
  // Determine correct landing page based on role
  const roleLandingPages: Record<UserRole, string> = {
    admin: '/admin/dashboard',
    manager: '/admin/dashboard',
    vendor: '/vendor/dashboard',
    tailor: '/tailor/dashboard'
  };
  
  return { 
    valid: true, 
    role: user.role as UserRole,
    redirectTo: roleLandingPages[user.role as UserRole]
  };
}
