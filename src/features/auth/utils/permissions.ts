// ABAC Permission System — single source of truth for frontend permission checks.
// Mirrors the backend V4 seed ABAC policies.
// Super Admin (clearanceLevel=0) has a FIXED hardcoded access set — not configurable.
// Regular roles: clearanceLevel = role.permissionLevel (1–MAX_ROLES).

import type { OperatorResponse } from '@/shared/types/api';
import { MAX_ROLES, SUPER_ADMIN_LEVEL } from '@/shared/types/api';

export function operatorClearance(op: Pick<OperatorResponse, 'role'> | null | undefined): number {
  if (!op) return 0;
  return op.role?.permissionLevel ?? 1;
}

export type ResourceType =
  | 'LOCATION'
  | 'OPERATOR'
  | 'CABINET'
  | 'ASSET'
  | 'CABINET_USER'
  | 'TRANSACTION'
  | 'ASSET_GROUP'
  | 'TIME_CONSTRAINT'
  | 'BIOMETRIC'
  | 'SYNC'
  | 'SYSTEM'
  | 'AUDIT'
  | 'APP_CONFIG'
  | 'ABAC_POLICY'
  | 'ROLE';

export type PermissionAction =
  | 'READ'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'RESTORE'
  | 'ASSIGN'
  | 'EXPORT'
  | 'IMPORT';

// Super Admin (level 0) fixed access — hardcoded, not driven by PERMISSION_MAP.
// Matches DefaultPolicyEngine.SUPER_ADMIN_RESOURCES in the backend.
const SUPER_ADMIN_RESOURCES = new Set<ResourceType>([
  'LOCATION', 'OPERATOR', 'ROLE', 'ABAC_POLICY', 'APP_CONFIG', 'SYSTEM', 'AUDIT',
]);

// Threshold that no regular role (max level = MAX_ROLES) can ever satisfy.
// Used for actions that are Super Admin-only — enforced by backend; frontend uses this
// to ensure no regular operator sees those action buttons.
const SUPER_ONLY = MAX_ROLES + 1;

// Min clearance level required. Absence of a key = action not permitted.
export const PERMISSION_MAP: Record<ResourceType, Partial<Record<PermissionAction, number>>> = {
  LOCATION: {
    READ:    1,
    CREATE:  SUPER_ONLY,
    UPDATE:  SUPER_ONLY,
    DELETE:  SUPER_ONLY,
    RESTORE: SUPER_ONLY,
    ASSIGN:  2,
    EXPORT:  2,
  },
  OPERATOR: {
    READ:    2,
    CREATE:  4,
    UPDATE:  2,
    DELETE:  4,
    RESTORE: 4,
    EXPORT:  4,
  },
  CABINET: {
    READ:    1,
    CREATE:  3,
    UPDATE:  3,
    DELETE:  3,
    RESTORE: 3,
    EXPORT:  2,
  },
  ASSET: {
    READ:    1,
    CREATE:  2,
    UPDATE:  2,
    DELETE:  2,
    RESTORE: 2,
    EXPORT:  1,
    IMPORT:  3,
  },
  CABINET_USER: {
    READ:    1,
    CREATE:  2,
    UPDATE:  2,
    DELETE:  2,
    RESTORE: 2,
    ASSIGN:  2,
    EXPORT:  1,
    IMPORT:  3,
  },
  TRANSACTION: {
    READ:    1,
    CREATE:  1,
    UPDATE:  1,
    EXPORT:  1,
  },
  ASSET_GROUP: {
    READ:    1,
    CREATE:  2,
    UPDATE:  2,
    DELETE:  2,
    RESTORE: 2,
    ASSIGN:  2,
  },
  TIME_CONSTRAINT: {
    READ:    1,
    CREATE:  2,
    UPDATE:  2,
    DELETE:  2,
    RESTORE: 2,
  },
  BIOMETRIC: {
    READ:    2,
    CREATE:  2,
    UPDATE:  2,
    DELETE:  2,
  },
  SYNC: {
    READ:    2,
    UPDATE:  3,
  },
  SYSTEM: {
    READ:    SUPER_ONLY,
    UPDATE:  SUPER_ONLY,
  },
  AUDIT: {
    READ:   4,
    EXPORT: 4,
  },
  APP_CONFIG: {
    READ:   4,
    CREATE: SUPER_ONLY,
    UPDATE: SUPER_ONLY,
    DELETE: SUPER_ONLY,
  },
  ABAC_POLICY: {
    READ:   4,
    CREATE: SUPER_ONLY,
    UPDATE: SUPER_ONLY,
    DELETE: SUPER_ONLY,
  },
  ROLE: {
    READ:   SUPER_ONLY,
    CREATE: SUPER_ONLY,
    UPDATE: SUPER_ONLY,
    DELETE: SUPER_ONLY,
  },
};

// Primary permission check — takes clearance level directly.
// Super Admin (level 0) gets access to their fixed resource set; regular operators use PERMISSION_MAP.
export function hasPermissionByClearance(
  clearance: number,
  resource: ResourceType,
  action: PermissionAction,
): boolean {
  if (clearance === SUPER_ADMIN_LEVEL) return SUPER_ADMIN_RESOURCES.has(resource);
  const required = PERMISSION_MAP[resource]?.[action];
  return required !== undefined && clearance >= required;
}

// Which resources an operator can READ (used to filter sidebar nav).
export function accessibleResources(op: Pick<OperatorResponse, 'type' | 'role'> | null | undefined): ResourceType[] {
  const clearance = operatorClearance(op);
  if (clearance === SUPER_ADMIN_LEVEL) return Array.from(SUPER_ADMIN_RESOURCES);
  return (Object.keys(PERMISSION_MAP) as ResourceType[]).filter(
    (r) => hasPermissionByClearance(clearance, r, 'READ'),
  );
}
