import {
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { logout, setTokens } from '../features/auth/authSlice';

const ACCESS_KEY = 'kg_access_token';
const REFRESH_KEY = 'kg_refresh_token';

const rawBase = fetchBaseQuery({
  baseUrl: '/api/v1',
  prepareHeaders: (headers) => {
    const token = localStorage.getItem(ACCESS_KEY);
    if (token) headers.set('authorization', `Bearer ${token}`);
    return headers;
  },
});

export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extra) => {
  let result = await rawBase(args, api, extra);

  if (result.error?.status === 401) {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (refreshToken) {
      const refresh = await rawBase(
        { url: '/auth/refresh', method: 'POST', body: { refreshToken } },
        api,
        extra,
      );
      if (refresh.data) {
        const { accessToken, refreshToken: newRefresh } = (refresh.data as any).data;
        api.dispatch(setTokens({ accessToken, refreshToken: newRefresh }));
        result = await rawBase(args, api, extra);
      } else {
        api.dispatch(logout());
      }
    } else {
      api.dispatch(logout());
    }
  }

  return result;
};
