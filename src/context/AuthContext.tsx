import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { client, getToken, setToken, clearToken, setOnUnauthorized } from '../api/client';
import { AuthContextType, LoginCredentials, RegisterCredentials, TokenResponse } from '../types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [expirationMessage, setExpirationMessage] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const msg = sessionStorage.getItem('auth_expiration_message');
        if (msg) {
          sessionStorage.removeItem('auth_expiration_message');
          return msg;
        }
      } catch {
        // ignore storage errors
      }
    }
    return null;
  });

  let navigate: ReturnType<typeof useNavigate> | null = null;
  try {
    navigate = useNavigate();
  } catch {
    navigate = null;
  }

  useEffect(() => {
    setOnUnauthorized((message: string) => {
      clearToken();
      setTokenState(null);
      setExpirationMessage(message);
      if (navigate) {
        navigate('/login');
      } else if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    });

    return () => {
      setOnUnauthorized(null);
    };
  }, [navigate]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setExpirationMessage(null);
    const res = await client.post<TokenResponse>('/auth/login', credentials);
    setToken(res.access_token);
    setTokenState(res.access_token);
  }, []);

  const register = useCallback(async (credentials: RegisterCredentials) => {
    setExpirationMessage(null);
    const res = await client.post<TokenResponse>('/signup', credentials);
    setToken(res.access_token);
    setTokenState(res.access_token);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
    setExpirationMessage(null);
    if (navigate) {
      navigate('/login');
    } else if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }, [navigate]);

  const value: AuthContextType = {
    token,
    isAuthenticated: !!token,
    login,
    register,
    logout,
    expirationMessage,
    setExpirationMessage,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
