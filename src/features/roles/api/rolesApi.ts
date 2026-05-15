import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '@/config/baseQuery';
import type { ApiResponse, Role, RoleRequest } from '@/shared/types/api';

export const rolesApi = createApi({
  reducerPath: 'rolesApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Role'],
  endpoints: (b) => ({

    listRoles: b.query<Role[], void>({
      query: () => '/roles',
      transformResponse: (r: ApiResponse<Role[]>) => r.data,
      providesTags: ['Role'],
    }),

    getRole: b.query<Role, number>({
      query: (id) => `/roles/${id}`,
      transformResponse: (r: ApiResponse<Role>) => r.data,
      providesTags: (_r, _e, id) => [{ type: 'Role', id }],
    }),

    createRole: b.mutation<Role, RoleRequest>({
      query: (body) => ({ url: '/roles', method: 'POST', body }),
      transformResponse: (r: ApiResponse<Role>) => r.data,
      invalidatesTags: ['Role'],
    }),

    updateRole: b.mutation<Role, { id: number; body: RoleRequest }>({
      query: ({ id, body }) => ({ url: `/roles/${id}`, method: 'PUT', body }),
      transformResponse: (r: ApiResponse<Role>) => r.data,
      invalidatesTags: (_r, _e, { id }) => ['Role', { type: 'Role', id }],
    }),

    deleteRole: b.mutation<void, number>({
      query: (id) => ({ url: `/roles/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Role'],
    }),

  }),
});

export const {
  useListRolesQuery,
  useGetRoleQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
} = rolesApi;
