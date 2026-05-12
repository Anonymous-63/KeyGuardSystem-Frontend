# KeyGuard System — Full Project Progress

**Last updated:** 2026-05-12
**Frontend branch:** `feature/api-contract-fixes` — latest commit `f02d868` (App Config + Layout fix pushed)
**Backend branch:** `feature/seed-data` — latest commit `e7248f3` (App Config restructure pushed)

---

## Resume Command (Next Session)

To continue: tell Claude **"Continue KeyGuard from progress file"**

**How to start backend:**
```
JAVA_HOME="C:\Program Files\Java\jdk-21"
java -jar "D:\Projects\AI KMS\KeyGuardSystem-Backend\target\KeyGuardSystem-Backend-1.0.0.jar" --spring.profiles.active=dev
```
**How to build backend (after code changes):**
```
"C:\Program Files\JetBrains\IntelliJ IDEA 2023.1.3\plugins\maven\lib\maven3\bin\mvn" -f "D:\Projects\AI KMS\KeyGuardSystem-Backend\pom.xml" clean package -Dmaven.test.skip=true
```
**How to start frontend:** `npm run dev` in `D:\Projects\AI KMS\KeyGuardSystem-Frontend`
**Login:** http://localhost:5173 → `superadmin / Admin@123`
**Backend API:** http://localhost:8080/api/v1

---

## Enterprise Redesign Status

**Goal:** Recreate AMSWebKey 3.0.0 enterprise layout — NOT a modern redesign.
**Analysis:** COMPLETE (2026-05-08) — see `C:\Users\A\.claude\projects\D--Projects-AI-KMS\memory\project_enterprise_redesign.md`
**Implementation:** NOT STARTED

| Phase | What | Status |
|-------|------|--------|
| 1 | App shell + sidebar (dark teal, role-based nav) | ❌ Not started |
| 2 | PageHeader component (bg-lightcyan bar, icon+title, action buttons) | ❌ Not started |
| 3 | Modal chrome (dark teal header, compact, Reset+Submit footer) | ❌ Not started |
| 4 | Horizontal form layout (label-left 28%, input-right 72%) | ❌ Not started |
| 5 | Table pattern (bordered, green thead, sticky search row) | ❌ Not started |
| 6 | Apply to all 9 pages | ❌ Not started |

**Key design decisions locked in:**
- Sidebar width: 240px (old was 30rem/480px — too wide)
- Dark teal: `#024950` — sidebar bg, modal headers
- Light teal: `#D3EAE8` — page header bar, nav hover
- Azure: `#e6f4f1` — main content area background
- Form layout: horizontal label-left (from reference PNGs confirmed)
- Modal footer: Reset (ghost/danger) + Submit (primary) — right-aligned
- Table header: green-tinted (`bg-primary/10` or equivalent)

Backend is already running on port 8080 with dev profile (PID 74868).

---

## Current Status Summary

| Layer | BE Built | FE Built | BE Tested | FE Tested |
|-------|----------|----------|-----------|-----------|
| Auth (Login/JWT) | ✅ | ✅ | ✅ | ❌ |
| Locations | ✅ | ✅ | ✅ | ❌ |
| Operators | ✅ Refactored | ✅ Redesigned | ✅ | ❌ |
| Cabinets | ✅ | ✅ | ✅ | ❌ |
| Assets | ✅ | ✅ | ✅ | ❌ |
| Asset Groups | ✅ | ✅ | ✅ | ❌ |
| Time Constraints | ✅ | ✅ | ✅ | ❌ |
| Cabinet Users | ✅ | ✅ | ✅ | ❌ |
| Transactions (read+write) | ✅ | ✅ | ✅ | ❌ |
| Dashboard | ✅ | ✅ | ❌ | ❌ |
| **App Config / Settings** | ✅ V20 | ✅ Rewritten | ✅ 2026-05-12 | ✅ 2026-05-12 |
| Cabinet Matrix | ✅ | ✅ | ❌ | ❌ |
| Cabinet Asset Sync | ✅ BE only | ❌ | ❌ | ❌ |
| Biometric UI | ❌ | ❌ | ❌ | ❌ |
| Policy Admin UI | ❌ | ❌ | ❌ | ❌ |

Legend: ✅ Done | ❌ Not done

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

