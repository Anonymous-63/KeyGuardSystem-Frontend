import type { OperatorResponse } from '@/shared/types/api';

export type ResourceType =
  | 'LOCATION'
  | 'OPERATOR'
  | 'CABINET'
  | 'ASSET'
  | 'CABINET_USER'
  | 'TRANSACTION'
  | 'ASSET_GROUP'
  | 'TIME_CONSTRAINT'
  | 'AUDIT_TRAIL'
  | 'APP_CONFIG'
  | 'ABAC_POLICY'
  | 'ROLE'
  | 'DASHBOARD'
  | 'MY_PROFILE';

export type PermissionAction =
  | 'READ'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'RESTORE'
  | 'ASSIGN'
  | 'EXPORT'
  | 'IMPORT'
  | 'PERMANENT_DELETE'
  | 'APPROVE'
  | 'REJECT'
  | 'SWITCH_LOCATION'
  | 'RESET_PASSWORD'
  | 'MANAGE_CABINET';

export function operatorClearance(op: Pick<OperatorResponse, 'role'> | null | undefined): number {
  if (!op) return 1;
  return op.role?.permissionLevel ?? 1;
}
