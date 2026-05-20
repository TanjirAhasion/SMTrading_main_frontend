import {
  Component,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../core/services/auths.service';
import { LoginRequest } from '../../core/models/auth.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.html',
  styleUrl: './login.css'
})

export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  login: LoginRequest = {
    username: '',
    password: '',
    rememberMe:false
  };

  private get returnUrl(): string {
    return this.route.snapshot.queryParams['returnUrl'] ?? '/dashboard';
  }

  onLogin(request: LoginRequest): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.authService.login(request).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigateByUrl(this.returnUrl);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Login failed');
        this.isLoading.set(false);
      }
    });
  }
}
