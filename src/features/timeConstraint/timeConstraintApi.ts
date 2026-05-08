import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../api/baseQuery';
import type { ApiResponse, PagedResponse, TimeConstraintResponse, TimeConstraintRequest } from '../../types/api';

export const timeConstraintApi = createApi({
  reducerPath: 'timeConstraintApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['TimeConstraint'],
  endpoints: (b) => ({
    listTimeConstraints: b.query<PagedResponse<TimeConstraintResponse>, { page?: number; size?: number; includeDisabled?: boolean }>({
      query: ({ page = 0, size = 20, includeDisabled = false } = {}) =>
        `/time-constraints?page=${page}&size=${size}&includeDisabled=${includeDisabled}`,
      transformResponse: (r: ApiResponse<PagedResponse<TimeConstraintResponse>>) => r.data,
      providesTags: ['TimeConstraint'],
    }),
    listTimeConstraintsByLocation: b.query<TimeConstraintResponse[], number>({
      query: (locationId) => `/time-constraints/by-location/${locationId}`,
      transformResponse: (r: ApiResponse<TimeConstraintResponse[]>) => r.data,
      providesTags: ['TimeConstraint'],
    }),
    getTimeConstraint: b.query<TimeConstraintResponse, number>({
      query: (id) => `/time-constraints/${id}`,
      transformResponse: (r: ApiResponse<TimeConstraintResponse>) => r.data,
      providesTags: (_r, _e, id) => [{ type: 'TimeConstraint', id }],
    }),
    createTimeConstraint: b.mutation<TimeConstraintResponse, TimeConstraintRequest>({
      query: (body) => ({ url: '/time-constraints', method: 'POST', body }),
      transformResponse: (r: ApiResponse<TimeConstraintResponse>) => r.data,
      invalidatesTags: ['TimeConstraint'],
    }),
    updateTimeConstraint: b.mutation<TimeConstraintResponse, { id: number; body: TimeConstraintRequest }>({
      query: ({ id, body }) => ({ url: `/time-constraints/${id}`, method: 'PUT', body }),
      transformResponse: (r: ApiResponse<TimeConstraintResponse>) => r.data,
      invalidatesTags: ['TimeConstraint'],
    }),
    disableTimeConstraint: b.mutation<void, number>({
      query: (id) => ({ url: `/time-constraints/${id}`, method: 'DELETE' }),
      invalidatesTags: ['TimeConstraint'],
    }),
    restoreTimeConstraint: b.mutation<void, number>({
      query: (id) => ({ url: `/time-constraints/${id}/restore`, method: 'POST' }),
      invalidatesTags: ['TimeConstraint'],
    }),
  }),
});

export const {
  useListTimeConstraintsQuery,
  useListTimeConstraintsByLocationQuery,
  useGetTimeConstraintQuery,
  useCreateTimeConstraintMutation,
  useUpdateTimeConstraintMutation,
  useDisableTimeConstraintMutation,
  useRestoreTimeConstraintMutation,
} = timeConstraintApi;
