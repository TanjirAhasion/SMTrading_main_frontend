import { Injectable } from '@angular/core';

/**
 * TokenService
 *
 * Single responsibility: persist / retrieve / clear auth tokens.
 * Abstracting storage here means we can swap to httpOnly cookies
 * or in-memory storage without touching anything else.
 *
 * ⚠️  localStorage is used here for simplicity, but for high-security
 *     apps prefer httpOnly cookies (XSS-safe) via a backend endpoint.
 */
@Injectable({ providedIn: 'root' })
export class TokenService {
  private readonly ACCESS_KEY = 'auth.access_token';
  private readonly REFRESH_KEY = 'auth.refresh_token';

  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(this.ACCESS_KEY, accessToken);
    localStorage.setItem(this.REFRESH_KEY, refreshToken);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_KEY);
  }

  clearTokens(): void {
    localStorage.removeItem(this.ACCESS_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
  }

  hasValidToken(): boolean {
    return !!this.getAccessToken();
  }
}