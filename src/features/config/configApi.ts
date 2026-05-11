import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../api/baseQuery';
import type { ApiResponse, AppConfigResponse, AppConfigUpdateRequest } from '../../types/api';

export const configApi = createApi({
  reducerPath: 'configApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Config'],
  endpoints: (b) => ({
    listConfigs: b.query<AppConfigResponse[], void>({
      query: () => '/config',
      transformResponse: (r: ApiResponse<AppConfigResponse[]>) => r.data,
      providesTags: ['Config'],
    }),
    upsertConfig: b.mutation<AppConfigResponse, { key: string; body: AppConfigUpdateRequest }>({
      query: ({ key, body }) => ({ url: `/config/${key}`, method: 'PUT', body }),
      transformResponse: (r: ApiResponse<AppConfigResponse>) => r.data,
      invalidatesTags: ['Config'],
    }),
    deleteConfig: b.mutation<void, string>({
      query: (key) => ({ url: `/config/${key}`, method: 'DELETE' }),
      invalidatesTags: ['Config'],
    }),
  }),
});

export const { useListConfigsQuery, useUpsertConfigMutation, useDeleteConfigMutation } = configApi;
