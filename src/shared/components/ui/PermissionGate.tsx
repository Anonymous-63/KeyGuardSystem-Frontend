import type { ReactNode } from 'react';
import { usePermission } from '@/shared/hooks/usePermission';
import { usePermissions } from '@/features/abac/hooks/usePermissions';
import type { ResourceType, PermissionAction } from '@/features/auth/utils/permissions';

interface Props {
  resource: ResourceType;
  action: PermissionAction;
  children: ReactNode;
  fallback?: ReactNode;
}

export default function PermissionGate({ resource, action, children, fallback = null }: Props) {
  const { isLoading } = usePermissions();
  const allowed = usePermission(resource, action);
  if (isLoading) return null;
  return <>{allowed ? children : fallback}</>;
}
