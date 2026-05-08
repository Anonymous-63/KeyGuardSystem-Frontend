# KeyGuard System — Full Project Progress

**Last updated:** 2026-05-08 (Sprint 2 confirmed complete; config organized; docs synced)
**Frontend branch:** `feature/api-contract-fixes` (API contract fixes + DaisyUI/vite tweak committed)
**Backend branch:** `feature/seed-data` (Sprint 2 + config/testdata committed; V12 NOT YET APPLIED to DB)

---

## Resume Command (Next Session)

Tell Claude: **"Resume KeyGuard — Phase B: start backend with dev profile, apply seed data, test M01 Auth"**

### Steps before testing:
1. Start backend (dev profile — uses simple cache, no Redis):
   ```
   cd "D:\Projects\AI KMS\KeyGuardSystem-Backend"
   mvn spring-boot:run -Dspring-boot.run.profiles=dev
   ```
2. Apply V12 seed data in MySQL Workbench:
   Open and run: `D:\Projects\AI KMS\KeyGuardSystem-Backend\src\main\resources\schema\V12__dev_seed_data.sql`
   against `keyguard_db`
   Verify: `SELECT id FROM operator;` → 7 rows
   Verify: `SELECT COUNT(*) FROM asset_transactions;` → 9 rows
3. Start frontend:
   ```
   cd "D:\Projects\AI KMS\KeyGuardSystem-Frontend"
   npm run dev
   ```
4. Open http://localhost:5173 and login with `superadmin / Admin@123`

---

## Current Status Summary

| Layer | Built | API Contract | Seed Data | Tested | Production Ready |
|-------|-------|-------------|-----------|--------|-----------------|
| Auth (Login/JWT) | ✅ | ✅ Fixed | ✅ V12 | ❌ | ❌ |
| Locations | ✅ | ✅ Fixed | ✅ V12 | ❌ | ❌ |
| Operators | ✅ | ✅ Fixed | ✅ V12 | ❌ | ❌ |
| Cabinets | ✅ | ✅ | ✅ V12 | ❌ | ❌ |
| Assets | ✅ | ✅ | ✅ V12 | ❌ | ❌ |
| Asset Groups | ✅ | ✅ | ✅ V12 | ❌ | ❌ |
| Time Constraints | ✅ | ✅ Fixed | ✅ V12 | ❌ | ❌ |
| Cabinet Users | ✅ | ✅ Fixed | ✅ V12 | ❌ | ❌ |
| Transactions (read) | ✅ | ✅ | ✅ V12 | ❌ | ❌ |
| Transactions (write) | ✅ BE done | ✅ | ✅ V12 | ❌ | ❌ |
| Dashboard | ✅ | ✅ | depends | ❌ | ❌ |
| ABAC Policies | ✅ (16 seed) | N/A | ✅ V4 | ⚠️ Unit tests | ❌ |
| Cabinet Matrix | ✅ | ✅ | ✅ V12 | ❌ | ❌ |
| Cabinet Asset Sync | ✅ BE only | N/A | N/A | ❌ (FE not built) | ❌ |
| Biometric UI | ❌ FE not built | N/A | N/A | ❌ | ❌ |
| Policy Admin UI | ❌ FE not built | N/A | N/A | ❌ | ❌ |

Legend: ✅ Done | ⚠️ Partial | ❌ Not done/tested

---

## Git State

### Frontend (`D:\Projects\AI KMS\KeyGuardSystem-Frontend`)

| Branch | Commits | State |
|--------|---------|-------|
| `master` | Sprints 1–6 | Built, untested, API mismatches (old) |
| `feature/api-contract-fixes` | API fixes + DaisyUI/vite tweaks | **Current working branch** — 0 TS errors, ready to test |

Latest commit: `8eed7d2` — "chore: vite --host flag and DaisyUI v5 import fix"

### Backend (`D:\Projects\AI KMS\KeyGuardSystem-Backend`)