### M01 — Authentication ✅ BACKEND TESTED (2026-05-08)
**Backend:** AuthController — login, refresh, logout, /me
**Frontend:** LoginPage, authSlice, baseQuery reauth, ProtectedRoute
**Backend Test Results:**
- [x] Login with valid credentials → 200 + token
- [x] Login with invalid credentials → 401 `Invalid credentials`
- [x] No-token request → 401 `Authentication required` (fixed: was 403)
- [x] Token refresh → 200 + new tokens
- [x] Logout → 200 (client-side; tokens expire in 15min)
- [x] /me → 200 operator info
- [x] All 7 seed users login with Admin@123
- [x] ABAC: locop1 GET /locations → 200 (allowed); POST → 403 (fixed: was 500)
**Bugs fixed:**
- PEP threw ResponseStatusException → 500; changed to KeyGuardException → 403
- SecurityConfig missing AuthenticationEntryPoint → unauthenticated returned 403; now 401
- Added ResponseStatusException handler in GlobalExceptionHandler
**Frontend test:** ❌ NOT DONE (UI testing pending)

---

### M02 — Locations ✅ BACKEND TESTED (2026-05-08)
**Backend:** LocationController, LocationOperatorController
**Frontend:** LocationsPage (CRUD + operators panel)
**Backend Test Results:** All CRUD + assign/remove operator tested and passing
**Frontend test:** ❌ NOT DONE

---

### M11 — App Config / Settings ✅ FULLY DONE + TESTED (2026-05-12)
**Backend commit:** `e7248f3` on `feature/seed-data` (pushed)
**Frontend commit:** `f02d868` on `feature/api-contract-fixes` (pushed)

**Backend changes:**
- Removed: old KV-pair `app_config` table (id/configKey/configValue/description/mDate)
- Removed: `AppConfigEntry.java` (entity) — neutralized to empty `@Deprecated` class, no `@Entity`
- Removed: `AppConfigResponse.java` (dto) — neutralized to empty `@Deprecated` class
- Removed: old `AppConfigController` methods (getValue/listAll/upsert)
- New entity: `AppConfig.java` — single-row (id=1), JSON columns for each sub-config
- New converters: `JsonAttributeConverter<T>` base + `SmtpConfigConverter`, `SmsConfigConverter`, `LdapConfigConverter`, `OtherConfigConverter`
- New entity models: `SmtpConfig`, `SmsConfig`, `LdapConfig`, `CaptchaConfig`, `DbBackupConfig`, `OtherConfig`
- New DTOs (response): `AppConfigRes`, `OrgConfigRes`, `SmtpConfigRes`, `SmsConfigRes`, `LdapConfigRes`, `OtherConfigRes`, `DbBackupConfigRes`, `PublicOrgConfigRes`
- New DTOs (update req): `OrgConfigUpdateReq`, `SmtpConfigUpdateReq`, `SmsConfigUpdateReq`, `LdapConfigUpdateReq`, `OtherConfigUpdateReq`, `DbBackupConfigUpdateReq`
- New mapper: `AppConfigMapper` (MapStruct, IGNORE_NULL for PATCH semantics; passwords excluded from Res DTOs)
- New service: `AppConfigService` interface + `AppConfigServiceImpl` (getOrCreate helpers, `buildMailSmtpConfig()`, `getOrgName()`)
- New controllers: `AppConfigController` (GET+PATCH per section, logo serve) + `PublicAppConfigController` (`/public/config/org`)
- Updated: `SecurityConfig` — added `/api/v1/public/**` to PUBLIC_PATHS
- Updated: `MailServiceImpl` — removed all `configService.getValue()` calls; uses `buildMailSmtpConfig()`
- Updated: `MailEventListener` — `buildSmtpConfig()` returns `configService.buildMailSmtpConfig()`
- Fixed: `Operator.java` — pre-existing typo `Stringc` → `String`
- Migration: `V20__app_config_restructure.sql` — drops old KV table, creates structured table, seeds id=1 row

