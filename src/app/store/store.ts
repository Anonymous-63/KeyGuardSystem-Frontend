import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/features/auth/store/authSlice';
import locationReducer from '@/features/location/store/locationSlice';
import { locationApi } from '@/features/location/api/locationApi';
import { operatorApi } from '@/features/operator/api/operatorApi';
import { cabinetApi } from '@/features/cabinet/api/cabinetApi';
import { assetApi } from '@/features/asset/api/assetApi';
import { cabinetUserApi } from '@/features/cabinetUser/api/cabinetUserApi';
import { transactionApi } from '@/features/transaction/api/transactionApi';
import { assetGroupApi } from '@/features/assetGroup/api/assetGroupApi';
import { timeConstraintApi } from '@/features/timeConstraint/api/timeConstraintApi';
import { dashboardApi } from '@/features/dashboard/api/dashboardApi';
import { configApi } from '@/features/config/api/configApi';
import { abacApi } from '@/features/abac/api/abacApi';
import { auditApi } from '@/features/audit/api/auditApi';
import { rolesApi } from '@/features/roles/api/rolesApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    location: locationReducer,
    [locationApi.reducerPath]: locationApi.reducer,
    [operatorApi.reducerPath]: operatorApi.reducer,
    [cabinetApi.reducerPath]: cabinetApi.reducer,
    [assetApi.reducerPath]: assetApi.reducer,
    [cabinetUserApi.reducerPath]: cabinetUserApi.reducer,
    [transactionApi.reducerPath]: transactionApi.reducer,
    [assetGroupApi.reducerPath]: assetGroupApi.reducer,
    [timeConstraintApi.reducerPath]: timeConstraintApi.reducer,
    [dashboardApi.reducerPath]: dashboardApi.reducer,
    [configApi.reducerPath]: configApi.reducer,
    [abacApi.reducerPath]: abacApi.reducer,
    [auditApi.reducerPath]: auditApi.reducer,
    [rolesApi.reducerPath]: rolesApi.reducer,
  },
  middleware: (gDM) =>
    gDM()
      .concat(locationApi.middleware)
      .concat(operatorApi.middleware)
      .concat(cabinetApi.middleware)
      .concat(assetApi.middleware)
      .concat(cabinetUserApi.middleware)
      .concat(transactionApi.middleware)
      .concat(assetGroupApi.middleware)
      .concat(timeConstraintApi.middleware)
      .concat(dashboardApi.middleware)
      .concat(configApi.middleware)
      .concat(abacApi.middleware)
      .concat(auditApi.middleware)
      .concat(rolesApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
