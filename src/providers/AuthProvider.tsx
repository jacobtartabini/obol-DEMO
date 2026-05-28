import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback } from 'react';
import { AuthContextType, AuthState } from '@/types/auth';
import { resetDemoData } from '@/demo/store';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: true,
    isLoading: true,
    error: null,
    identity: { user: 'demo-user' },
    userKey: 'demo-user',
  });

  useEffect(() => {
    // Demo auth boots immediately as signed-in.
    setAuthState((s) => ({ ...s, isLoading: false }));
  }, []);

  const verifyAuth = useCallback(async (): Promise<boolean> => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
    setAuthState({
      isAuthenticated: true,
      isLoading: false,
      error: null,
      identity: { user: 'demo-user' },
      userKey: 'demo-user',
    });
    return true;
  }, []);

  const logout = useCallback(() => {
    // Demo logout == reset demo data.
    resetDemoData();
    // Keep behavior simple + robust: reload the SPA.
    window.location.reload();
  }, []);

  const contextValue: AuthContextType = useMemo(
    () => ({
      ...authState,
      verifyAuth,
      logout,
    }),
    [authState, verifyAuth, logout],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export function useUserKey(): string | null {
  const { userKey, isAuthenticated } = useAuth();
  return isAuthenticated ? userKey : null;
}
