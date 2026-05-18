import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '@/config/baseQuery';
import type {
  ApiResponse, PagedResponse,
  CabinetResponse, CabinetRequest, CabinetMatrixResponse,
  CabinetSettingsResponse, CabinetSettingsRequest,
} from '@/shared/types/api';

export const cabinetApi = createApi({
  reducerPath: 'cabinetApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Cabinet'],
  endpoints: (b) => ({
    listCabinets: b.query<PagedResponse<CabinetResponse>, { page?: number; size?: number; deleted?: boolean; locationId?: number }>({
      query: ({ page = 0, size = 20, deleted, locationId } = {}) => {
        let url = `/cabinets?page=${page}&size=${size}`;
        if (deleted !== undefined) url += `&deleted=${deleted}`;
        if (locationId !== undefined) url += `&locationId=${locationId}`;
        return url;
      },
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
    getCabinetMatrix: b.query<CabinetMatrixResponse[], number>({
      query: (id) => `/cabinets/${id}/matrix`,
      transformResponse: (r: ApiResponse<CabinetMatrixResponse[]>) => r.data,
      providesTags: (_r, _e, id) => [{ type: 'Cabinet', id }],
    }),
    getCabinetSettings: b.query<CabinetSettingsResponse, number>({
      query: (id) => `/cabinets/${id}/settings`,
      transformResponse: (r: ApiResponse<CabinetSettingsResponse>) => r.data,
      providesTags: (_r, _e, id) => [{ type: 'Cabinet', id }],
    }),
    updateCabinetSettings: b.mutation<CabinetSettingsResponse, { id: number; body: CabinetSettingsRequest }>({
      query: ({ id, body }) => ({ url: `/cabinets/${id}/settings`, method: 'PUT', body }),
      transformResponse: (r: ApiResponse<CabinetSettingsResponse>) => r.data,
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Cabinet', id }],
    }),
  }),
});

export const {
  useListCabinetsQuery,
  useLazyListCabinetsQuery,
  useListCabinetsByLocationQuery,
  useGetCabinetQuery,
  useGetCabinetMatrixQuery,
  useCreateCabinetMutation,
  useUpdateCabinetMutation,
  useDisableCabinetMutation,
  useRestoreCabinetMutation,
  useGetCabinetSettingsQuery,
  useUpdateCabinetSettingsMutation,
} = cabinetApi;
