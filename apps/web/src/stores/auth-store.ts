'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { api } from '@/lib/api-client';

interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
  tenantId: string;
  name?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setAuth: (data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  }) => void;
  setUser: (user: User) => void;
  logout: () => void;
  refreshAccessToken: () => Promise<boolean>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,

      setAuth: ({ user, accessToken, refreshToken }) => {
        api.setAccessToken(accessToken);
        api.setRefreshToken(refreshToken);
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      setUser: (user) => {
        set({ user });
      },

      logout: () => {
        api.setAccessToken(null);
        api.setRefreshToken(null);
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return false;

        try {
          const tokens = await api.refreshTokenRequest(refreshToken);
          api.setAccessToken(tokens.accessToken);
          api.setRefreshToken(tokens.refreshToken);
          set({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          });
          return true;
        } catch {
          get().logout();
          return false;
        }
      },

      initialize: async () => {
        const { accessToken, refreshToken } = get();

        // Register auth event callbacks with API client
        api.onAuthEvents({
          onTokenRefreshed: (tokens) => {
            set({
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
            });
          },
          onSessionExpired: () => {
            get().logout();
          },
        });

        if (!accessToken && !refreshToken) {
          set({ isLoading: false });
          return;
        }

        if (accessToken) {
          api.setAccessToken(accessToken);
          api.setRefreshToken(refreshToken);
          try {
            const userData = await api.getMe();
            const user: User = { ...userData, role: userData.role as 'admin' | 'user' };
            set({ user, isAuthenticated: true, isLoading: false });
          } catch {
            // Token might be expired, try refresh
            if (refreshToken) {
              const success = await get().refreshAccessToken();
              if (success) {
                try {
                  const userData = await api.getMe();
                  const user: User = { ...userData, role: userData.role as 'admin' | 'user' };
                  set({ user, isAuthenticated: true, isLoading: false });
                  return;
                } catch {
                  get().logout();
                }
              }
            } else {
              get().logout();
            }
          }
        } else if (refreshToken) {
          const success = await get().refreshAccessToken();
          if (success) {
            try {
              const userData = await api.getMe();
              const user: User = { ...userData, role: userData.role as 'admin' | 'user' };
              set({ user, isAuthenticated: true, isLoading: false });
              return;
            } catch {
              get().logout();
            }
          }
        }

        set({ isLoading: false });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    }
  )
);

