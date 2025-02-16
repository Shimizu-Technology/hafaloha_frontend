// src/ordering/store/authStore.ts
import { create } from 'zustand';
import { api } from '../lib/api';
import type { User } from '../types/auth';

interface AuthStore {
  user: User | null;
  loading: boolean;
  error: string | null;

  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    phone: string
  ) => Promise<void>;
  signOut: () => void;

  // Reusable method that sets store + localStorage from an object { jwt, user }
  setUserFromResponse: (payload: { jwt: string; user: User }) => void;

  // NEW: For updating user fields without re-signing in
  updateUser: (updatedUser: User) => void;
}

export const useAuthStore = create<AuthStore>((set) => {
  const storedUser = localStorage.getItem('user');
  const parsedUser: User | null = storedUser ? JSON.parse(storedUser) : null;

  return {
    user: parsedUser,
    loading: false,
    error: null,

    // Existing helper for signIn / signUp
    setUserFromResponse: ({ jwt, user }) => {
      localStorage.setItem('token', jwt);
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, loading: false, error: null });
    },

    // SIGN IN
    signIn: async (email, password) => {
      set({ loading: true, error: null });
      try {
        const { jwt, user } = await api.post('/login', { email, password });
        useAuthStore.getState().setUserFromResponse({ jwt, user });
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
          },
        };
        const { jwt, user } = await api.post('/signup', payload);
        useAuthStore.getState().setUserFromResponse({ jwt, user });
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

    // NEW: updateUser => store the updated user in state + localStorage
    updateUser: (updatedUser: User) => {
      localStorage.setItem('user', JSON.stringify(updatedUser));
      set({ user: updatedUser });
    },
  };
});