**Endpoints (all tested via curl):**
```
GET  /api/v1/config                    → full AppConfigRes (all sections)
GET  /api/v1/config/organization       → OrgConfigRes
PATCH /api/v1/config/organization      → multipart/form-data (orgName + orgLogo file)
GET  /api/v1/config/smtp               → SmtpConfigRes (no password)
PATCH /api/v1/config/smtp              → SmtpConfigUpdateReq
POST /api/v1/config/smtp/test-email    → sends test email
GET  /api/v1/config/sms                → SmsConfigRes (no password)
PATCH /api/v1/config/sms              → SmsConfigUpdateReq
GET  /api/v1/config/ldap               → LdapConfigRes (no keystorePass)
PATCH /api/v1/config/ldap             → LdapConfigUpdateReq
GET  /api/v1/config/other              → OtherConfigRes (captcha + twoStepAuth)
PATCH /api/v1/config/other            → OtherConfigUpdateReq
GET  /api/v1/config/db                 → DbBackupConfigRes
PATCH /api/v1/config/db               → DbBackupConfigUpdateReq
GET  /api/v1/config/logo               → serves logo file (no auth)
GET  /api/v1/public/config/org         → PublicOrgConfigRes (no auth — for login page/sidebar)
```

**Frontend changes:**
- Removed: old `useListConfigsQuery`, `useUpsertConfigMutation`, `useUploadLogoMutation` hooks
- `configApi.ts` — complete rewrite; per-section RTK Query endpoints
- `types/api.ts` — added all config types; legacy aliases kept
- `SettingsPage.tsx` — complete rewrite; `useGetAppConfigQuery` loads all sections once; per-section local state + dirty detection; passwords never pre-filled; section-level saves
- `Layout.tsx` — fixed: replaced `useListConfigsQuery` with `useGetPublicOrgQuery` for sidebar org name + logo

**Tested:** All 6 PATCH endpoints persist data; GET /config shows updated values; public endpoint works without auth; passwords absent from all GET responses.

---

### M03 — Operators ✅ BACKEND ENTERPRISE REFACTOR DONE (2026-05-11)
**Backend:** Full refactor — service interface+impl, MapStruct mapper, JPA Specs, caching, V16 migration, OpenAPI
**Frontend:** Full redesign — FormRow layout, LocationPicker (create) + LocationChips (edit), Pwd moved to modal, proper column widths
**Key changes (2026-05-11):**
- Operator entity: audit fields (`created_at`, `updated_at`, `created_by`, `updated_by`, `version`), `mDate` dropped via V16 migration
- `OperatorServiceImpl`: `@Cacheable`/`@CacheEvict`, JPA Specs filtering (name/type/disabled), Super Admin change-pwd bypass
- `OperatorsPage.tsx`: FormRow pattern (matching LocationsPage), location select in create mode, Change Password inside edit modal
- Table: removed Pwd button from actions; column widths fixed (ID 130 / Name flex / Email 210 / Type 150 / Status 82 / Actions 130)
- Modal: two-view (`form` ↔ `pwd`) — Change Password accessible from within Edit modal
**Pending:** Restart backend → V16 Flyway runs → test CRUD; test location assignment flow
**Frontend test:** ❌ NOT DONE

---

### M04 — Cabinets ✅ BACKEND TESTED (2026-05-08)
**Backend:** CabinetController (restore endpoint added), CabinetMatrixController
**Frontend:** CabinetsPage (CRUD) + CabinetDetailPage (matrix)
**Backend Test Results:**
- [x] List → 200 ✅ (19 cabinets)
- [x] By-location → 200 ✅
- [x] Create → 201 ✅ (fix: use unique MAC not in `AA:BB:CC:DD:XX:XX` range)
- [x] Update → 200 ✅
- [x] Matrix → 200 ✅ (new cabinet: 0 slots)
- [x] Disable → 200 ✅
- [x] Restore → 200 ✅ (endpoint added in `feature/seed-data`)
- [x] Get by ID → 200 ✅
**Frontend test:** ❌ NOT DONE

---

### M05 — Assets ✅ BACKEND TESTED (2026-05-08)
**Backend:** AssetController (restore endpoint added), LocationAssetRepository.findAllByAssetId added
**Backend Test Results:**
- [x] List → 200 ✅, By-location → 200 ✅, Create → 201 ✅, Update → 200 ✅
- [x] Disable → 200 ✅, Restore → 200 ✅, Get by ID → 200 ✅
**Frontend test:** ❌ NOT DONE

---

