import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auths.service';

/**
 * authGuard (functional guard — Angular 14+)
 *
 * Protects routes that require authentication.
 * Usage in routing: canActivate: [authGuard]
 *
 * For role-based access, compose a separate roleGuard on top of this.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated) {
    return true;
  }

  // Preserve the attempted URL so we can redirect after login.
  return router.createUrlTree(['/auth/login'], {
    queryParams: { returnUrl: state.url },
  });
};