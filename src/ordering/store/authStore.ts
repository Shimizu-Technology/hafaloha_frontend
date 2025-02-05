// src/ordering/store/authStore.ts
import { create } from 'zustand';
import { api } from '../lib/api';
import type { User } from '../types/auth';

interface AuthStore {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => void;
}

export const useAuthStore = create<AuthStore>((set) => {
  // On store creation, rehydrate from localStorage if we have a stored user
  const storedUser = localStorage.getItem('user');
  const parsedUser: User | null = storedUser ? JSON.parse(storedUser) : null;

  return {
    user: parsedUser,
    loading: false,
    error: null,

    // SIGN IN
    signIn: async (email, password) => {
      set({ loading: true, error: null });
      try {
        // For example, Rails might return { jwt, user } with e.g. user.role
        const { jwt, user } = await api.post('/login', { email, password });

        // Save JWT and user to localStorage
        localStorage.setItem('token', jwt);
        localStorage.setItem('user', JSON.stringify(user));

        // Update state
        set({ user, loading: false, error: null });
      } catch (err: any) {
        set({ error: err.message, loading: false });
      }
    },

    // SIGN UP
    signUp: async (email, password, name) => {
      set({ loading: true, error: null });
      try {
        // Suppose we split "Full Name" into first/last
        const nameParts = name.trim().split(' ');
        const first_name = nameParts[0] || '';
        const last_name = nameParts.slice(1).join(' ') || '';

        const { jwt, user } = await api.post('/signup', {
          email,
          password,
          first_name,
          last_name
        });

        localStorage.setItem('token', jwt);
        localStorage.setItem('user', JSON.stringify(user));

        set({ user, loading: false, error: null });
      } catch (err: any) {
        set({ error: err.message, loading: false });
      }
    },

    // SIGN OUT
    signOut: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      set({ user: null, error: null, loading: false });
    }
  };
});
