import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../api/baseQuery';
import type {
  ApiResponse, PagedResponse,
  OperatorResponse, OperatorRequest, ChangePasswordRequest,
  LocationOperatorResponse, LocationOperatorRequest,
} from '../../types/api';

export const operatorApi = createApi({
  reducerPath: 'operatorApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Operator', 'OperatorLocations'],
  endpoints: (b) => ({

    listOperators: b.query<PagedResponse<OperatorResponse>, {
      page?: number; size?: number;
      name?: string; type?: number; disabled?: boolean;
    }>({
      query: ({ page = 0, size = 20, name, type, disabled } = {}) => {
        const params = new URLSearchParams({ page: String(page), size: String(size) });
        if (name)     params.set('name', name);
        if (type != null) params.set('type', String(type));
        if (disabled != null) params.set('disabled', String(disabled));
        return `/operators?${params}`;
      },
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

    updateOperator: b.mutation<OperatorResponse, { id: string; body: OperatorRequest }>({
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

    listLocationsForOperator: b.query<LocationOperatorResponse[], string>({
      query: (id) => `/operators/${id}/locations`,
      transformResponse: (r: ApiResponse<LocationOperatorResponse[]>) => r.data,
      providesTags: (_r, _e, id) => [{ type: 'OperatorLocations', id }],
    }),

    assignLocationToOperator: b.mutation<LocationOperatorResponse, { locationId: number; operatorId: string }>({
      query: ({ locationId, operatorId }) => ({
        url: `/locations/${locationId}/operators`,
        method: 'POST',
        body: { operatorId } as LocationOperatorRequest,
      }),
      transformResponse: (r: ApiResponse<LocationOperatorResponse>) => r.data,
      invalidatesTags: (_r, _e, { operatorId }) => [{ type: 'OperatorLocations', id: operatorId }],
    }),

    removeLocationFromOperator: b.mutation<void, { locationId: number; operatorId: string }>({
      query: ({ locationId, operatorId }) => ({
        url: `/locations/${locationId}/operators/${operatorId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, { operatorId }) => [{ type: 'OperatorLocations', id: operatorId }],
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
  useAssignLocationToOperatorMutation,
  useRemoveLocationFromOperatorMutation,
} = operatorApi;
