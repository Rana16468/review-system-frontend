// src/redux/slices/authSlice.ts
import { tokenVarified } from '@/src/utility/authToken';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'STUDENT' | 'MENTOR';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

// লোকাল স্টোরেজ থেকে ইনিশিয়াল স্টেট রিড করার চেষ্টা (যদি ব্রাউজারে থাকে)
const getInitialState = (): AuthState => {
  if (typeof window !== 'undefined') {
    const tokenName = process.env.NEXT_PUBLIC_TOKEN_NAME || 'token';
    const token = localStorage.getItem(tokenName);

    if (token) {
      // tokenVarified ফাংশন যদি ডিকোড করে অবজেক্ট দেয়, তবে সরাসরি ব্যবহার করুন (JSON.parse লাগবে না)
      const decodedUser = tokenVarified(tokenName) as unknown as User;

      if (decodedUser) {
        return {
          token,
          user: decodedUser,
          isAuthenticated: true,
        };
      }
    }
  }
  return {
    user: null,
    token: null,
    isAuthenticated: false,
  };
};

const initialState: AuthState = getInitialState();

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;

      if (typeof window !== 'undefined') {
        const tokenName = process.env.NEXT_PUBLIC_TOKEN_NAME || 'token';
        localStorage.setItem(tokenName, action.payload.token);
      }
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;


      if (typeof window !== 'undefined') {
        const tokenName = process.env.NEXT_PUBLIC_TOKEN_NAME || 'token';
        localStorage.removeItem(tokenName);
      }
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;