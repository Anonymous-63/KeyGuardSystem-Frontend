import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../api/baseQuery';
import type {
  ApiResponse, PagedResponse,
  AssetTransactionResponse, AssetTransactionWriteRequest, AssetReturnRequest,
  CabinetTransactionResponse,
} from '../../types/api';

export const transactionApi = createApi({
  reducerPath: 'transactionApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['AssetTransaction', 'CabinetTransaction'],
  endpoints: (b) => ({
    // ─── Asset Transactions ───────────────────────────────────────────────────
    listAssetTransactions: b.query<PagedResponse<AssetTransactionResponse>, { page?: number; size?: number }>({
      query: ({ page = 0, size = 20 } = {}) =>
        `/transactions/assets?page=${page}&size=${size}`,
      transformResponse: (r: ApiResponse<PagedResponse<AssetTransactionResponse>>) => r.data,
      providesTags: ['AssetTransaction'],
    }),
    listTransactionsByAsset: b.query<AssetTransactionResponse[], number>({
      query: (assetId) => `/transactions/assets/by-asset/${assetId}`,
      transformResponse: (r: ApiResponse<AssetTransactionResponse[]>) => r.data,
      providesTags: ['AssetTransaction'],
    }),
    listTransactionsByUser: b.query<AssetTransactionResponse[], string>({
      query: (userId) => `/transactions/assets/by-user/${userId}`,
      transformResponse: (r: ApiResponse<AssetTransactionResponse[]>) => r.data,
      providesTags: ['AssetTransaction'],
    }),
    listAssetsOut: b.query<AssetTransactionResponse[], void>({
      query: () => '/transactions/assets/out',
      transformResponse: (r: ApiResponse<AssetTransactionResponse[]>) => r.data,
      providesTags: ['AssetTransaction'],
    }),
    listOverdueAssets: b.query<AssetTransactionResponse[], void>({
      query: () => '/transactions/assets/overdue',
      transformResponse: (r: ApiResponse<AssetTransactionResponse[]>) => r.data,
      providesTags: ['AssetTransaction'],
    }),
    getTransaction: b.query<AssetTransactionResponse, number>({
      query: (autoNo) => `/transactions/assets/${autoNo}`,
      transformResponse: (r: ApiResponse<AssetTransactionResponse>) => r.data,
      providesTags: (_r, _e, autoNo) => [{ type: 'AssetTransaction', id: autoNo }],
    }),
    recordIssuance: b.mutation<AssetTransactionResponse, AssetTransactionWriteRequest>({
      query: (body) => ({ url: '/transactions/assets', method: 'POST', body }),
      transformResponse: (r: ApiResponse<AssetTransactionResponse>) => r.data,
      invalidatesTags: ['AssetTransaction'],
    }),
    recordReturn: b.mutation<AssetTransactionResponse, { autoNo: number; body: AssetReturnRequest }>({
      query: ({ autoNo, body }) => ({ url: `/transactions/assets/${autoNo}/return`, method: 'POST', body }),
      transformResponse: (r: ApiResponse<AssetTransactionResponse>) => r.data,
      invalidatesTags: ['AssetTransaction'],
    }),

    // ─── Cabinet Transactions ─────────────────────────────────────────────────
    listCabinetTransactions: b.query<PagedResponse<CabinetTransactionResponse>, { cabinetId: number; page?: number; size?: number; from?: string; to?: string }>({
      query: ({ cabinetId, page = 0, size = 20, from, to }) => {
        let url = `/transactions/cabinet/${cabinetId}?page=${page}&size=${size}`;
        if (from) url += `&from=${from}`;
        if (to) url += `&to=${to}`;
        return url;
      },
      transformResponse: (r: ApiResponse<PagedResponse<CabinetTransactionResponse>>) => r.data,
      providesTags: ['CabinetTransaction'],
    }),
  }),
});

export const {
  useListAssetTransactionsQuery,
  useListTransactionsByAssetQuery,
  useListTransactionsByUserQuery,
  useListAssetsOutQuery,
  useListOverdueAssetsQuery,
  useGetTransactionQuery,
  useRecordIssuanceMutation,
  useRecordReturnMutation,
  useListCabinetTransactionsQuery,
} = transactionApi;