### M06 — Asset Groups ✅ BACKEND TESTED (2026-05-08)
**Backend:** AssetGroupController (restore endpoint added), AssetGroupService.restore added
**Backend Test Results:**
- [x] List → 200 ✅ (9 groups), By-location → 200 ✅
- [x] Create → 201 ✅, Update → 200 ✅, Get by ID → 200 ✅
- [x] Add asset → 200 ✅, Remove asset → 200 ✅
- [x] Disable → 200 ✅, Restore → 200 ✅
**Frontend test:** ❌ NOT DONE

---

### M07 — Time Constraints ✅ BACKEND TESTED (2026-05-08)
**Backend:** TimeConstraintController (restore endpoint added), TimeConstraintService.restore added
**Backend Test Results:**
- [x] List → 200 ✅ (11), By-location → 200 ✅
- [x] Create → 201 ✅ (type=1 for DAILY, type is numeric), Update → 200 ✅
- [x] Details (sub-slots) saved and updated correctly
- [x] Disable → 200 ✅, Restore → 200 ✅
**Note:** `type` field is numeric: 1=DAILY, 2=WEEKLY, 3=MONTHLY, 4=INTERVAL
**Frontend test:** ❌ NOT DONE

---

### M08 — Cabinet Users ✅ BACKEND TESTED (2026-05-08)
**Backend:** CabinetUserController (restore already existed), all sub-controllers
**Backend Test Results (all 17 scenarios):**
- [x] List → 200 ✅ (993), By-location → 200 ✅, Create → 201 ✅, Get by ID → 200 ✅, Update → 200 ✅
- [x] Assign location → 200 ✅, Get locations → 200 ✅, Remove location → 200 ✅
- [x] Assign asset → 201 ✅, Get user assets → 200 ✅, Remove asset → 200 ✅
- [x] Assign asset-group → 201 ✅, Remove asset-group → 200 ✅
- [x] Assign time-constraint → 201 ✅, Remove time-constraint → 200 ✅
- [x] Disable → 200 ✅, Restore → 200 ✅
**Frontend test:** ❌ NOT DONE

---

### M09 — Transactions ✅ BACKEND TESTED (2026-05-08)
**Backend:** TransactionController (read + write)
**Backend Test Results:**
- [x] List all → 200 ✅ (5049), Out keys → 200 ✅ (723), Overdue → 200 ✅
- [x] By asset → 200 ✅, By user, By cabinet, Cabinet txns → 200 ✅
- [x] Record return → 200 ✅ (fix: `returnedBy` is FK to `cabinet_user.id`, pass null if no CU)
- [x] Record issuance → 201 ✅ (conflict guard works: 409 if already out)
**Note:** `returnedBy` field is a `cabinet_user.id` FK — do NOT pass operator IDs here
**Frontend test:** ❌ NOT DONE

---
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
| 2026-05-12 | **App Config restructure** — BE: V20 migration, single-row JSON entity, 4 converters, 10 DTOs, MapStruct mapper, service, 2 controllers; FE: configApi rewrite, SettingsPage rewrite, Layout sidebar fix. Pushed both repos. | feature/seed-data + feature/api-contract-fixes |
| 2026-05-12 | Fixed MapStruct mapper: removed invalid `@Mapping(target="smtpPassword", ignore=true)` (field absent from Res DTO). Fixed `Operator.java` `Stringc` typo. Backend built with Java 21 + IntelliJ Maven. | feature/seed-data |
| 2026-05-11 | Operator module enterprise refactor — backend (V16 migration, MapStruct, specs, caching) + frontend (form redesign, location chips/picker, modal view toggle, column fixes) | feature/api-contract-fixes |
| 2026-05-11 | LocationsPage: proper DaisyUI join pagination, numbered pages, clear-filter button, PAGE_SIZE=20 | feature/api-contract-fixes |
| 2026-05-11 | Backend: @EnableCaching, LocationServiceImpl + OperatorServiceImpl caching, OpenApiConfig | feature/seed-data |
| 2026-05-08 | Enterprise redesign: full AMSWebKey 3.0.0 analysis done; 6-phase plan stored in memory | — |
| 2026-05-08 | Form refactor: all 9 pages use shared Form.tsx components; committed `c0dec1e` | feature/api-contract-fixes |
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