| Branch | Commits | State |
|--------|---------|-------|
| `main` | Phases 1–11 + Sprint 1 fixes | Older; Sprint 2 not merged yet |
| `feature/seed-data` | Sprint 2 + V12 seed + config | **Current working branch** — ready to start |

Latest commit: `42aa542` — "chore: organize env config, add Redis serializer, comprehensive test data"

---

## Critical Prerequisites

### P1 — Backend: Start with dev profile ❌ NOT DONE
- [ ] Start: `mvn spring-boot:run -Dspring-boot.run.profiles=dev`
- [ ] Flyway V1–V12 auto-applied on start (creates all tables + V11 indexes + V12 seed)
  - Wait: V12 is in `feature/seed-data` but not on `main` — must be on `feature/seed-data` branch
- [ ] Application starts on localhost:8080 without errors
- [ ] `POST /api/v1/auth/login` → 200 with `superadmin/Admin@123`
- [ ] Swagger UI visible at http://localhost:8080/swagger-ui.html

### P2 — Seed data: Apply V12 manually ⚠️ SQL READY, NOT APPLIED
- [x] V12__dev_seed_data.sql created and committed (`feature/seed-data`)
- [ ] Apply to keyguard_db via MySQL Workbench
- [ ] Verify: `SELECT COUNT(*) FROM operator;` → 7 rows (superadmin + 6 seeded)
- [ ] Verify: `SELECT COUNT(*) FROM asset_transactions;` → 9 rows

**V12 seeds:** 4 operators, 5 cabinets, 13 assets, 4 time constraints, 4 asset groups,
8 cabinet users, user assignments, 9 transactions (4 returned, 2 overdue, 3 out)

**Login credentials (all use `Admin@123`):**

| ID | Type |
|----|------|
| superadmin | Super Admin (clearance 5) |
| dbadmin | DB Admin (clearance 4) |
| alladmin | All-Loc Admin (clearance 3) |
| locadmin1 | Location Admin — HQ + Branch (clearance 2) |
| locadmin2 | Location Admin — Warehouse (clearance 2) |
| locop1 | Location Operator — Head Office (clearance 1) |
| locop2 | Location Operator — Branch Office (clearance 1) |

### P3 — Transaction write endpoints ✅ DONE (Sprint 2)
- [x] `POST /api/v1/transactions/assets` — manual issuance (conflict guard: no duplicate open txn)
- [x] `POST /api/v1/transactions/assets/{autoNo}/return` — manual return (conflict guard: already closed)

---

## API Contract Fixes (Done — `feature/api-contract-fixes`)

All mismatches between frontend types and backend DTOs are fixed:

| File | What Changed |
|------|-------------|
| `src/types/api.ts` | LocationRequest/Response: assetType+cabinetType (no address); OperatorRequest/Response: id+emailId; TIME_CONSTRAINT_TYPES: 1-4 (was 0-1); TimeConstraintDetail: startTime+endTime; CabinetUserRequest/Response: removed type/validFrom/validUpto; new LocationAssignmentResponse |
| `cabinetUserApi.ts` | getCabinetUserLocations returns LocationAssignmentResponse[] |
| `LocationsPage.tsx` | assetType+cabinetType dropdowns; table shows both type columns |
| `OperatorsPage.tsx` | email→emailId, operatorId→id |
| `TimeConstraintsPage.tsx` | startTime/endTime; INTERVAL(4) shows date fields |
| `CabinetUsersPage.tsx` | Removed type/validFrom/validUpto from forms; LocationsTab uses LocationAssignmentResponse + validFrom date picker |

---

## Module-by-Module Status

### M01 — Authentication ❌ NOT TESTED
**Backend:** AuthController — login, refresh, logout, /me
**Frontend:** LoginPage, authSlice, baseQuery reauth, ProtectedRoute
**Test Checklist:**
- [ ] Login with valid credentials → redirect to dashboard
- [ ] Login with invalid credentials → show error toast
- [ ] Token auto-refresh on 401
- [ ] Logout clears tokens
- [ ] Protected routes redirect to /login when unauthenticated
- [ ] /me populates operator info in header

