import { useAppSelector } from '../app/hooks';
import { hasPermission, type ResourceType, type PermissionAction } from '../features/auth/permissions';

export function usePermission(resource: ResourceType, action: PermissionAction): boolean {
  const operator = useAppSelector((s) => s.auth.operator);
  if (!operator) return false;
  return hasPermission(operator.type, resource, action);
}

// Returns the operator's clearance level (1–5).
export function useClearance(): number {
  const operator = useAppSelector((s) => s.auth.operator);
  if (!operator) return 0;
  return Math.max(1, 6 - operator.type);
}
