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
  type: string;
  Type?: string;
  tenantId: string;
  userId: string;
  name?: string;
  user?: AuthUser;
}

export interface AuthUser {
  id: string;
  email?: string;
  displayName: string;
  name?: string;
  roles: string[];
  tenantId?: string;
  type?: string;
  Type?: string;
}

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