---

### M02 — Locations ❌ NOT TESTED
**Backend:** LocationController, LocationOperatorController
**Frontend:** LocationsPage (CRUD + operators panel)
**Test Checklist:**
- [ ] List locations (paginated) — 3 seeded: Head Office, Branch Office, Warehouse
- [ ] Create location → assetType + cabinetType dropdowns work → success toast
- [ ] Edit location → updates in list
- [ ] Disable → status badge changes; Restore → re-enables
- [ ] Assign operator to location → appears in operators panel
- [ ] Remove operator from location
- [ ] PermissionGate hides Add button for locop1 (clearance 1)
- [ ] Empty state shown when no locations
- [ ] Validation: name required, assetType required, cabinetType required

---

### M03 — Operators ❌ NOT TESTED
**Backend:** OperatorController
**Frontend:** OperatorsPage (CRUD + locations panel + change password)
**Test Checklist:**
- [ ] List 7 seeded operators
- [ ] Create operator of each type (1–5)
- [ ] Edit operator (emailId, name, etc.)
- [ ] Change password (self + admin overriding others)
- [ ] Disable / Restore operator
- [ ] View assigned locations panel (read-only)
- [ ] PermissionGate: locop1 cannot see Add button
- [ ] Duplicate operatorId → 409 error shown in toast

---

### M04 — Cabinets ❌ NOT TESTED
**Backend:** CabinetController, CabinetMatrixController
**Frontend:** CabinetsPage (CRUD) + CabinetDetailPage (matrix)
**Test Checklist:**
- [ ] List 5 seeded cabinets (2 HQ, 2 Branch, 1 WH)
- [ ] Create cabinet with MAC, IP, subnet, gateway fields
- [ ] Edit cabinet; Disable / Restore
- [ ] Sync status badge: 0=Pending, 1=Synced, 2=Out of Sync, 3=Error
- [ ] Registered badge: 0=Unregistered, 1=Registered
- [ ] Matrix page → slot grid loads
- [ ] Empty vs occupied vs checked-out slots display correctly

---

### M05 — Assets ❌ NOT TESTED
**Backend:** AssetController
**Frontend:** AssetsPage (CRUD + location filter) + AssetDetailPage
**Test Checklist:**
- [ ] List 13 seeded assets
- [ ] Filter by location → shows only that location's assets
- [ ] Create asset (type, number, tagUid, withdraw policy)
- [ ] Edit asset; Disable / Restore
- [ ] Asset detail page shows full info
- [ ] Active checkout card shows when asset is currently out (3 assets out per V12)
- [ ] Transaction history tab on detail page
- [ ] ASSET_TYPES: 1=Key, 2=Key Bunch, 3=Locker, 4=TLD, 5=DRD

---

### M06 — Asset Groups ❌ NOT TESTED
**Backend:** AssetGroupController, AssetGroupAssetController
**Frontend:** AssetGroupsPage (CRUD + asset assignment panel)
**Test Checklist:**
- [ ] List 4 seeded groups
- [ ] Create group → assign assets → asset count badge updates
- [ ] Remove asset from group
- [ ] Disable group
- [ ] Location filter on asset assignment panel

---

### M07 — Time Constraints ❌ NOT TESTED
**Backend:** TimeConstraintController
**Frontend:** TimeConstraintsPage (CRUD with time window details)
**Note:** Backend enum 1=DAILY, 2=WEEKLY, 3=MONTHLY, 4=INTERVAL (frontend now matches)
**Test Checklist:**
- [ ] List 4 seeded constraints (all WEEKLY type=2)
- [ ] Create WEEKLY constraint with Mon–Fri 09:00–18:00 time windows (startTime/endTime)
- [ ] Create INTERVAL constraint (type=4) → from/to date fields appear
- [ ] Edit constraint; Disable constraint
- [ ] Day badges display in list row
- [ ] Time window rows show correct startTime/endTime values

