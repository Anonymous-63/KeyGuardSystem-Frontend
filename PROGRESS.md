# KeyGuard System — Full Project Progress

**Last updated:** 2026-05-07
**Frontend branch:** master (Sprints 1–6 committed, NOT YET TESTED)
**Backend branch:** main (Phases 1–11 committed, unit tests only)

---

## Current Status Summary

| Layer | Built | Backend Tested | Frontend Tested | Production Ready |
|-------|-------|----------------|-----------------|-----------------|
| Auth (Login/JWT) | ✅ | ⚠️ Manual only | ⚠️ Manual only | ❌ |
| Locations | ✅ | ⚠️ Manual only | ⚠️ Manual only | ❌ |
| Operators | ✅ | ⚠️ Manual only | ⚠️ Manual only | ❌ |
| Cabinets | ✅ | ⚠️ Manual only | ⚠️ Manual only | ❌ |
| Assets | ✅ | ⚠️ Manual only | ⚠️ Manual only | ❌ |
| Asset Groups | ✅ | ⚠️ Manual only | ⚠️ Manual only | ❌ |
| Time Constraints | ✅ | ⚠️ Manual only | ⚠️ Manual only | ❌ |
| Cabinet Users | ✅ | ⚠️ Manual only | ⚠️ Manual only | ❌ |
| Transactions (read) | ✅ | ⚠️ Manual only | ⚠️ Manual only | ❌ |
| Transactions (write) | ❌ Backend missing | ❌ | ❌ | ❌ |
| Seed / Master Data | ❌ Only superadmin | ❌ | ❌ | ❌ |
| ABAC Policies | ✅ (16 seed) | ⚠️ Unit tests only | ❌ | ❌ |
| Cabinet Matrix | ✅ | ❌ | ❌ | ❌ |
| Cabinet User Sync | ✅ | ❌ | ❌ | ❌ |
| Biometric Templates | ✅ | ❌ | ❌ (not built) | ❌ |
| Policy Admin UI | ✅ backend | ❌ | ❌ (not built) | ❌ |
| Hardware Endpoints | ✅ backend | ❌ | N/A | ❌ |

Legend: ✅ Done | ⚠️ Partial | ❌ Not done/tested

---

## Critical Prerequisites (Do These First)

### P1 — Backend: Verify application starts cleanly
- [ ] DB schema validates (Flyway V1–V10 applied)
- [ ] Application starts without errors on localhost:8080
- [ ] GET /api/v1/auth/login returns 200 with superadmin/Admin@123
- [ ] Swagger UI accessible at /swagger-ui.html (requires springdoc dependency)

### P2 — Backend: Seed data for testing
- [ ] Create V11__dev_seed_data.sql (or DataLoader @Component)
- [ ] Locations (3–5 sample locations)
- [ ] Operators (one per type: Super Admin, DB Admin, All-Loc Admin, Loc Admin, Loc Operator)
- [ ] Cabinets (2–3 per location)
- [ ] Assets (5–10 per location, various types)
- [ ] Asset Groups (2–3 per location with assets assigned)
- [ ] Time Constraints (weekly schedule + fixed range examples)
- [ ] Cabinet Users (5–10 per location, various types)
- [ ] User-Asset assignments
- [ ] User-Group assignments
- [ ] User-TimeConstraint assignments
- [ ] Sample transactions (some returned, some overdue, some active)

### P3 — Backend: Missing endpoints
- [ ] POST /api/v1/transactions/assets — manual issuance recording
- [ ] POST /api/v1/transactions/assets/{autoNo}/return — manual return recording
  (Currently these are hardware-only; UI has forms but no backend endpoints)

---

## Module-by-Module Status

### M01 — Authentication
**Backend:** AuthController — login, refresh, logout, /me
**Frontend:** LoginPage, authSlice, baseQuery reauth, ProtectedRoute
**Status:** ⚠️ Built, not fully tested
**Test Checklist:**
- [ ] Login with valid credentials → redirect to dashboard
- [ ] Login with invalid credentials → show error
- [ ] Token auto-refresh on 401
- [ ] Logout clears tokens
- [ ] Protected routes redirect to /login when unauthenticated
- [ ] /me populates operator info in header

---

