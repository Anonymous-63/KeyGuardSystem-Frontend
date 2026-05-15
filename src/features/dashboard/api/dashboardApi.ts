import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '@/config/baseQuery';
import type { ApiResponse, DashboardResponse, PagedResponse, OperatorAuditResponse } from '@/shared/types/api';

export const dashboardApi = createApi({
  reducerPath: 'dashboardApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Dashboard', 'AuditTrail'],
  endpoints: (b) => ({
    getDashboard: b.query<DashboardResponse, void>({
      query: () => '/dashboard',
      transformResponse: (r: ApiResponse<DashboardResponse>) => r.data,
      providesTags: ['Dashboard'],
    }),
    listAuditTrail: b.query<PagedResponse<OperatorAuditResponse>, {
      page?: number; size?: number; operatorId?: string; action?: string; from?: string; to?: string;
    }>({
      query: ({ page = 0, size = 20, operatorId, action, from, to } = {}) => {
        const params = new URLSearchParams({ page: String(page), size: String(size) });
        if (operatorId) params.set('operatorId', operatorId);
        if (action) params.set('action', action);
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        return `/audit?${params}`;
      },
      transformResponse: (r: ApiResponse<PagedResponse<OperatorAuditResponse>>) => r.data,
      providesTags: ['AuditTrail'],
    }),
  }),
});

export const { useGetDashboardQuery, useListAuditTrailQuery } = dashboardApi;
