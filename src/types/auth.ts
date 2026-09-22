export interface TokenResponse {
  access_token: string;
  token_type?: string;
}

export interface User {
  id?: string;
  email: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
}

export interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => void;
  expirationMessage: string | null;
  setExpirationMessage: (message: string | null) => void;
}
