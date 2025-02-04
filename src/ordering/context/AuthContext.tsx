import React, { createContext, useContext, useState } from 'react';
import { api } from '../lib/api';
import type { User, AuthState } from '../types/auth';

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: false,
    error: null,
  });

  // LOGIN
  const signIn = async (email: string, password: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      // Example: Rails POST /login => { jwt: string, user: {...} }
      const { jwt, user } = await api.post('/login', { email, password });
      // Save token for future requests
      localStorage.setItem('token', jwt);
      setState({ user, loading: false, error: null });
    } catch (error: any) {
      setState({
        user: null,
        loading: false,
        error: error.message || 'Failed to sign in',
      });
    }
  };

  // SIGNUP
  const signUp = async (email: string, password: string, name: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      // e.g., if your backend requires first_name/last_name
      // or just name. Adjust accordingly:
      const nameParts = name.trim().split(' ');
      const first_name = nameParts[0];
      const last_name = nameParts.slice(1).join(' ');

      // Example: Rails POST /signup => { jwt: string, user: {...} }
      const { jwt, user } = await api.post('/signup', {
        email,
        password,
        // password_confirmation: password,
        first_name,
        last_name
      });
      localStorage.setItem('token', jwt);
      setState({ user, loading: false, error: null });
    } catch (error: any) {
      setState({
        user: null,
        loading: false,
        error: error.message || 'Failed to sign up',
      });
    }
  };

  // SIGNOUT
  const signOut = async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      // If you have a /logout endpoint, call it. Otherwise, just remove the token:
      localStorage.removeItem('token');
      setState({ user: null, loading: false, error: null });
    } catch (error: any) {
      setState((s) => ({
        ...s,
        loading: false,
        error: error.message || 'Failed to sign out',
      }));
    }
  };

  // UPDATE PROFILE
  const updateProfile = async (data: Partial<User>) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      if (!state.user) throw new Error('Not authenticated');
      // Example call: PATCH /users/:id
      // Adjust fields as needed:
      const updated = await api.patch(`/users/${state.user.id}`, {
        user: data
      });
      setState((s) => ({
        ...s,
        loading: false,
        user: { ...s.user!, ...updated },
      }));
    } catch (error: any) {
      setState((s) => ({
        ...s,
        loading: false,
        error: error.message || 'Failed to update profile',
      }));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signUp,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
