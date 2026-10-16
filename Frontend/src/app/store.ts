/**
 * Redux store – the single place where global app state lives.
 *
 *  - auth : login / register state (user info + tokens)
 *  - file : pipe-counting state (loading flag, result image, pipe count)
 *
 * Components read state with `useAppSelector` and change it with `useAppDispatch`
 * (see ./hooks.ts).
 */
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import fileSlice from './slices/fileSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    file: fileSlice,
  },
  // Redux DevTools browser extension only works in development builds
  devTools: process.env.NODE_ENV !== 'production',
});

// Types used by the typed hooks in ./hooks.ts
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
