import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '@/config/baseQuery';
import type {
  ApiResponse, PagedResponse,
  OperatorResponse, OperatorRequest, ChangePasswordRequest,
  LocationOperatorResponse, LocationOperatorRequest,
} from '@/shared/types/api';

export const operatorApi = createApi({
  reducerPath: 'operatorApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Operator', 'OperatorLocations', 'Me'],
  endpoints: (b) => ({

    getMe: b.query<OperatorResponse, void>({
      query: () => '/auth/me',
      transformResponse: (r: ApiResponse<OperatorResponse>) => r.data,
      providesTags: ['Me'],
    }),

    listOperators: b.query<PagedResponse<OperatorResponse>, {
      page?: number; size?: number;
      search?: string; roleId?: number; deleted?: boolean;
    }>({
      query: ({ page = 0, size = 20, search, roleId, deleted } = {}) => {
        const params = new URLSearchParams({ page: String(page), size: String(size) });
        if (search)         params.set('search', search);
        if (roleId != null) params.set('roleId', String(roleId));
        if (deleted != null) params.set('deleted', String(deleted));
        return `/operators?${params}`;
      },
      transformResponse: (r: ApiResponse<PagedResponse<OperatorResponse>>) => r.data,
      providesTags: ['Operator'],
    }),

    getOperator: b.query<OperatorResponse, number>({
      query: (id) => `/operators/${id}`,
      transformResponse: (r: ApiResponse<OperatorResponse>) => r.data,
      providesTags: (_r, _e, id) => [{ type: 'Operator', id }],
    }),

    createOperator: b.mutation<OperatorResponse, OperatorRequest>({
      query: (body) => ({ url: '/operators', method: 'POST', body }),
      transformResponse: (r: ApiResponse<OperatorResponse>) => r.data,
      invalidatesTags: ['Operator'],
    }),

    updateOperator: b.mutation<OperatorResponse, { id: number; body: OperatorRequest; photo?: File; removePhoto?: boolean }>({
      query: ({ id, body, photo, removePhoto }) => {
        const fd = new FormData();
        fd.append('data', new Blob([JSON.stringify(body)], { type: 'application/json' }));
        if (photo) fd.append('file', photo);
        const url = removePhoto ? `/operators/${id}?removePhoto=true` : `/operators/${id}`;
        return { url, method: 'PUT', body: fd };
      },
      transformResponse: (r: ApiResponse<OperatorResponse>) => r.data,
      invalidatesTags: ['Operator', 'Me'],
    }),

    disableOperator: b.mutation<void, number>({
      query: (id) => ({ url: `/operators/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Operator'],
    }),

    restoreOperator: b.mutation<OperatorResponse, number>({
      query: (id) => ({ url: `/operators/${id}/restore`, method: 'POST' }),
      transformResponse: (r: ApiResponse<OperatorResponse>) => r.data,
      invalidatesTags: ['Operator'],
    }),

    changePassword: b.mutation<void, { id: number; body: ChangePasswordRequest }>({
      query: ({ id, body }) => ({ url: `/operators/${id}/change-password`, method: 'POST', body }),
    }),

    changeMyPassword: b.mutation<void, ChangePasswordRequest>({
      query: (body) => ({ url: '/operators/me/change-password', method: 'POST', body }),
    }),

    listLocationsForOperator: b.query<LocationOperatorResponse[], number>({
      query: (id) => `/operators/${id}/locations`,
      transformResponse: (r: ApiResponse<LocationOperatorResponse[]>) => r.data,
      providesTags: (_r, _e, id) => [{ type: 'OperatorLocations', id }],
    }),

    assignLocationToOperator: b.mutation<LocationOperatorResponse, { locationId: number; operatorId: number }>({
      query: ({ locationId, operatorId }) => ({
        url: `/locations/${locationId}/operators`,
        method: 'POST',
        body: { operatorId } as LocationOperatorRequest,
      }),
      transformResponse: (r: ApiResponse<LocationOperatorResponse>) => r.data,
      invalidatesTags: (_r, _e, { operatorId }) => [{ type: 'OperatorLocations', id: operatorId }],
    }),

    removeLocationFromOperator: b.mutation<void, { locationId: number; operatorId: number }>({
      query: ({ locationId, operatorId }) => ({
        url: `/locations/${locationId}/operators/${operatorId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, { operatorId }) => [{ type: 'OperatorLocations', id: operatorId }],
    }),

    updateMyProfile: b.mutation<OperatorResponse, { body: OperatorRequest; photo?: File; removePhoto?: boolean }>({
      query: ({ body, photo, removePhoto }) => {
        const fd = new FormData();
        fd.append('data', new Blob([JSON.stringify(body)], { type: 'application/json' }));
        if (photo) fd.append('file', photo);
        const url = removePhoto ? '/operators/me?removePhoto=true' : '/operators/me';
        return { url, method: 'PUT', body: fd };
      },
      transformResponse: (r: ApiResponse<OperatorResponse>) => r.data,
      invalidatesTags: ['Operator', 'Me'],
    }),

    uploadOperatorPhoto: b.mutation<OperatorResponse, { id: number; file: FormData }>({
      query: ({ id, file }) => ({ url: `/operators/${id}/photo`, method: 'POST', body: file }),
      transformResponse: (r: ApiResponse<OperatorResponse>) => r.data,
      invalidatesTags: ['Operator', 'Me'],
    }),

    removeOperatorPhoto: b.mutation<void, number>({
      query: (id) => ({ url: `/operators/${id}/photo`, method: 'DELETE' }),
      invalidatesTags: ['Operator', 'Me'],
    }),

    bulkDisableOperators: b.mutation<number, number[]>({
      query: (ids) => ({ url: '/operators/bulk-disable', method: 'POST', body: ids }),
      transformResponse: (r: ApiResponse<number>) => r.data,
      invalidatesTags: ['Operator'],
    }),

    bulkRestoreOperators: b.mutation<number, number[]>({
      query: (ids) => ({ url: '/operators/bulk-restore', method: 'POST', body: ids }),
      transformResponse: (r: ApiResponse<number>) => r.data,
      invalidatesTags: ['Operator'],
    }),
  }),
});

export const {
  useGetMeQuery,
  useListOperatorsQuery,
  useLazyListOperatorsQuery,
  useGetOperatorQuery,
  useCreateOperatorMutation,
  useUpdateOperatorMutation,
  useUpdateMyProfileMutation,
  useDisableOperatorMutation,
  useRestoreOperatorMutation,
  useChangePasswordMutation,
  useChangeMyPasswordMutation,
  useListLocationsForOperatorQuery,
  useAssignLocationToOperatorMutation,
  useRemoveLocationFromOperatorMutation,
  useUploadOperatorPhotoMutation,
  useRemoveOperatorPhotoMutation,
  useBulkDisableOperatorsMutation,
  useBulkRestoreOperatorsMutation,
} = operatorApi;
