// ABAC Permission System — single source of truth for frontend permission checks.
// Mirrors the backend V4 seed ABAC policies.
// clearanceLevel = max(1, 6 - operatorType)
// type 1 (Super Admin)      → clearance 5
// type 2 (DB Admin)         → clearance 4
// type 3 (All-Loc Admin)    → clearance 3
// type 4 (Location Admin)   → clearance 2
// type 5 (Location Operator)→ clearance 1

export function clearanceFromType(type: number): number {
  return Math.max(1, 6 - type);
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
  | 'APP_CONFIG';

export type PermissionAction =
  | 'READ'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'RESTORE'
  | 'ASSIGN'
  | 'EXPORT'
  | 'IMPORT';

// Min clearance level required. Absence of a key = action not permitted.
export const PERMISSION_MAP: Record<ResourceType, Partial<Record<PermissionAction, number>>> = {
  LOCATION: {
    READ:    1,
    CREATE:  5,
    UPDATE:  5,
    DELETE:  5,
    RESTORE: 5,
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
    READ:    5,
    UPDATE:  5,
  },
  AUDIT: {
    READ:   4,
    EXPORT: 4,
  },
  APP_CONFIG: {
    READ:   4,
    CREATE: 5,
    UPDATE: 5,
    DELETE: 5,
  },
};

// Returns true if an operator of the given type may perform the action on the resource.
export function hasPermission(
  operatorType: number,
  resource: ResourceType,
  action: PermissionAction,
): boolean {
  const clearance = clearanceFromType(operatorType);
  const required = PERMISSION_MAP[resource]?.[action];
  return required !== undefined && clearance >= required;
}

// Which resources a given operator type can READ (used to filter sidebar nav).
export function accessibleResources(operatorType: number): ResourceType[] {
  return (Object.keys(PERMISSION_MAP) as ResourceType[]).filter(
    (r) => hasPermission(operatorType, r, 'READ'),
  );
}
