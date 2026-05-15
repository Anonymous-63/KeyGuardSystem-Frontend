import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import type { LoginRequest, LoginResponse, OperatorResponse } from '@/shared/types/api';

const ACCESS_KEY = 'kg_access_token';
const REFRESH_KEY = 'kg_refresh_token';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  operator: OperatorResponse | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  accessToken: localStorage.getItem(ACCESS_KEY),
  refreshToken: localStorage.getItem(REFRESH_KEY),
  operator: null,
  loading: false,
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      const { data } = await axios.post<{ success: boolean; data: LoginResponse }>(
        '/api/v1/auth/login',
        credentials,
      );
      return data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Login failed');
    }
  },
);

export const fetchMe = createAsyncThunk(
  'auth/me',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as { auth: AuthState };
    try {
      const { data } = await axios.get<{ success: boolean; data: OperatorResponse }>(
        '/api/v1/auth/me',
        { headers: { Authorization: `Bearer ${state.auth.accessToken}` } },
      );
      return data.data;
    } catch (err: any) {
      return rejectWithValue('Failed to fetch user');
    }
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.accessToken = null;
      state.refreshToken = null;
      state.operator = null;
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
    },
    setTokens(state, action: { payload: { accessToken: string; refreshToken: string } }) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      localStorage.setItem(ACCESS_KEY, action.payload.accessToken);
      localStorage.setItem(REFRESH_KEY, action.payload.refreshToken);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.operator = action.payload.operator;
        localStorage.setItem(ACCESS_KEY, action.payload.accessToken);
        localStorage.setItem(REFRESH_KEY, action.payload.refreshToken);
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.operator = action.payload;
      });
  },
});

export const { logout, setTokens } = authSlice.actions;
export default authSlice.reducer;
