import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { TokenService } from '../services/token.service';
import { AuthService } from '../services/auths.service';

/**
 * authInterceptor (functional interceptor — Angular 15+)
 *
 * Responsibilities:
 *   1. Attach Authorization header to every API request.
 *   2. Intercept 401 responses and force logout (token expired/invalid).
 *
 * Register in app.config.ts:
 *   provideHttpClient(withInterceptors([authInterceptor]))
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const authService = inject(AuthService);

  const token = tokenService.getAccessToken();

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Token expired — log out and redirect to login.
        authService.logout();
      }
      return throwError(() => error);
    })
  );
};