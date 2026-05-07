import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../api/baseQuery';
import type { ApiResponse, PagedResponse, LocationResponse, LocationRequest } from '../../types/api';

export const locationApi = createApi({
  reducerPath: 'locationApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Location'],
  endpoints: (b) => ({
    listLocations: b.query<PagedResponse<LocationResponse>, { page?: number; size?: number; includeDisabled?: boolean }>({
      query: ({ page = 0, size = 20, includeDisabled = false } = {}) =>
        `/locations?page=${page}&size=${size}&includeDisabled=${includeDisabled}`,
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
  }),
});

export const {
  useListLocationsQuery,
  useGetLocationQuery,
  useCreateLocationMutation,
  useUpdateLocationMutation,
  useDisableLocationMutation,
  useRestoreLocationMutation,
} = locationApi;
