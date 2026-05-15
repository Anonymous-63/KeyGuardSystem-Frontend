import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '@/config/baseQuery';
import type {
  ApiResponse, PagedResponse,
  LocationResponse, LocationRequest,
  LocationOperatorRequest, LocationOperatorResponse,
} from '@/shared/types/api';

export const locationApi = createApi({
  reducerPath: 'locationApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Location', 'LocationOperator'],
  endpoints: (b) => ({
    listLocations: b.query<PagedResponse<LocationResponse>, {
      page?: number;
      size?: number;
      name?: string;
      assetType?: string;
      cabinetType?: string;
      disabled?: boolean;
    }>({
      query: ({ page = 0, size = 20, name, assetType, cabinetType, disabled } = {}) => {
        const p = new URLSearchParams({ page: String(page), size: String(size) });
        if (name)        p.set('name',        name);
        if (assetType)   p.set('assetType',   assetType);
        if (cabinetType) p.set('cabinetType', cabinetType);
        if (disabled != null) p.set('disabled', String(disabled));
        return `/locations?${p.toString()}`;
      },
      transformResponse: (r: ApiResponse<PagedResponse<LocationResponse>>) => r.data,
      providesTags: ['Location'],
    }),
    getLocation: b.query<LocationResponse, number>({
      query: (id) => `/locations/${id}`,
      transformResponse: (r: ApiResponse<LocationResponse>) => r.data,
      providesTags: (_r, _e, id) => [{ type: 'Location', id }],
    }),
    createLocation: b.mutation<LocationResponse, LocationRequest>({
      query: (body) => ({ url: '/locations', method: 'POST', body }),
      transformResponse: (r: ApiResponse<LocationResponse>) => r.data,
      invalidatesTags: ['Location'],
    }),
    updateLocation: b.mutation<LocationResponse, { id: number; body: LocationRequest }>({
      query: ({ id, body }) => ({ url: `/locations/${id}`, method: 'PUT', body }),
      transformResponse: (r: ApiResponse<LocationResponse>) => r.data,
      invalidatesTags: ['Location'],
    }),
    disableLocation: b.mutation<void, number>({
      query: (id) => ({ url: `/locations/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Location'],
    }),
    restoreLocation: b.mutation<LocationResponse, number>({
      query: (id) => ({ url: `/locations/${id}/restore`, method: 'POST' }),
      transformResponse: (r: ApiResponse<LocationResponse>) => r.data,
      invalidatesTags: ['Location'],
    }),
    listLocationOperators: b.query<LocationOperatorResponse[], number>({
      query: (locationId) => `/locations/${locationId}/operators`,
      transformResponse: (r: ApiResponse<LocationOperatorResponse[]>) => r.data,
      providesTags: (_r, _e, locationId) => [{ type: 'LocationOperator', id: locationId }],
    }),
    assignOperatorToLocation: b.mutation<void, { locationId: number; body: LocationOperatorRequest }>({
      query: ({ locationId, body }) =>
        ({ url: `/locations/${locationId}/operators`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { locationId }) => [{ type: 'LocationOperator', id: locationId }],
    }),
    removeOperatorFromLocation: b.mutation<void, { locationId: number; operatorId: number }>({
      query: ({ locationId, operatorId }) =>
        ({ url: `/locations/${locationId}/operators/${operatorId}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { locationId }) => [{ type: 'LocationOperator', id: locationId }],
    }),

    bulkDisableLocations: b.mutation<number, number[]>({
      query: (ids) => ({ url: '/locations/bulk-disable', method: 'POST', body: ids }),
      transformResponse: (r: ApiResponse<number>) => r.data,
      invalidatesTags: ['Location'],
    }),

    bulkRestoreLocations: b.mutation<number, number[]>({
      query: (ids) => ({ url: '/locations/bulk-restore', method: 'POST', body: ids }),
      transformResponse: (r: ApiResponse<number>) => r.data,
      invalidatesTags: ['Location'],
    }),
  }),
});

export const {
  useListLocationsQuery,
  useLazyListLocationsQuery,
  useGetLocationQuery,
  useCreateLocationMutation,
  useUpdateLocationMutation,
  useDisableLocationMutation,
  useRestoreLocationMutation,
  useListLocationOperatorsQuery,
  useAssignOperatorToLocationMutation,
  useRemoveOperatorFromLocationMutation,
  useBulkDisableLocationsMutation,
  useBulkRestoreLocationsMutation,
} = locationApi;
