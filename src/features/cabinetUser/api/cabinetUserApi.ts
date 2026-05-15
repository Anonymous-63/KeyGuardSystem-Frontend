import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '@/config/baseQuery';
import type {
  ApiResponse, PagedResponse,
  CabinetUserResponse, CabinetUserRequest,
  AssignLocationRequest, LocationAssignmentResponse,
  UserAssetRequest, UserAssetResponse,
  UserTimeConstraintRequest, UserTimeConstraintResponse,
  UserAssetGroupRequest, UserAssetGroupResponse,
} from '@/shared/types/api';

export const cabinetUserApi = createApi({
  reducerPath: 'cabinetUserApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['CabinetUser', 'UserAsset', 'UserTimeConstraint', 'UserAssetGroup'],
  endpoints: (b) => ({
    // ─── Cabinet Users ────────────────────────────────────────────────────────
    listCabinetUsers: b.query<PagedResponse<CabinetUserResponse>, { page?: number; size?: number; includeDisabled?: boolean }>({
      query: ({ page = 0, size = 20, includeDisabled = false } = {}) =>
        `/cabinet-users?page=${page}&size=${size}&includeDisabled=${includeDisabled}`,
      transformResponse: (r: ApiResponse<PagedResponse<CabinetUserResponse>>) => r.data,
      providesTags: ['CabinetUser'],
    }),
    listCabinetUsersByLocation: b.query<CabinetUserResponse[], number>({
      query: (locationId) => `/cabinet-users/by-location/${locationId}`,
      transformResponse: (r: ApiResponse<CabinetUserResponse[]>) => r.data,
      providesTags: ['CabinetUser'],
    }),
    getCabinetUser: b.query<CabinetUserResponse, string>({
      query: (id) => `/cabinet-users/${id}`,
      transformResponse: (r: ApiResponse<CabinetUserResponse>) => r.data,
      providesTags: (_r, _e, id) => [{ type: 'CabinetUser', id }],
    }),
    getCabinetUserLocations: b.query<LocationAssignmentResponse[], string>({
      query: (id) => `/cabinet-users/${id}/locations`,
      transformResponse: (r: ApiResponse<LocationAssignmentResponse[]>) => r.data,
      providesTags: (_r, _e, id) => [{ type: 'CabinetUser', id }],
    }),
    createCabinetUser: b.mutation<CabinetUserResponse, CabinetUserRequest>({
      query: (body) => ({ url: '/cabinet-users', method: 'POST', body }),
      transformResponse: (r: ApiResponse<CabinetUserResponse>) => r.data,
      invalidatesTags: ['CabinetUser'],
    }),
    updateCabinetUser: b.mutation<CabinetUserResponse, { id: string; body: Partial<CabinetUserRequest> }>({
      query: ({ id, body }) => ({ url: `/cabinet-users/${id}`, method: 'PUT', body }),
      transformResponse: (r: ApiResponse<CabinetUserResponse>) => r.data,
      invalidatesTags: ['CabinetUser'],
    }),
    assignLocation: b.mutation<void, { id: string; body: AssignLocationRequest }>({
      query: ({ id, body }) => ({ url: `/cabinet-users/${id}/locations`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'CabinetUser', id }],
    }),
    removeLocation: b.mutation<void, { id: string; locationId: number }>({
      query: ({ id, locationId }) => ({ url: `/cabinet-users/${id}/locations/${locationId}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'CabinetUser', id }],
    }),
    disableCabinetUser: b.mutation<void, string>({
      query: (id) => ({ url: `/cabinet-users/${id}`, method: 'DELETE' }),
      invalidatesTags: ['CabinetUser'],
    }),
    restoreCabinetUser: b.mutation<CabinetUserResponse, string>({
      query: (id) => ({ url: `/cabinet-users/${id}/restore`, method: 'POST' }),
      transformResponse: (r: ApiResponse<CabinetUserResponse>) => r.data,
      invalidatesTags: ['CabinetUser'],
    }),

    // ─── User-Asset Assignments ───────────────────────────────────────────────
    getUserAssets: b.query<UserAssetResponse[], string>({
      query: (userId) => `/user-assets/by-user/${userId}`,
      transformResponse: (r: ApiResponse<UserAssetResponse[]>) => r.data,
      providesTags: (_r, _e, userId) => [{ type: 'UserAsset', id: userId }],
    }),
    assignUserAsset: b.mutation<UserAssetResponse, UserAssetRequest>({
      query: (body) => ({ url: '/user-assets', method: 'POST', body }),
      transformResponse: (r: ApiResponse<UserAssetResponse>) => r.data,
      invalidatesTags: (_r, _e, { userId }) => [{ type: 'UserAsset', id: userId }],
    }),
    removeUserAsset: b.mutation<void, { userId: string; assetId: number; locationId: number }>({
      query: ({ userId, assetId, locationId }) =>
        ({ url: `/user-assets/${userId}/${assetId}/${locationId}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { userId }) => [{ type: 'UserAsset', id: userId }],
    }),

    // ─── User-TimeConstraint Assignments ─────────────────────────────────────
    getUserTimeConstraints: b.query<UserTimeConstraintResponse[], string>({
      query: (userId) => `/user-time-constraints/by-user/${userId}`,
      transformResponse: (r: ApiResponse<UserTimeConstraintResponse[]>) => r.data,
      providesTags: (_r, _e, userId) => [{ type: 'UserTimeConstraint', id: userId }],
    }),
    assignUserTimeConstraint: b.mutation<UserTimeConstraintResponse, UserTimeConstraintRequest>({
      query: (body) => ({ url: '/user-time-constraints', method: 'POST', body }),
      transformResponse: (r: ApiResponse<UserTimeConstraintResponse>) => r.data,
      invalidatesTags: (_r, _e, { userId }) => [{ type: 'UserTimeConstraint', id: userId }],
    }),
    removeUserTimeConstraint: b.mutation<void, { userId: string; timeConstraintId: number }>({
      query: ({ userId, timeConstraintId }) =>
        ({ url: `/user-time-constraints/${userId}/${timeConstraintId}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { userId }) => [{ type: 'UserTimeConstraint', id: userId }],
    }),

    // ─── User-AssetGroup Assignments ──────────────────────────────────────────
    getUserAssetGroups: b.query<UserAssetGroupResponse[], string>({
      query: (userId) => `/user-asset-groups/by-user/${userId}`,
      transformResponse: (r: ApiResponse<UserAssetGroupResponse[]>) => r.data,
      providesTags: (_r, _e, userId) => [{ type: 'UserAssetGroup', id: userId }],
    }),
    assignUserAssetGroup: b.mutation<UserAssetGroupResponse, UserAssetGroupRequest>({
      query: (body) => ({ url: '/user-asset-groups', method: 'POST', body }),
      transformResponse: (r: ApiResponse<UserAssetGroupResponse>) => r.data,
      invalidatesTags: (_r, _e, { userId }) => [{ type: 'UserAssetGroup', id: userId }],
    }),
    removeUserAssetGroup: b.mutation<void, { userId: string; groupId: number; locationId: number }>({
      query: ({ userId, groupId, locationId }) =>
        ({ url: `/user-asset-groups/${userId}/${groupId}/${locationId}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { userId }) => [{ type: 'UserAssetGroup', id: userId }],
    }),
  }),
});

export const {
  useListCabinetUsersQuery,
  useListCabinetUsersByLocationQuery,
  useGetCabinetUserQuery,
  useGetCabinetUserLocationsQuery,
  useCreateCabinetUserMutation,
  useUpdateCabinetUserMutation,
  useAssignLocationMutation,
  useRemoveLocationMutation,
  useDisableCabinetUserMutation,
  useRestoreCabinetUserMutation,
  useGetUserAssetsQuery,
  useAssignUserAssetMutation,
  useRemoveUserAssetMutation,
  useGetUserTimeConstraintsQuery,
  useAssignUserTimeConstraintMutation,
  useRemoveUserTimeConstraintMutation,
  useGetUserAssetGroupsQuery,
  useAssignUserAssetGroupMutation,
  useRemoveUserAssetGroupMutation,
} = cabinetUserApi;
