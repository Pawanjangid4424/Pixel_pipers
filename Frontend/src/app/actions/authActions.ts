/**
 * Login / register API calls (Redux async thunks).
 *
 * Each thunk automatically dispatches pending → fulfilled / rejected actions,
 * which authSlice.ts listens to. On success the tokens and user are also saved in
 * localStorage so the user stays logged in after a refresh.
 *
 * NOTE: these endpoints (api/register/, api/login/) belong to a separate user server that is
 * not part of this repo. The Flask backend in /Backend only handles pipe counting.
 */
import axios from 'axios';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { RegisterUserPayload, LoginInput } from '@/lib/types';
import { showToast } from '@/lib/validators';

const jsonConfig = {
  headers: {
    'Content-Type': 'application/json',
  },
};

// Pick the most useful error message from an axios error
const getErrorMessage = (error: any): string =>
  error?.response?.data?.message || error?.response?.data?.msg || error?.message || 'Request failed';

export const registerUser = createAsyncThunk(
  'auth/register',
  async (
    { first_name, last_name, username, email, password, picture }: RegisterUserPayload,
    { rejectWithValue }
  ) => {
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/api/register/`,
        { first_name, last_name, username, email, password, picture },
        jsonConfig
      );

      localStorage.setItem('tokens', JSON.stringify(data.tokens));
      localStorage.setItem('user', JSON.stringify(data.user));

      return data;
    } catch (error: any) {
      const message = getErrorMessage(error);
      showToast(message, 'error');
      return rejectWithValue(message);
    }
  }
);

export const userLogin = createAsyncThunk(
  'auth/login',
  async ({ username, password }: LoginInput, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/api/login/`,
        { username, password },
        jsonConfig
      );

      localStorage.setItem('tokens', JSON.stringify(data.tokens));
      localStorage.setItem('user', JSON.stringify(data.user));

      return data;
    } catch (error: any) {
      // Before: error.response.data.msg crashed when the server was unreachable (no response)
      const message = getErrorMessage(error);
      showToast(message, 'error');
      return rejectWithValue(message);
    }
  }
);
