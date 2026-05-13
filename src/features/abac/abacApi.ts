import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../api/baseQuery';
import type {
  ApiResponse, PagedResponse,
  PolicyResponse, PolicyRequest, PolicyVersionResponse,
  EvaluateRequest, EvaluateResult, PolicyListParams,
} from '../../types/api';

export const abacApi = createApi({
  reducerPath: 'abacApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Policy', 'PolicyVersion'],
  endpoints: (b) => ({

    listPolicies: b.query<PagedResponse<PolicyResponse>, PolicyListParams>({
      query: ({ resourceType, action, effect, active, page = 0, size = 20 } = {}) => {
        const params = new URLSearchParams({ page: String(page), size: String(size) });
        if (resourceType) params.set('resourceType', resourceType);
        if (action)       params.set('action', action);
        if (effect)       params.set('effect', effect);
        if (active != null) params.set('active', String(active));
        return `/admin/policies?${params}`;
      },
      transformResponse: (r: ApiResponse<PagedResponse<PolicyResponse>>) => r.data,
      providesTags: ['Policy'],
    }),

    getPolicy: b.query<PolicyResponse, string>({
      query: (id) => `/admin/policies/${id}`,
      transformResponse: (r: ApiResponse<PolicyResponse>) => r.data,
      providesTags: (_r, _e, id) => [{ type: 'Policy', id }],
    }),

    getPolicyVersions: b.query<PolicyVersionResponse[], string>({
      query: (id) => `/admin/policies/${id}/versions`,
      transformResponse: (r: ApiResponse<PolicyVersionResponse[]>) => r.data,
      providesTags: (_r, _e, id) => [{ type: 'PolicyVersion', id }],
    }),

    createPolicy: b.mutation<PolicyResponse, PolicyRequest>({
      query: (body) => ({ url: '/admin/policies', method: 'POST', body }),
      transformResponse: (r: ApiResponse<PolicyResponse>) => r.data,
      invalidatesTags: ['Policy'],
    }),

    updatePolicy: b.mutation<PolicyResponse, { id: string; body: PolicyRequest }>({
      query: ({ id, body }) => ({ url: `/admin/policies/${id}`, method: 'PUT', body }),
      transformResponse: (r: ApiResponse<PolicyResponse>) => r.data,
      invalidatesTags: (_r, _e, { id }) => ['Policy', { type: 'PolicyVersion', id }],
    }),

    togglePolicy: b.mutation<PolicyResponse, string>({
      query: (id) => ({ url: `/admin/policies/${id}/toggle`, method: 'PATCH' }),
      transformResponse: (r: ApiResponse<PolicyResponse>) => r.data,
      invalidatesTags: (_r, _e, id) => ['Policy', { type: 'PolicyVersion', id }],
    }),

    deletePolicy: b.mutation<void, string>({
      query: (id) => ({ url: `/admin/policies/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Policy'],
    }),

    evaluatePolicy: b.mutation<EvaluateResult, EvaluateRequest>({
      query: (body) => ({ url: '/admin/policies/evaluate', method: 'POST', body }),
      transformResponse: (r: ApiResponse<EvaluateResult>) => r.data,
    }),

    reloadPolicyCache: b.mutation<void, void>({
      query: () => ({ url: '/admin/policies/reload', method: 'POST' }),
      invalidatesTags: ['Policy'],
    }),

  }),
});

export const {
  useListPoliciesQuery,
  useGetPolicyQuery,
  useGetPolicyVersionsQuery,
  useCreatePolicyMutation,
  useUpdatePolicyMutation,
  useTogglePolicyMutation,
  useDeletePolicyMutation,
  useEvaluatePolicyMutation,
  useReloadPolicyCacheMutation,
} = abacApi;
