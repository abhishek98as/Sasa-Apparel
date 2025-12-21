---
name: Bug Fixes & Feature Enhancements
overview: Fix critical bugs (seed script, login issues) and implement 11 new business requirements including size-wise tracking, QC rejection workflow, ready-to-ship status, and improved vendor portal views.
todos:
  - id: fix-seed-script
    content: Fix seed script JSON parsing error in package.json
    status: pending
  - id: fix-login
    content: Debug and fix login issues (DB connection, auth flow, password hashing)
    status: pending
  - id: create-tests
    content: Create test suite for DB connection, auth, and API health
    status: pending
  - id: extend-schema-sizes
    content: Add size dimension to data model (FabricCutting, TailorJob, Shipment)
    status: pending
  - id: qc-rejection-workflow
    content: Add QC rejection workflow with rejected pieces tracking
    status: pending
  - id: ready-to-ship-status
    content: Add ready-to-ship status and tracking
    status: pending
  - id: fix-completed-pcs
    content: Fix dashboard to show completed pcs even with pending orders
    status: pending
  - id: fix-revenue-calc
    content: Fix revenue to calculate from completed pcs not shipped
    status: pending
  - id: debug-distribution
    content: Debug and fix distribution engine not working
    status: pending
  - id: vendor-portal-labels
    content: Update vendor portal labels (Total Shipped, Total Received)
    status: pending
  - id: vendor-drilldown
    content: Add Total Sent with style-wise progress drill-down
    status: pending
  - id: vendor-card-view
    content: Improve vendor card view with expandable details
    status: pending
  - id: size-cutting-entry
    content: Add size-wise breakdown to fabric cutting entry
    status: pending
  - id: size-distribution
    content: Implement size-wise distribution to tailors
    status: pending
  - id: size-shipments
    content: Add size tracking to shipments
    status: pending
  - id: ready-to-ship-tab
    content: Create Ready to Ship tab UI
    status: pending
  - id: qc-rejection-ui
    content: Build QC rejection interface
    status: pending
---

# Bug Fixes & Feature Enhancements Plan

## Phase 1: Critical Bug Fixes (Priority: URGENT)

### 1.1 Fix Seed Script JSON Parsing Error

**Issue**: `ts-node --compiler-options {"module":"CommonJS"}` fails due to JSON parsing**Root Cause**: PowerShell interprets the JSON incorrectly**Solution**: Update [`package.json`](package.json) seed script to use proper escaping or tsconfig approach

```json
"seed": "ts-node --project tsconfig.json scripts/seed.ts"
```

**Files**: [`package.json`](package.json)

### 1.2 Fix Login Issues

**Issue**: Admin and Vendor unable to login**Root Cause Analysis Needed**:

- Verify MongoDB connection is established
- Check if users collection exists and has seeded data
- Verify password hashing matches
- Check NextAuth configuration
- Verify session/JWT configuration

**Diagnostic Steps**:

1. Create test connection script to verify MongoDB Atlas connectivity
2. Check if collections and indexes are created
3. Verify user records exist with correct password hashes
4. Test NextAuth flow with detailed logging

**Files**: [`src/lib/mongodb.ts`](src/lib/mongodb.ts), [`src/lib/auth.ts`](src/lib/auth.ts), [`scripts/seed.ts`](scripts/seed.ts)

### 1.3 Create Test Suite

**Tests Needed**:

- Database connection test (MongoDB Atlas)
- User authentication test (login flow)
- API endpoint health checks
- RBAC middleware tests

**Files**: Create `tests/` directory with:

- `tests/db-connection.test.ts`
- `tests/auth.test.ts`
- `tests/api-health.test.ts`

---

## Phase 2: Data Model Extensions (Foundation for New Features)

### 2.1 Add Size Dimension to Schema

**Business Requirement**: Points 9, 10 - Size-wise distribution and tracking**Impact**: Major schema change affecting multiple collections**New Size Model**:

```typescript
interface SizeBreakdown {
  size: string; // e.g., "S", "M", "L", "XL", "38", "40" etc.
  quantity: number;
}
```

**Schema Updates Required**:

- `FabricCutting`: Add `sizeBreakdown?: SizeBreakdown[]`
- `TailorJob`: Add `sizeBreakdown?: SizeBreakdown[]`
- `Shipment`: Add `sizeBreakdown?: SizeBreakdown[]`
- `Style`: Add `availableSizes: string[]` (define which sizes apply to this style)

**Files**: [`src/lib/types.ts`](src/lib/types.ts), [`src/lib/validations.ts`](src/lib/validations.ts)

### 2.2 Add QC Rejection Workflow

**Business Requirement**: Point 3 - QC rejected functionality**Current**: QC status has 'failed' but no rejection workflow**Enhancement**:

