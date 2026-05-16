import { usePermissions } from '@/features/abac/hooks/usePermissions';
import type { ResourceType, PermissionAction } from '@/features/auth/utils/permissions';

export function usePermission(resource: ResourceType, action: PermissionAction): boolean {
  const { canAccess } = usePermissions();
  return canAccess(resource, action);
}