---

### M08 — Cabinet Users ❌ NOT TESTED
**Backend:** CabinetUserController + 5 assignment controllers
**Frontend:** CabinetUsersPage (CRUD + 6-tab manage modal)
**Test Checklist:**
- [ ] Search filter (name/ID) — client-side, instant
- [ ] List 8 seeded users (EMP001–EMP008)
- [ ] Create cabinet user (id + name required; no type field — type is per-location)
- [ ] Manage → Details tab: edit user info (emailId not email)
- [ ] Manage → Locations tab: assign with validFrom date; assigned list shows validFrom/validUpto/type
- [ ] Manage → Assets tab: pick location → pick asset → assign
- [ ] Manage → Groups tab: pick location → pick group → assign
- [ ] Manage → Time Constraints tab: pick location → pick constraint → assign
- [ ] Manage → Transactions tab: shows user transaction history
- [ ] Disable / Restore user

---

### M09 — Transactions ❌ NOT TESTED (read + write)
**Backend:** TransactionController (14 read + 2 write endpoints) ✅ Complete
**Frontend:** TransactionsPage (all/out/overdue tabs + date filter + issuance form)
**Test Checklist:**
- [ ] All tab: 9 seeded transactions paginated
- [ ] Out Now tab: 3 assets currently out
- [ ] Overdue tab: 2 overdue assets (highlighted red)
- [ ] Date range filter on All tab
- [ ] Record Issuance form → POST /transactions/assets → new row appears
- [ ] Record Return form → POST /transactions/assets/{autoNo}/return → row shows returnedAt

---

### M10 — Dashboard ❌ NOT TESTED
**Backend:** uses existing read endpoints
**Frontend:** DashboardPage (stats cards, overdue table, assets-out table, recent activity)
**Test Checklist:**
- [ ] Stats cards show correct counts
- [ ] Quick action links are SPA navigation (not full page reload)
- [ ] Overdue table shows up to 5 assets (2 overdue in seed)
- [ ] Assets out table shows up to 5 (3 out in seed)
- [ ] Recent activity shows last 8 transactions

---

## Blocked Items

| ID | Module | Blocker | Status |
|----|--------|---------|--------|
| B1 | Transactions (write) | ~~No POST /transactions/assets~~ | ✅ Unblocked — Sprint 2 |
| B2 | Seed data application | V12 SQL ready; needs DB apply | ⚠️ Manual step required |
| B3 | All modules testing | Backend not yet started | ❌ Open |
| B4 | Cabinet sync UI | Not built yet | ❌ Low priority |
| B5 | Biometric UI | Not built yet | ❌ Low priority |
| B6 | Policy Admin UI | Not built yet | ❌ Low priority |

---

## Change Log

| Date | What Changed | Branch |
|------|--------------|--------|
| 2026-05-08 | AUDIT.md + PROGRESS.md synced to reflect Sprint 2 done | — |
| 2026-05-08 | Backend: env config organized (application.yml env vars, application-dev.yml) | feature/seed-data |
| 2026-05-08 | Backend: RedisConfig.java + V13/V14 test data committed | feature/seed-data |
| 2026-05-08 | Backend: BCrypt hash updated in V2 + V12 (same password, regenerated) | feature/seed-data |
| 2026-05-08 | Frontend: vite --host + DaisyUI v5 import fix committed | feature/api-contract-fixes |
| 2026-05-07 | Sprint 2: cabinetassetsync, assettimeconstraints, transaction writes, springdoc, hardening | feature/seed-data |
| 2026-05-07 | V12__dev_seed_data.sql committed | feature/seed-data |
| 2026-05-07 | Sprints 1–6: full frontend built (M01–M10 + dashboard) | master |
| 2026-05-07 | API contract fixes: types/api.ts, cabinetUserApi, 4 pages | feature/api-contract-fixes |

---

*Mark checkboxes as tests pass. Note bugs in Change Log. Never mark a module tested until every checkbox is checked.*
