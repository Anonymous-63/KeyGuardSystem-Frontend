import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '@/config/baseQuery';
import type {
  ApiResponse, PagedResponse,
  AuditActivityRecord, AccessAuditRecord, AuditStats,
  AuditActivityParams, AccessAuditParams,
} from '@/shared/types/api';

export const auditApi = createApi({
  reducerPath: 'auditApi',
  baseQuery: baseQueryWithReauth,
  endpoints: (build) => ({

    listActivity: build.query<PagedResponse<AuditActivityRecord>, AuditActivityParams>({
      query: (p) => ({
        url: 'audit/activity',
        params: { ...p },
      }),
      transformResponse: (r: ApiResponse<PagedResponse<AuditActivityRecord>>) => r.data,
    }),

    listAccess: build.query<PagedResponse<AccessAuditRecord>, AccessAuditParams>({
      query: (p) => ({
        url: 'audit/access',
        params: { ...p },
      }),
      transformResponse: (r: ApiResponse<PagedResponse<AccessAuditRecord>>) => r.data,
    }),

    getStats: build.query<AuditStats, void>({
      query: () => 'audit/stats',
      transformResponse: (r: ApiResponse<AuditStats>) => r.data,
    }),

  }),
});

export const {
  useListActivityQuery,
  useListAccessQuery,
  useGetStatsQuery,
} = auditApi;