- Add `rejectedPcs` field to `TailorJob`
- Add `rejectionReason` field
- Add status `qc-rejected` 
- Rejected pieces should be reassignable to same/different tailor

**Schema Updates**:

```typescript
interface TailorJob {
  // existing fields...
  rejectedPcs: number;
  rejectionReason?: string;
  qcStatus: 'pending' | 'passed' | 'failed' | 'rework' | 'rejected';
}
```

**Files**: [`src/lib/types.ts`](src/lib/types.ts)

### 2.3 Add "Ready to Ship" Status

**Business Requirement**: Point 1 - Ready to Ship tab**Current**: Only "shipped" status exists**Enhancement**: Add intermediate "ready-to-ship" status between completed and shipped**New Collection or Field**:

- Add `readyToShipStatus` to completed jobs
- Or create `ReadyToShip` collection tracking completed but not-yet-shipped inventory

**Approach**: Add status field to track inventory states:

```typescript
type InventoryStatus = 'in-production' | 'completed' | 'ready-to-ship' | 'shipped';
```

**Files**: [`src/lib/types.ts`](src/lib/types.ts)---

## Phase 3: Dashboard & Metrics Corrections

### 3.1 Fix Completed PCS Display Logic

**Business Requirement**: Point 4 - Completed pcs not showing if 1-2 orders pending**Issue**: Dashboard counts only fully completed jobs**Solution**: Show completed pieces even if job is partially complete**Logic Change**:

```typescript
// Current: Only count if status === 'completed'
// New: Sum all returnedPcs with qcStatus === 'passed'
```

**Files**: [`src/app/api/admin/dashboard/route.ts`](src/app/api/admin/dashboard/route.ts)

### 3.2 Fix Expected Revenue Calculation

**Business Requirement**: Point 11 - Revenue should show for completed pcs, not shipped**Issue**: Currently shows revenue based on shipped pieces**Solution**: Calculate based on `returnedPcs` with `qcStatus === 'passed'`**Formula Change**:

```typescript
// OLD: shipments × vendor rate
// NEW: completedPcs × vendor rate
```

**Files**: [`src/app/api/admin/dashboard/route.ts`](src/app/api/admin/dashboard/route.ts), [`src/app/api/profit/route.ts`](src/app/api/profit/route.ts)---

## Phase 4: Distribution Engine Fixes

### 4.1 Debug "Manager Distribution Not Working"

**Business Requirement**: Point 2 - Manager distribution not working**Investigation Needed**:

- Check if distribution API is being called
- Verify tailor capacity calculation
- Check if jobs are being created
- Verify available pieces calculation

**Potential Issues**:

- API endpoint errors
- Frontend form validation blocking submission
- MongoDB transaction failures
- Insufficient error handling/messaging

**Files**: [`src/app/admin/distribution/page.tsx`](src/app/admin/distribution/page.tsx), [`src/app/api/tailor-jobs/route.ts`](src/app/api/tailor-jobs/route.ts)---

## Phase 5: Vendor Portal Enhancements

### 5.1 Rename "Total Shipped" to "Total Shipment Received"

**Business Requirement**: Point 6**Simple Label ChangeFiles**: [`src/app/vendor/dashboard/page.tsx`](src/app/vendor/dashboard/page.tsx)

### 5.2 Rename "Total Received" to "Total Cutting/Fabric Sent"

**Business Requirement**: Point 7**Label Change + Metric ClarificationFiles**: [`src/app/vendor/dashboard/page.tsx`](src/app/vendor/dashboard/page.tsx)

### 5.3 Add "Total Sent" with Drill-Down

**Business Requirement**: Point 8 - Show style-wise progress on click**Enhancement**:

- Display "Total Sent (cutting sent to vendor)"
- On click, open modal showing style-wise working progress
- Show in-production status per style

**Files**: [`src/app/vendor/dashboard/page.tsx`](src/app/vendor/dashboard/page.tsx), [`src/app/api/vendor/dashboard/route.ts`](src/app/api/vendor/dashboard/route.ts)

### 5.4 Improve Vendor Card View

**Business Requirement**: Point 5 - Show other details behind**Enhancement**: Convert simple cards to expandable cards or use accordion pattern**Design**:

- Front: Key metrics (received, shipped, pending)
- Back/Expanded: Detailed breakdown (by style, dates, status)

**Files**: [`src/app/vendor/dashboard/page.tsx`](src/app/vendor/dashboard/page.tsx)---

## Phase 6: Size-Wise Distribution Implementation

### 6.1 Update Fabric & Cutting Entry Form

**Business Requirement**: Point 9**Enhancement**: Add size breakdown input**UI Design**:

- Dynamic size entry table
- Columns: Size | Quantity
- Total must match `cuttingReceivedPcs`

**Files**: [`src/app/admin/fabric-cutting/page.tsx`](src/app/admin/fabric-cutting/page.tsx), [`src/app/api/fabric-cutting/route.ts`](src/app/api/fabric-cutting/route.ts)

