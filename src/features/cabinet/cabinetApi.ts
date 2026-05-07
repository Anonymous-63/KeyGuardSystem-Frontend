import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../api/baseQuery';
import type { ApiResponse, PagedResponse, CabinetResponse, CabinetRequest } from '../../types/api';

export const cabinetApi = createApi({
  reducerPath: 'cabinetApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Cabinet'],
  endpoints: (b) => ({
    listCabinets: b.query<PagedResponse<CabinetResponse>, { page?: number; size?: number; includeDisabled?: boolean }>({
      query: ({ page = 0, size = 20, includeDisabled = false } = {}) =>
        `/cabinets?page=${page}&size=${size}&includeDisabled=${includeDisabled}`,
      transformResponse: (r: ApiResponse<PagedResponse<CabinetResponse>>) => r.data,
      providesTags: ['Cabinet'],
    }),
    listCabinetsByLocation: b.query<CabinetResponse[], number>({
      query: (locationId) => `/cabinets/by-location/${locationId}`,
      transformResponse: (r: ApiResponse<CabinetResponse[]>) => r.data,
      providesTags: ['Cabinet'],
    }),
    getCabinet: b.query<CabinetResponse, number>({
      query: (id) => `/cabinets/${id}`,
      transformResponse: (r: ApiResponse<CabinetResponse>) => r.data,
      providesTags: (_r, _e, id) => [{ type: 'Cabinet', id }],
    }),
    createCabinet: b.mutation<CabinetResponse, CabinetRequest>({
      query: (body) => ({ url: '/cabinets', method: 'POST', body }),
      transformResponse: (r: ApiResponse<CabinetResponse>) => r.data,
      invalidatesTags: ['Cabinet'],
    }),
    updateCabinet: b.mutation<CabinetResponse, { id: number; body: CabinetRequest }>({
      query: ({ id, body }) => ({ url: `/cabinets/${id}`, method: 'PUT', body }),
      transformResponse: (r: ApiResponse<CabinetResponse>) => r.data,
      invalidatesTags: ['Cabinet'],
    }),
    disableCabinet: b.mutation<void, number>({
      query: (id) => ({ url: `/cabinets/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Cabinet'],
    }),
    restoreCabinet: b.mutation<CabinetResponse, number>({
      query: (id) => ({ url: `/cabinets/${id}/restore`, method: 'POST' }),
      transformResponse: (r: ApiResponse<CabinetResponse>) => r.data,
      invalidatesTags: ['Cabinet'],
    }),
  }),
});

export const {
  useListCabinetsQuery,
  useListCabinetsByLocationQuery,
  useGetCabinetQuery,
  useCreateCabinetMutation,
  useUpdateCabinetMutation,
  useDisableCabinetMutation,
  useRestoreCabinetMutation,
} = cabinetApi;
