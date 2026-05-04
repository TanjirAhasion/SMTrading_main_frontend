// ─────────────────────────────────────────────
// Domain models — keep these free of Angular deps
// ─────────────────────────────────────────────

export interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
  user: AuthUser;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
}

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}