### 6.2 Size-Wise Distribution to Tailors

**Business Requirement**: Point 9, 10**Enhancement**:

- When assigning work, break down by size
- Each tailor gets specific sizes + quantities
- Validation: Total assigned sizes = available sizes

**UI Design**:

- Show available sizes from selected cutting
- For each tailor assignment, show size breakdown table
- Auto-calculate total pieces per tailor

**Files**: [`src/app/admin/distribution/page.tsx`](src/app/admin/distribution/page.tsx), [`src/app/api/tailor-jobs/route.ts`](src/app/api/tailor-jobs/route.ts)

### 6.3 Size-Wise Shipments

**Business Requirement**: Point 10**Enhancement**:

- Record size breakdown in shipments
- Vendor sees size-wise shipment details

**Files**: [`src/app/admin/shipments/page.tsx`](src/app/admin/shipments/page.tsx), [`src/app/api/shipments/route.ts`](src/app/api/shipments/route.ts)

### 6.4 Size-Based Rate Calculation (Optional)

**Business Requirement**: Point 10 - "vendor by size"**Enhancement**: Allow different rates per size**Schema**:

```typescript
interface Rate {
  styleId: ObjectId;
  vendorId: ObjectId;
  vendorRate: number; // default rate
  sizeBasedRates?: { size: string; rate: number; }[]; // optional
}
```

**Files**: [`src/lib/types.ts`](src/lib/types.ts), [`src/app/api/rates/route.ts`](src/app/api/rates/route.ts)---

## Phase 7: UI/UX Improvements

### 7.1 Add "Ready to Ship" Tab

**Business Requirement**: Point 1**Location**: Admin Dashboard or Production page**Design**: New tab showing completed items not yet shipped**Features**:

- Bulk select for shipment creation
- Filter by style, vendor, date
- Quick shipment creation flow

**Files**: Create [`src/app/admin/ready-to-ship/page.tsx`](src/app/admin/ready-to-ship/page.tsx)

### 7.2 QC Rejection Interface

**Business Requirement**: Point 3**Enhancement**:

- Add "Reject" button in production tracking
- Rejection modal with reason + rejected quantity
- Show rejected items in separate view for reassignment

**Files**: [`src/app/admin/production/page.tsx`](src/app/admin/production/page.tsx)---

## Implementation Order (Recommended)

### Sprint 1: Critical Fixes (Week 1)

1. Fix seed script (1 day)
2. Debug and fix login issues (2 days)
3. Create test suite (2 days)

### Sprint 2: Data Model & Dashboard (Week 2)

4. Extend schema for sizes (1 day)
5. Add QC rejection workflow (2 days)
6. Fix completed pcs display (1 day)
7. Fix revenue calculation (1 day)

### Sprint 3: Distribution & Vendor Portal (Week 3)

8. Debug distribution engine (2 days)
9. Implement vendor portal label changes (1 day)
10. Add drill-down for "Total Sent" (1 day)
11. Improve vendor card view (1 day)

### Sprint 4: Size-Wise Features (Week 4-5)

12. Size-wise cutting entry (2 days)
13. Size-wise distribution (3 days)
14. Size-wise shipments (2 days)
15. Size-based rates (optional, 2 days)

### Sprint 5: UI Polish (Week 6)

16. Ready to Ship tab (2 days)
17. QC rejection UI (2 days)
18. Testing and bug fixes (1 day)

---

## Testing Strategy

### Unit Tests

- Schema validation (Zod schemas)
- Utility functions (formatters, calculators)
- MongoDB aggregation queries

### Integration Tests

- API endpoint tests
- Authentication flow
- RBAC middleware
- Database operations

### E2E Tests (Critical Paths)

- Admin: Create vendor → style → cutting → distribute → track → ship
- Vendor: View dashboard → check progress → view shipments
- Tailor: View jobs → submit returns

### Manual UAT Checklist

- Size-wise distribution end-to-end
- QC rejection and reassignment
- Ready to Ship workflow
- Revenue calculations accuracy
- Vendor portal label correctness

---

## Risk Assessment

**High Risk**:

- Schema changes (sizes) may require data migration
- Size-wise distribution adds complexity to already complex flow
- Revenue calculation change may affect existing reports

**Medium Risk**:

- QC rejection workflow may conflict with existing status logic
- Distribution engine debugging without clear error logs

**Low Risk**:

- Label changes
- UI improvements

**Mitigation**:

- Implement schema changes with backwards compatibility
- Add extensive validation for size breakdowns
- Thoroughly test revenue calculations against historical data
- Add comprehensive error logging to distribution engine

---

## Acceptance Criteria

Each feature must meet:

1. Functional requirements as specified
2. No breaking changes to existing workflows
3. Proper validation and error handling
4. Role-based access control maintained