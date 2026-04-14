import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const allowedRoles = (route.data?.['roles'] as string[] | undefined) ?? [];
  const userRole = auth.getRole();

  if (!userRole) {
    return router.createUrlTree(['/']);
  }

  if (allowedRoles.includes(userRole)) {
    return true;
  }

  return router.createUrlTree([auth.getRoleHomeRoute(userRole)]);
};
