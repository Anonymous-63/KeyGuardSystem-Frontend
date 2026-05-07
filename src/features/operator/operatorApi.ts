import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../api/baseQuery';
import type { ApiResponse, PagedResponse, OperatorResponse, OperatorRequest, ChangePasswordRequest, LocationResponse } from '../../types/api';

export const operatorApi = createApi({
  reducerPath: 'operatorApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Operator'],
  endpoints: (b) => ({
    listOperators: b.query<PagedResponse<OperatorResponse>, { page?: number; size?: number; includeDisabled?: boolean }>({
      query: ({ page = 0, size = 20, includeDisabled = false } = {}) =>
        `/operators?page=${page}&size=${size}&includeDisabled=${includeDisabled}`,
      transformResponse: (r: ApiResponse<PagedResponse<OperatorResponse>>) => r.data,
      providesTags: ['Operator'],
    }),
    getOperator: b.query<OperatorResponse, string>({
      query: (id) => `/operators/${id}`,
      transformResponse: (r: ApiResponse<OperatorResponse>) => r.data,
      providesTags: (_r, _e, id) => [{ type: 'Operator', id }],
    }),
    createOperator: b.mutation<OperatorResponse, OperatorRequest>({
      query: (body) => ({ url: '/operators', method: 'POST', body }),
      transformResponse: (r: ApiResponse<OperatorResponse>) => r.data,
      invalidatesTags: ['Operator'],
    }),
    updateOperator: b.mutation<OperatorResponse, { id: string; body: Partial<OperatorRequest> }>({
      query: ({ id, body }) => ({ url: `/operators/${id}`, method: 'PUT', body }),
      transformResponse: (r: ApiResponse<OperatorResponse>) => r.data,
      invalidatesTags: ['Operator'],
    }),
    disableOperator: b.mutation<void, string>({
      query: (id) => ({ url: `/operators/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Operator'],
    }),
    restoreOperator: b.mutation<OperatorResponse, string>({
      query: (id) => ({ url: `/operators/${id}/restore`, method: 'POST' }),
      transformResponse: (r: ApiResponse<OperatorResponse>) => r.data,
      invalidatesTags: ['Operator'],
    }),
    changePassword: b.mutation<void, { id: string; body: ChangePasswordRequest }>({
      query: ({ id, body }) => ({ url: `/operators/${id}/change-password`, method: 'POST', body }),
    }),
    listLocationsForOperator: b.query<LocationResponse[], string>({
      query: (id) => `/operators/${id}/locations`,
      transformResponse: (r: ApiResponse<LocationResponse[]>) => r.data,
    }),
  }),
});

export const {
  useListOperatorsQuery,
  useGetOperatorQuery,
  useCreateOperatorMutation,
  useUpdateOperatorMutation,
  useDisableOperatorMutation,
  useRestoreOperatorMutation,
  useChangePasswordMutation,
  useListLocationsForOperatorQuery,
} = operatorApi;
