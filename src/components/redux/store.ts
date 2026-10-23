// src/redux/store.ts
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import { baseApi } from './api/baseApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(baseApi.middleware),
});

// RootState এবং AppDispatch টাইপ এক্সপোর্ট করা হলো হুক ব্যবহারের জন্য
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;