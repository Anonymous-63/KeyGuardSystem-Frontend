# KeyGuard System Frontend — Development Rules

## Project Context
Migration of AMSWebKey 3.0.0 (legacy JSP/Servlet) to React + Spring Boot.
Frontend: React 19 + TypeScript + Vite + Tailwind v4 + DaisyUI v5 + RTK Query + React Router v7.
Backend: Spring Boot 3.2.5 + MySQL + Flyway + custom ABAC engine.
Old reference: D:\Projects\AI KMS\AMSwebKey_v3.0.0G

---

## Non-Negotiable Rules

### Development Process
1. **No assumptions.** Always check old project behavior or ask before inventing logic.
2. **Incremental only.** One module at a time. Stop after each stable module for user testing.
3. **Do not break working modules.** If a change could affect another page, say so explicitly.
4. **Verify before claiming complete.** TypeScript check + manual test before marking done.
5. **Backend first.** Only build UI for modules with fully tested backend APIs.

### Git Branching
- `main` / `master` — stable, tested, reviewed code only
- `feature/<module-name>` — new module development (e.g., `feature/seed-data`, `feature/transactions-write`)
- Never push unfinished work to master
- Merge to master only after: backend tested + frontend tested + policies verified + regression checked
- Commit messages: imperative, specific (e.g., "add seed data for locations and operators" not "update files")

### Code Quality
- No comments unless the WHY is non-obvious
- No unused imports, dead code, or console.log
- TypeScript strict — 0 errors required before any commit
- No hardcoded IDs, magic numbers, or placeholder values in production code
- Prefer editing existing files over creating new ones

### API Contracts
- All API calls through RTK Query (no direct axios)
- Never hardcode API URLs — use baseQuery from src/api/baseQuery.ts
- Handle all error states: loading, empty, error, success
- Use .unwrap() + try/catch for all mutations
- Toast on every success and error

### UI Standards
- DaisyUI components for all UI primitives
- PermissionGate wrapping all action buttons
- LoadingRow / EmptyState in all tables
- Pagination on all list views
- Responsive: test mobile breakpoints

### Permission Model (ABAC)
- Resources: LOCATION, OPERATOR, CABINET, ASSET, ASSET_GROUP, TIME_CONSTRAINT, CABINET_USER, TRANSACTION, AUDIT_TRAIL, ROLE, ABAC_POLICY, APP_CONFIG, MY_PROFILE
- Actions: READ, CREATE, UPDATE, DELETE, RESTORE, ASSIGN, EXPORT, IMPORT, PERMANENT_DELETE, APPROVE, REJECT, SWITCH_LOCATION, RESET_PASSWORD, MANAGE_CABINET
- permissionLevel: 0 = Super Admin (engine-level bypass, all policies skipped), 1–20 = regular roles (lower = more privileged)
- Permissions resolved from backend via GET /me/permissions — never derive locally from operator state
- Never bypass PermissionGate — access control must match backend ABAC policies exactly

---

## Module Status Reference
Ask the user for current module status before adding features to any module.

---

## Backend Connection
- Base URL: http://localhost:8080/api/v1
- Default credentials: superadmin / Admin@123
- Database: keyguard_db on localhost:3306
- Swagger (when enabled): http://localhost:8080/swagger-ui.html

## Contacts / References
- Old project: D:\Projects\AI KMS\AMSwebKey_v3.0.0G
- Backend: D:\Projects\AI KMS\KeyGuardSystem-Backend
- Backend audit: D:\Projects\AI KMS\KeyGuardSystem-Backend\AUDIT.md
