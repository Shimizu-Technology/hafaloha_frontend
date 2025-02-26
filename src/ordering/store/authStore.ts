// src/ordering/store/authStore.ts

import { create } from 'zustand';
import { api } from '../lib/api';
import type { User } from '../types/auth';
import { isTokenExpired, getRestaurantId, decodeJwt } from '../../shared/utils/jwt';

interface AuthStore {
  user: User | null;
  loading: boolean;
  error: string | null;

  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string, phone: string) => Promise<void>;
  signOut: () => void;
  setUserFromResponse: (payload: { jwt: string; user: User }) => void;
  updateUser: (updatedUser: User) => void;

  // phone verification
  verifyPhone: (code: string) => Promise<void>;
  resendVerificationCode: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => {
  const store: AuthStore = {
    user: null,
    loading: false,
    error: null,

    setUserFromResponse: ({ jwt, user }) => {
      // Check if the token has a restaurant_id and add it to the user object if not present
      if (!user.restaurant_id) {
        const restaurantId = getRestaurantId(jwt);
        if (restaurantId) {
          user = { ...user, restaurant_id: restaurantId };
        }
      }
      
      // Save to localStorage so we persist across reloads
      localStorage.setItem('token', jwt);
      localStorage.setItem('user', JSON.stringify(user));

      // Update our store state
      set({ user, loading: false, error: null });
    },

    updateUser: (updatedUser) => {
      // Keep the user in localStorage in sync
      localStorage.setItem('user', JSON.stringify(updatedUser));
      set({ user: updatedUser });
    },

    // SIGN IN
    signIn: async (email, password) => {
      set({ loading: true, error: null });
      try {
        // POST /login => { jwt, user }
        const resp = await api.post('/login', { email, password });
        const { jwt, user } = resp;
        get().setUserFromResponse({ jwt, user });
      } catch (err: any) {
        set({ loading: false, error: err.message });
      }
    },

    // SIGN UP
    signUp: async (email, password, firstName, lastName, phone) => {
      set({ loading: true, error: null });
      try {
        const payload = {
          user: {
            email,
            password,
            password_confirmation: password,
            first_name: firstName,
            last_name: lastName,
            phone,
            restaurant_id: 1,
          },
        };
        // POST /signup => { jwt, user }
        const resp = await api.post('/signup', payload);
        const { jwt, user } = resp;
        get().setUserFromResponse({ jwt, user });
      } catch (err: any) {
        set({ loading: false, error: err.message });
      }
    },

    // SIGN OUT
    signOut: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      set({ user: null, loading: false, error: null });
    },

    // verifyPhone
    verifyPhone: async (code: string) => {
      set({ loading: true, error: null });
      try {
        // POST /verify_phone => { message, user }
        const resp = await api.verifyPhone(code);
        if (resp.user) {
          get().updateUser(resp.user); // phone_verified => true
        }
        set({ loading: false });
      } catch (err: any) {
        set({ loading: false, error: err.message });
        throw err;
      }
    },

    // resendVerificationCode
    resendVerificationCode: async () => {
      set({ loading: true, error: null });
      try {
        // POST /resend_code => { message: "..."}
        const resp = await api.resendCode();
        set({ loading: false });
        return resp;
      } catch (err: any) {
        set({ loading: false, error: err.message });
        throw err;
      }
    },
  };

  //
  // On store creation, rehydrate from localStorage if present
  //
  const existingToken = localStorage.getItem('token');
  const existingUser = localStorage.getItem('user');
  
  if (existingToken && existingUser) {
    // Check if token is expired
    if (isTokenExpired(existingToken)) {
      // Token is expired, clear localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } else {
      // Token is valid, restore user from localStorage
      let user = JSON.parse(existingUser) as User;
      
      // Check if user has restaurant_id, if not extract it from token
      if (!user.restaurant_id) {
        const restaurantId = getRestaurantId(existingToken);
        if (restaurantId) {
          user = { ...user, restaurant_id: restaurantId };
        }
      }
      
      // We only restore the user from localStorage. 
      // The token is read from localStorage by api.ts automatically.
      store.user = user;
    }
  }

  return store;
});
