import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { map } from 'rxjs';

import { AuthUser } from '../../../core/models/auth.model';
import { AuthService } from '../../../core/services/auths.service';

type HeaderUser = AuthUser & {
  fullName?: string;
  name?: string;
  username?: string;
};

@Component({
  selector: 'app-header',
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  private readonly authService = inject(AuthService);

  readonly userName$ = this.authService.state$.pipe(
    map((state) => this.getDisplayName(state.user))
  );

  logout(event: Event): void {
    event.preventDefault();
    this.authService.logout();
  }

  private getDisplayName(user: AuthUser | null): string {
    if (!user) {
      return '';
    }

    const headerUser = user as HeaderUser;
    return headerUser.displayName || headerUser.fullName || headerUser.name || headerUser.username || headerUser.email || 'User';
  }
}
