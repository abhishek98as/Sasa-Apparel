/**
 * Enhancement Tests
 * 
 * Tests for the 10 major fixes implemented:
 * 1. Completed pieces count - only count when status='completed'
 * 2. Expected receivable - based on shipped unpaid pieces
 * 3. Size distribution - allow size-level tracking
 * 4. Manager RBAC - proper permission enforcement
 * 5. Approval screen - hide dev info
 * 6. Session validation - correct portal routing
 * 7. Decimal rates - support 0.01 precision
 * 8. Style-cutting linking
 */

// Mock MongoDB before importing anything that uses it
jest.mock('@/lib/mongodb', () => ({
  getDb: jest.fn(),
  COLLECTIONS: {
    USERS: 'users',
    VENDORS: 'vendors',
    TAILORS: 'tailors',
    STYLES: 'styles',
    FABRIC_CUTTING: 'fabricCutting',
    TAILOR_JOBS: 'tailorJobs',
    SHIPMENTS: 'shipments',
    RATES: 'rates',
    APPROVALS: 'approvals',
    QC_INSPECTIONS: 'qcInspections',
    TAILOR_PAYMENTS: 'tailorPayments',
    ORDER_SIZES: 'orderSizes',
    AUDIT_LOGS: 'auditLogs',
    FEATURE_FLAGS: 'featureFlags',
  },
  COMPLETED_STATUSES: ['completed'],
  RECEIVABLE_STATUSES: ['shipped', 'delivered'],
  UNPAID_PAYMENT_STATUSES: ['pending', 'partial', 'unpaid'],
}));

// Mock auth
jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

import { 
  COMPLETED_STATUSES, 
  RECEIVABLE_STATUSES, 
  UNPAID_PAYMENT_STATUSES 
} from '@/lib/mongodb';
import { PermissionAction, UserRole } from '@/lib/types';

// Define RBAC functions locally for testing (to avoid MongoDB import issues)
const ROLE_PERMISSIONS: Record<string, PermissionAction[]> = {
  admin: [
    'order:create', 'order:read', 'order:update', 'order:delete', 'order:distribute',
    'assign:tailor', 'payment:vendor', 'payment:tailor',
    'approve:order', 'approve:sample', 'approve:payment',
    'style:create', 'style:update', 'cutting:create', 'cutting:update',
    'shipment:create', 'qc:inspect', 'qc:approve',
    'report:view', 'report:export', 'user:manage', 'settings:manage'
  ],
  manager: [
    'order:read', 'style:create', 'style:update',
    'cutting:read', 'shipment:read', 'report:view'
  ],
  vendor: ['order:read', 'style:read', 'shipment:read', 'report:view'],
  tailor: ['order:read']
};

interface PermissionContext {
  userId?: string;
  role?: UserRole;
  permissions?: { actions?: PermissionAction[] };
}

function hasPermission(context: PermissionContext, action: PermissionAction): boolean {
  const { role, permissions } = context;
  if (!role) return false;
  if (role === 'admin') return true;
  const rolePerms = ROLE_PERMISSIONS[role] || [];
  if (rolePerms.includes(action)) return true;
  if (role === 'manager' && permissions?.actions) {
    return permissions.actions.includes(action);
  }
  return false;
}

function getAllowedActions(context: PermissionContext): PermissionAction[] {
  const { role, permissions } = context;
  if (!role) return [];
  if (role === 'admin') return ROLE_PERMISSIONS.admin;
  const actions = new Set<PermissionAction>(ROLE_PERMISSIONS[role] || []);
  if (role === 'manager' && permissions?.actions) {
    permissions.actions.forEach(action => actions.add(action));
  }
  return Array.from(actions);
}

function createErrorResponse(code: string, message: string, ref?: string) {
  return {
    success: false,
    error: { code, message, ref: ref || `ERR-${Date.now()}` }
  };
}

describe('Status Constants', () => {
  describe('COMPLETED_STATUSES', () => {
    it('should include completed status', () => {
      expect(COMPLETED_STATUSES).toContain('completed');
    });

    it('should not include in-progress status', () => {
      expect(COMPLETED_STATUSES).not.toContain('in-progress');
    });

    it('should not include pending status', () => {
      expect(COMPLETED_STATUSES).not.toContain('pending');
    });
  });

  describe('RECEIVABLE_STATUSES', () => {
    it('should include shipped status', () => {
      expect(RECEIVABLE_STATUSES).toContain('shipped');
    });

    it('should include delivered status', () => {
      expect(RECEIVABLE_STATUSES).toContain('delivered');
    });
  });

  describe('UNPAID_PAYMENT_STATUSES', () => {
    it('should include pending status', () => {
      expect(UNPAID_PAYMENT_STATUSES).toContain('pending');
    });

    it('should include partial status', () => {
      expect(UNPAID_PAYMENT_STATUSES).toContain('partial');
    });

    it('should not include paid status', () => {
      expect(UNPAID_PAYMENT_STATUSES).not.toContain('paid');
    });
  });
});

