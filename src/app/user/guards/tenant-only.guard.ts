import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../../core/services/auths.service';

export const tenantOnlyGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const userType = authService.currentUser?.type?.toLowerCase();

  return userType === 'tenant' ? true : router.createUrlTree(['/dashboard']);
};
