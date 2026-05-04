import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap, catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { TokenService } from './token.service';
import { AuthState, AuthUser, LoginRequest, LoginResponse } from '../models/auth.model';

const INITIAL_STATE: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

/**
 * AuthService
 *
 * Owns the auth lifecycle: login, logout, token refresh.
 * Exposes an Observable<AuthState> so any component can reactively
 * subscribe without polling or prop drilling.
 *
 * Pattern: BehaviorSubject as a lightweight state store.
 * At scale you'd replace this with NgRx or a Signal Store.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokenService = inject(TokenService);

  private readonly _state$ = new BehaviorSubject<AuthState>(INITIAL_STATE);

  /** Public read-only stream — components subscribe, never mutate. */
  readonly state$: Observable<AuthState> = this._state$.asObservable();

  // ── Convenience selectors ──────────────────────────────────────────
  get isAuthenticated(): boolean {
    return this._state$.value.isAuthenticated;
  }

  get currentUser(): AuthUser | null {
    return this._state$.value.user;
  }

  // ── Actions ───────────────────────────────────────────────────────

  login(request: LoginRequest): Observable<LoginResponse> {
    this.patch({ isLoading: true, error: null });

    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/v1/auth/login`, request)
      .pipe(
        tap((response) => this.onLoginSuccess(response)),
        catchError((err) => {
          const message = err?.error?.message ?? 'Login failed. Please try again.';
          this.patch({ isLoading: false, error: message });
          return throwError(() => new Error(message));
        })
      );
  }

  logout(): void {
    this.tokenService.clearTokens();
    this._state$.next(INITIAL_STATE);
    this.router.navigate(['/auth/login']);
  }

  /** Call on app bootstrap to rehydrate state from stored token. */
  rehydrate(): void {
    const token = this.tokenService.getAccessToken();
    if (token) {
      // In a real app, validate/decode the JWT here (e.g., jwt-decode).
      // For brevity we just mark as authenticated.
      this.patch({ accessToken: token, isAuthenticated: true });
    }
  }

  // ── Private helpers ───────────────────────────────────────────────

  private onLoginSuccess(response: LoginResponse): void {
    this.tokenService.setTokens(response.accessToken, response.refreshToken);
    this.patch({
      user: response.user,
      accessToken: response.accessToken,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
    this.router.navigate(['/dashboard']);
  }

  private patch(partial: Partial<AuthState>): void {
    this._state$.next({ ...this._state$.value, ...partial });
  }
}