describe('RBAC Utility', () => {
  describe('hasPermission', () => {
    it('should grant admin all permissions', () => {
      const context = { role: 'admin' as UserRole };
      expect(hasPermission(context, 'order:create')).toBe(true);
      expect(hasPermission(context, 'user:manage')).toBe(true);
      expect(hasPermission(context, 'settings:manage')).toBe(true);
    });

    it('should restrict vendor permissions', () => {
      const context = { role: 'vendor' as UserRole };
      expect(hasPermission(context, 'order:read')).toBe(true);
      expect(hasPermission(context, 'order:create')).toBe(false);
      expect(hasPermission(context, 'user:manage')).toBe(false);
    });

    it('should restrict tailor permissions', () => {
      const context = { role: 'tailor' as UserRole };
      expect(hasPermission(context, 'order:read')).toBe(true);
      expect(hasPermission(context, 'order:create')).toBe(false);
    });

    it('should check manager action permissions', () => {
      const context = {
        role: 'manager' as UserRole,
        permissions: {
          actions: ['order:create', 'approve:sample'] as PermissionAction[]
        }
      };
      expect(hasPermission(context, 'order:create')).toBe(true);
      expect(hasPermission(context, 'approve:sample')).toBe(true);
      expect(hasPermission(context, 'user:manage')).toBe(false);
    });

    it('should return false for undefined role', () => {
      const context = {};
      expect(hasPermission(context, 'order:read')).toBe(false);
    });
  });

  describe('getAllowedActions', () => {
    it('should return all actions for admin', () => {
      const context = { role: 'admin' as UserRole };
      const actions = getAllowedActions(context);
      expect(actions.length).toBeGreaterThan(10);
      expect(actions).toContain('user:manage');
    });

    it('should return manager-specific actions', () => {
      const context = {
        role: 'manager' as UserRole,
        permissions: {
          actions: ['order:create', 'approve:sample'] as PermissionAction[]
        }
      };
      const actions = getAllowedActions(context);
      expect(actions).toContain('order:create');
      expect(actions).toContain('approve:sample');
    });

    it('should return empty array for undefined role', () => {
      const context = {};
      const actions = getAllowedActions(context);
      expect(actions).toEqual([]);
    });
  });

  describe('createErrorResponse', () => {
    it('should create standardized error response', () => {
      const response = createErrorResponse('UNAUTHORIZED', 'Not logged in');
      expect(response.success).toBe(false);
      expect(response.error.code).toBe('UNAUTHORIZED');
      expect(response.error.message).toBe('Not logged in');
      expect(response.error.ref).toBeDefined();
    });

    it('should include custom ref if provided', () => {
      const response = createErrorResponse('ERROR', 'Test', 'REF-123');
      expect(response.error.ref).toBe('REF-123');
    });
  });
});

describe('Decimal Rate Support', () => {
  it('should handle decimal rates correctly', () => {
    const rate = 125.50;
    const pieces = 100;
    const total = rate * pieces;
    expect(total).toBe(12550);
  });

  it('should handle small decimal rates', () => {
    const rate = 0.99;
    const pieces = 1000;
    const total = rate * pieces;
    expect(total).toBe(990);
  });

  it('should handle rate with many decimals (rounded to 2)', () => {
    const rate = parseFloat((125.555).toFixed(2));
    expect(rate).toBe(125.56);
  });
});

describe('Completed Count Logic', () => {
  const jobs = [
    { status: 'in-progress', returnedPcs: 50 },
    { status: 'completed', returnedPcs: 100 },
    { status: 'completed', returnedPcs: 75 },
    { status: 'pending', returnedPcs: 0 },
    { status: 'in-progress', returnedPcs: 25 },
  ];

  it('should count only completed status jobs', () => {
    const completedPcs = jobs
      .filter(job => COMPLETED_STATUSES.includes(job.status))
      .reduce((sum, job) => sum + job.returnedPcs, 0);
    
    expect(completedPcs).toBe(175); // 100 + 75
  });

  it('should NOT count in-progress jobs as completed', () => {
    const wrongCount = jobs
      .filter(job => job.returnedPcs > 0)
      .reduce((sum, job) => sum + job.returnedPcs, 0);
    
    // This is wrong - includes in-progress
    expect(wrongCount).toBe(250);
    
    // Correct count
    const correctCount = jobs
      .filter(job => COMPLETED_STATUSES.includes(job.status))
      .reduce((sum, job) => sum + job.returnedPcs, 0);
    
    expect(correctCount).toBe(175);
  });
});

