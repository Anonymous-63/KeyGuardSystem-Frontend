import { useAppSelector } from '@/app/store/hooks';
import { operatorClearance, hasPermissionByClearance, type ResourceType, type PermissionAction } from '@/features/auth/utils/permissions';

export function usePermission(resource: ResourceType, action: PermissionAction): boolean {
  const operator = useAppSelector((s) => s.auth.operator);
  if (!operator) return false;
  return hasPermissionByClearance(operatorClearance(operator), resource, action);
}

// Returns the operator's clearance level (1–5).
export function useClearance(): number {
  const operator = useAppSelector((s) => s.auth.operator);
  return operatorClearance(operator);
}
