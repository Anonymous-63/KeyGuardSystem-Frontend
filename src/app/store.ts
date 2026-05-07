import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import { locationApi } from '../features/location/locationApi';
import { operatorApi } from '../features/operator/operatorApi';
import { cabinetApi } from '../features/cabinet/cabinetApi';
import { assetApi } from '../features/asset/assetApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [locationApi.reducerPath]: locationApi.reducer,
    [operatorApi.reducerPath]: operatorApi.reducer,
    [cabinetApi.reducerPath]: cabinetApi.reducer,
    [assetApi.reducerPath]: assetApi.reducer,
  },
  middleware: (gDM) =>
    gDM()
      .concat(locationApi.middleware)
      .concat(operatorApi.middleware)
      .concat(cabinetApi.middleware)
      .concat(assetApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