### M02 — Locations
**Backend:** LocationController, LocationOperatorController
**Frontend:** LocationsPage (CRUD + operators panel)
**ABAC:** LOCATION:CREATE/READ/UPDATE/DELETE/ASSIGN
**Status:** ⚠️ Built, not fully tested
**Test Checklist:**
- [ ] List locations (paginated)
- [ ] Create location → success toast → appears in list
- [ ] Edit location → updates in list
- [ ] Disable location → status badge changes
- [ ] Restore disabled location
- [ ] Assign operator to location → appears in operators panel
- [ ] Remove operator from location
- [ ] PermissionGate hides buttons for lower-clearance operators
- [ ] Empty state shown when no locations exist
- [ ] Validation: required fields, max lengths

---

### M03 — Operators
**Backend:** OperatorController
**Frontend:** OperatorsPage (CRUD + locations panel + change password)
**ABAC:** OPERATOR:CREATE/READ/UPDATE/DELETE/RESTORE
**Status:** ⚠️ Built, not fully tested
**Test Checklist:**
- [ ] List operators (paginated)
- [ ] Create operator of each type
- [ ] Edit operator details
- [ ] Change password (own + admin changing others)
- [ ] Disable / Restore operator
- [ ] View assigned locations (read-only panel)
- [ ] PermissionGate: lower operators cannot create Super Admins
- [ ] Validation: duplicate operatorId → 409 error shown

---

### M04 — Cabinets
**Backend:** CabinetController, CabinetMatrixController
**Frontend:** CabinetsPage (CRUD) + CabinetDetailPage (matrix)
**ABAC:** CABINET:CREATE/READ/UPDATE/DELETE/RESTORE
**Status:** ⚠️ Built, not fully tested
**Test Checklist:**
- [ ] List cabinets (paginated, show/hide disabled)
- [ ] Create cabinet with all required fields
- [ ] Edit cabinet
- [ ] Disable / Restore cabinet
- [ ] Sync status badge displays correctly (0=Pending, 1=Synced, 2=Out of Sync, 3=Error)
- [ ] Registered badge displays correctly (0=Unregistered, 1=Registered)
- [ ] Matrix page shows slot grid
- [ ] Empty slots vs occupied slots display correctly
- [ ] Matrix status: 0=empty, 1=in cabinet, 2=checked out

---

### M05 — Assets
**Backend:** AssetController
**Frontend:** AssetsPage (CRUD + location filter + history modal) + AssetDetailPage
**ABAC:** ASSET:CREATE/READ/UPDATE/DELETE/RESTORE
**Status:** ⚠️ Built, not fully tested
**Test Checklist:**
- [ ] List assets (paginated)
- [ ] Filter by location → shows only that location's assets
- [ ] Create asset with all fields (type, number, withdraw policy)
- [ ] Edit asset
- [ ] Disable / Restore asset
- [ ] Asset detail page (/assets/:id) shows full info
- [ ] Active checkout card shows when asset is currently out
- [ ] Transaction history tab on detail page
- [ ] ASSET_TYPES enum displays correctly (1=Key, 2=Key Bunch, 3=Card, 4=Token, 5=DRD)

---

### M06 — Asset Groups
**Backend:** AssetGroupController, AssetGroupAssetController
**Frontend:** AssetGroupsPage (CRUD + asset assignment panel)
**ABAC:** ASSET_GROUP:CREATE/READ/UPDATE/DELETE/ASSIGN
**Status:** ⚠️ Built, not fully tested
**Test Checklist:**
- [ ] List groups
- [ ] Create group → assign assets → asset count badge updates
- [ ] Remove asset from group
- [ ] Disable group
- [ ] Location filter on asset assignment (only shows location assets)

---

### M07 — Time Constraints
**Backend:** TimeConstraintController
**Frontend:** TimeConstraintsPage (CRUD with time window details)
**ABAC:** TIME_CONSTRAINT:CREATE/READ/UPDATE/DELETE
**Status:** ⚠️ Built, not fully tested
**Test Checklist:**
- [ ] Create Weekly Schedule constraint with multiple day/time windows
- [ ] Create Fixed Range constraint with from/to dates
- [ ] Edit constraint
- [ ] Disable constraint
- [ ] Day badges display correctly in list
- [ ] Type 0 = Fixed Range (show date fields), Type 1 = Weekly Schedule

---

