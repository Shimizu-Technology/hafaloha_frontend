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

    // Used by signIn/signUp to store user & token
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
        // --- HERE: we explicitly add `restaurant_id: 1`
        const payload = {
          user: {
            email,
            password,
            password_confirmation: password,
            first_name: firstName,
            last_name: lastName,
            phone,
            restaurant_id: 1, // <--- Hard-coded for now
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

    // Allows updating user fields in local store w/o re-signing in
    updateUser: (updatedUser: User) => {
      localStorage.setItem('user', JSON.stringify(updatedUser));
      set({ user: updatedUser });
    },
  };
});
