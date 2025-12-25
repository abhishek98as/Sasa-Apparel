/**
 * User Profile API
 * 
 * Returns current user information and role for session validation.
 * Used on app boot/resume to determine correct portal.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { validateSessionRole, getAllowedActions } from '@/lib/rbac';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

/**
 * GET /api/me
 * Get current user profile and validate session
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({
        success: false,
        authenticated: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated'
        }
      }, { status: 401 });
    }

    // Validate session and role
    const validation = await validateSessionRole();
    
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        authenticated: false,
        error: {
          code: 'SESSION_INVALID',
          message: validation.message || 'Session expired'
        },
        redirectTo: validation.redirectTo
      }, { status: 401 });
    }

    // Get full user data
    const db = await getDb();
    const user = await db.collection(COLLECTIONS.USERS).findOne({
      _id: new ObjectId(session.user.id)
    }, {
      projection: {
        password: 0, // Never return password
        _id: 1,
        email: 1,
        name: 1,
        role: 1,
        permissions: 1,
        isActive: 1,
        lastLogin: 1,
        vendorId: 1,
        tailorId: 1
      }
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        authenticated: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User account not found'
        }
      }, { status: 404 });
    }

    // Get allowed actions for this user
    const allowedActions = getAllowedActions({
      userId: session.user.id,
      role: session.user.role,
      permissions: user.permissions
    });

    // Role-specific landing pages
    const landingPages: Record<string, string> = {
      admin: '/admin/dashboard',
      manager: '/admin/dashboard',
      vendor: '/vendor/dashboard',
      tailor: '/tailor/dashboard'
    };

    // Get associated entity info if applicable
    let associatedEntity = null;
    
    if (user.vendorId) {
      const vendor = await db.collection(COLLECTIONS.VENDORS).findOne({
        _id: user.vendorId
      });
      if (vendor) {
        associatedEntity = {
          type: 'vendor',
          id: vendor._id.toString(),
          name: vendor.name
        };
      }
    } else if (user.tailorId) {
      const tailor = await db.collection('tailors').findOne({
        _id: user.tailorId
      });
      if (tailor) {
        associatedEntity = {
          type: 'tailor',
          id: tailor._id.toString(),
          name: tailor.name
        };
      }
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      data: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        permissions: user.role === 'manager' ? user.permissions : undefined,
        allowedActions,
        landingPage: landingPages[user.role] || '/login',
        associatedEntity
      }
    });

  } catch (error: any) {
    console.error('GET /api/me error:', error);
    return NextResponse.json({
      success: false,
      authenticated: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to validate session'
      }
    }, { status: 500 });
  }
}
