import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../api/baseQuery';
import type { ApiResponse, PagedResponse, AssetResponse, AssetRequest } from '../../types/api';

export const assetApi = createApi({
  reducerPath: 'assetApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Asset'],
  endpoints: (b) => ({
    listAssets: b.query<PagedResponse<AssetResponse>, { page?: number; size?: number; includeDisabled?: boolean }>({
      query: ({ page = 0, size = 20, includeDisabled = false } = {}) =>
        `/assets?page=${page}&size=${size}&includeDisabled=${includeDisabled}`,
      transformResponse: (r: ApiResponse<PagedResponse<AssetResponse>>) => r.data,
      providesTags: ['Asset'],
    }),
    listAssetsByLocation: b.query<AssetResponse[], number>({
      query: (locationId) => `/assets/by-location/${locationId}`,
      transformResponse: (r: ApiResponse<AssetResponse[]>) => r.data,
      providesTags: ['Asset'],
    }),
    getAsset: b.query<AssetResponse, number>({
      query: (id) => `/assets/${id}`,
      transformResponse: (r: ApiResponse<AssetResponse>) => r.data,
      providesTags: (_r, _e, id) => [{ type: 'Asset', id }],
    }),
    createAsset: b.mutation<AssetResponse, AssetRequest>({
      query: (body) => ({ url: '/assets', method: 'POST', body }),
      transformResponse: (r: ApiResponse<AssetResponse>) => r.data,
      invalidatesTags: ['Asset'],
    }),
    updateAsset: b.mutation<AssetResponse, { id: number; body: AssetRequest }>({
      query: ({ id, body }) => ({ url: `/assets/${id}`, method: 'PUT', body }),
      transformResponse: (r: ApiResponse<AssetResponse>) => r.data,
      invalidatesTags: ['Asset'],
    }),
    disableAsset: b.mutation<void, number>({
      query: (id) => ({ url: `/assets/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Asset'],
    }),
  }),
});

export const {
  useListAssetsQuery,
  useListAssetsByLocationQuery,
  useGetAssetQuery,
  useCreateAssetMutation,
  useUpdateAssetMutation,
  useDisableAssetMutation,
} = assetApi;
