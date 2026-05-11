import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import { locationApi } from '../features/location/locationApi';
import { operatorApi } from '../features/operator/operatorApi';
import { cabinetApi } from '../features/cabinet/cabinetApi';
import { assetApi } from '../features/asset/assetApi';
import { cabinetUserApi } from '../features/cabinetUser/cabinetUserApi';
import { transactionApi } from '../features/transaction/transactionApi';
import { assetGroupApi } from '../features/assetGroup/assetGroupApi';
import { timeConstraintApi } from '../features/timeConstraint/timeConstraintApi';
import { dashboardApi } from '../features/dashboard/dashboardApi';
import { configApi } from '../features/config/configApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
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
      .concat(configApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