### M08 — Cabinet Users
**Backend:** CabinetUserController + 5 assignment controllers
**Frontend:** CabinetUsersPage (CRUD + 6-tab manage modal)
**ABAC:** CABINET_USER:CREATE/READ/UPDATE/DELETE/ASSIGN/RESTORE
**Status:** ⚠️ Built, not fully tested
**Test Checklist:**
- [ ] Search filter (name/ID) works client-side
- [ ] Create cabinet user
- [ ] Manage modal — Details tab: edit user info
- [ ] Manage modal — Locations tab: assign/remove locations
- [ ] Manage modal — Assets tab: assign/remove individual assets
- [ ] Manage modal — Groups tab: assign/remove asset groups
- [ ] Manage modal — Time Constraints tab: assign/remove constraints
- [ ] Manage modal — Transactions tab: shows user's history
- [ ] Disable / Restore user
- [ ] Badge counts in tabs update after assign/remove

---

### M09 — Transactions
**Backend:** TransactionController (14 read endpoints)
**Frontend:** TransactionsPage (all, out, overdue tabs + date filter + issuance form)
**ABAC:** TRANSACTION:READ/CREATE/UPDATE
**Status:** ⚠️ Built — BLOCKED (write endpoints missing in backend)
**Blocked by:** M09.B1 — No POST /api/v1/transactions/assets endpoint exists
**Test Checklist:**
- [ ] All tab: lists all transactions paginated
- [ ] Out Now tab: lists currently checked-out assets
- [ ] Overdue tab: lists overdue assets (highlighted in red)
- [ ] Date range filter on All tab
- [ ] Record Issuance form → POST to backend ❌ BLOCKED
- [ ] Record Return form → PUT to backend ❌ BLOCKED (check endpoint exists)
- [ ] Overdue badge styling correct

---

### M10 — Dashboard
**Backend:** uses existing read endpoints
**Frontend:** DashboardPage (stats cards, overdue table, assets-out table, recent activity)
**Status:** ⚠️ Built, not fully tested
**Test Checklist:**
- [ ] Stats cards show correct counts
- [ ] Quick actions navigate correctly (SPA, not full page reload)
- [ ] Overdue assets table shows up to 5
- [ ] Assets out table shows up to 5
- [ ] Recent activity shows last 8 transactions
- [ ] All links use <Link> not <a href>

---

## Blocked Items

| ID | Module | Blocker | Action Required |
|----|--------|---------|-----------------|
| B1 | Transactions (write) | No POST /transactions/assets endpoint | Implement in backend |
| B2 | Seed data | Only superadmin exists | Create V11 seed data migration |
| B3 | ABAC testing | No seed test data | Depends on B2 |
| B4 | Cabinet sync UI | Not built | Depends on cabinet user testing first |
| B5 | Biometric UI | Not built | Low priority, complex |
| B6 | Policy Admin UI | Not built | After core modules stable |

---

## Git Branch Plan

| Branch | Purpose | Status |
|--------|---------|--------|
| master | Current code (Sprints 1–6) | ⚠️ Untested |
| feature/seed-data | Backend seed data + transaction write endpoints | ❌ Not started |
| feature/auth-testing | Auth flow verification and fixes | ❌ Not started |
| feature/module-locations | Location module fixes post-testing | ❌ Not started |
| feature/module-operators | Operator module fixes post-testing | ❌ Not started |
| (future branches as modules are tested) | | |

---

## Testing Order (Recommended)

1. **P1** — Verify backend starts, DB migrations applied
2. **P2** — Create and apply seed data
3. **M01** — Auth (login/logout/refresh/PermissionGate)
4. **M02** — Locations (simplest CRUD, no dependencies)
5. **M03** — Operators (depends on locations for assignment)
6. **M04** — Cabinets (depends on locations)
7. **M05** — Assets (depends on locations + cabinets)
8. **M06** — Asset Groups (depends on locations + assets)
9. **M07** — Time Constraints (depends on locations)
10. **M08** — Cabinet Users (depends on all above)
11. **M09** — Transactions (blocked on B1 — backend write endpoints)
12. **M10** — Dashboard (all above complete)

---

## Change Log

| Date | What Changed | By |
|------|--------------|----|
| 2026-05-07 | Sprints 1–6: full frontend built (untested) | Claude Code |
| 2026-05-07 | PROGRESS.md + CLAUDE.md created | Claude Code |
| (future) | Seed data added | |
| (future) | Module testing and fixes | |

---

*Update this file after every testing session. Mark checkboxes as tests pass/fail. Note any bugs found in the Change Log.*
