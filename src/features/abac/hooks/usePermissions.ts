import { useCallback } from 'react';
import { useAppSelector } from '@/app/store/hooks';
import { useGetMyPermissionsQuery } from '@/features/abac/api/abacApi';

export function usePermissions() {
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  const { data, isLoading } = useGetMyPermissionsQuery(undefined, { skip: !accessToken });

  const isSuperAdmin = data?.isSuperAdmin ?? false;

  const canAccess = useCallback(
    (resource: string, action: string): boolean => {
      if (!data) return false;
      const perm = data.permissions.find((p) => p.resource === resource);
      return perm?.actions.includes(action) ?? false;
    },
    [data],
  );

  return { isSuperAdmin, canAccess, isLoading };
}
