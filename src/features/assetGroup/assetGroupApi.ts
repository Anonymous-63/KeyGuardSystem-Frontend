import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../api/baseQuery';
import type { ApiResponse, PagedResponse, AssetGroupResponse, AssetGroupRequest } from '../../types/api';

export const assetGroupApi = createApi({
  reducerPath: 'assetGroupApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['AssetGroup'],
  endpoints: (b) => ({
    listAssetGroups: b.query<PagedResponse<AssetGroupResponse>, { page?: number; size?: number; includeDisabled?: boolean }>({
      query: ({ page = 0, size = 20, includeDisabled = false } = {}) =>
        `/asset-groups?page=${page}&size=${size}&includeDisabled=${includeDisabled}`,
      transformResponse: (r: ApiResponse<PagedResponse<AssetGroupResponse>>) => r.data,
      providesTags: ['AssetGroup'],
    }),
    listAssetGroupsByLocation: b.query<AssetGroupResponse[], number>({
      query: (locationId) => `/asset-groups/by-location/${locationId}`,
      transformResponse: (r: ApiResponse<AssetGroupResponse[]>) => r.data,
      providesTags: ['AssetGroup'],
    }),
    getAssetGroup: b.query<AssetGroupResponse, number>({
      query: (id) => `/asset-groups/${id}`,
      transformResponse: (r: ApiResponse<AssetGroupResponse>) => r.data,
      providesTags: (_r, _e, id) => [{ type: 'AssetGroup', id }],
    }),
    createAssetGroup: b.mutation<AssetGroupResponse, AssetGroupRequest>({
      query: (body) => ({ url: '/asset-groups', method: 'POST', body }),
      transformResponse: (r: ApiResponse<AssetGroupResponse>) => r.data,
      invalidatesTags: ['AssetGroup'],
    }),
    updateAssetGroup: b.mutation<AssetGroupResponse, { id: number; body: AssetGroupRequest }>({
      query: ({ id, body }) => ({ url: `/asset-groups/${id}`, method: 'PUT', body }),
      transformResponse: (r: ApiResponse<AssetGroupResponse>) => r.data,
      invalidatesTags: ['AssetGroup'],
    }),
    addAssetToGroup: b.mutation<void, { groupId: number; assetId: number }>({
      query: ({ groupId, assetId }) => ({ url: `/asset-groups/${groupId}/assets/${assetId}`, method: 'POST' }),
      invalidatesTags: ['AssetGroup'],
    }),
    removeAssetFromGroup: b.mutation<void, { groupId: number; assetId: number }>({
      query: ({ groupId, assetId }) => ({ url: `/asset-groups/${groupId}/assets/${assetId}`, method: 'DELETE' }),
      invalidatesTags: ['AssetGroup'],
    }),
    disableAssetGroup: b.mutation<void, number>({
      query: (id) => ({ url: `/asset-groups/${id}`, method: 'DELETE' }),
      invalidatesTags: ['AssetGroup'],
    }),
  }),
});

export const {
  useListAssetGroupsQuery,
  useListAssetGroupsByLocationQuery,
  useGetAssetGroupQuery,
  useCreateAssetGroupMutation,
  useUpdateAssetGroupMutation,
  useAddAssetToGroupMutation,
  useRemoveAssetFromGroupMutation,
  useDisableAssetGroupMutation,
} = assetGroupApi;