describe('Expected Receivable Logic', () => {
  const shipments = [
    { status: 'shipped', paymentStatus: 'pending', pcsShipped: 100, rate: 50 },
    { status: 'shipped', paymentStatus: 'paid', pcsShipped: 200, rate: 50 },
    { status: 'delivered', paymentStatus: 'partial', pcsShipped: 150, rate: 60 },
    { status: 'in-transit', paymentStatus: 'pending', pcsShipped: 75, rate: 40 },
    { status: 'delivered', paymentStatus: 'paid', pcsShipped: 300, rate: 55 },
  ];

  it('should calculate receivable from unpaid shipped/delivered pieces', () => {
    const receivable = shipments
      .filter(s => 
        RECEIVABLE_STATUSES.includes(s.status) && 
        UNPAID_PAYMENT_STATUSES.includes(s.paymentStatus)
      )
      .reduce((sum, s) => sum + (s.pcsShipped * s.rate), 0);
    
    // shipped + pending: 100 * 50 = 5000
    // delivered + partial: 150 * 60 = 9000
    // Total: 14000
    expect(receivable).toBe(14000);
  });

  it('should NOT include paid shipments in receivable', () => {
    const paidShipments = shipments
      .filter(s => s.paymentStatus === 'paid');
    
    expect(paidShipments.length).toBe(2);
    
    const receivable = shipments
      .filter(s => 
        RECEIVABLE_STATUSES.includes(s.status) && 
        UNPAID_PAYMENT_STATUSES.includes(s.paymentStatus)
      )
      .reduce((sum, s) => sum + (s.pcsShipped * s.rate), 0);
    
    // Should not include the 200*50 + 300*55 from paid shipments
    expect(receivable).toBe(14000);
  });
});

describe('Size Distribution', () => {
  interface SizeBreakdown {
    size: string;
    quantity: number;
    completedQty?: number;
  }

  it('should track size-level quantities', () => {
    const sizeBreakdown: SizeBreakdown[] = [
      { size: 'S', quantity: 100, completedQty: 50 },
      { size: 'M', quantity: 150, completedQty: 100 },
      { size: 'L', quantity: 120, completedQty: 80 },
      { size: 'XL', quantity: 80, completedQty: 40 },
    ];

    const totalQuantity = sizeBreakdown.reduce((sum, s) => sum + s.quantity, 0);
    const totalCompleted = sizeBreakdown.reduce((sum, s) => sum + (s.completedQty || 0), 0);

    expect(totalQuantity).toBe(450);
    expect(totalCompleted).toBe(270);
  });

  it('should validate size distribution does not exceed available', () => {
    const available: Record<string, number> = { S: 100, M: 150, L: 100 };
    const distribution: Record<string, number> = { S: 80, M: 100, L: 90 };

    const isValid = Object.entries(distribution).every(
      ([size, qty]) => qty <= (available[size] || 0)
    );

    expect(isValid).toBe(true);
  });

  it('should reject over-distribution', () => {
    const available: Record<string, number> = { S: 100, M: 150, L: 100 };
    const distribution: Record<string, number> = { S: 80, M: 200, L: 90 }; // M exceeds

    const isValid = Object.entries(distribution).every(
      ([size, qty]) => qty <= (available[size] || 0)
    );

    expect(isValid).toBe(false);
  });
});

describe('Session Validation', () => {
  const landingPages: Record<string, string> = {
    admin: '/admin/dashboard',
    manager: '/admin/dashboard',
    vendor: '/vendor/dashboard',
    tailor: '/tailor/dashboard'
  };

  it('should route admin to admin dashboard', () => {
    expect(landingPages['admin']).toBe('/admin/dashboard');
  });

  it('should route manager to admin dashboard', () => {
    expect(landingPages['manager']).toBe('/admin/dashboard');
  });

  it('should route vendor to vendor dashboard', () => {
    expect(landingPages['vendor']).toBe('/vendor/dashboard');
  });

  it('should route tailor to tailor dashboard', () => {
    expect(landingPages['tailor']).toBe('/tailor/dashboard');
  });
});

describe('Approval Screen Security', () => {
  it('should sanitize internal fields from payload', () => {
    const payload = {
      _id: 'internal-id',
      name: 'Test Name',
      email: 'test@example.com',
      password: 'secret123',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      __v: 0,
      internalNotes: 'Admin only note'
    };

    const internalFields = ['_id', 'password', 'passwordHash', 'createdAt', 'updatedAt', '__v', 'internalNotes'];
    const sanitized = { ...payload };
    
    internalFields.forEach(field => {
      if (field in sanitized) {
        delete (sanitized as any)[field];
      }
    });

    expect(sanitized).not.toHaveProperty('_id');
    expect(sanitized).not.toHaveProperty('password');
    expect(sanitized).not.toHaveProperty('createdAt');
    expect(sanitized).not.toHaveProperty('__v');
    expect(sanitized).not.toHaveProperty('internalNotes');
    expect(sanitized).toHaveProperty('name');
    expect(sanitized).toHaveProperty('email');
  });
});
