import {
  Component,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { AuthService } from '../../core/services/auths.service';
import { LoginRequest } from '../../core/models/auth.model';
import { FormsModule } from '@angular/forms';
import { TokenService } from '../../core/services/token.service';

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
  private tokenService = inject(TokenService);
  private readonly route = inject(ActivatedRoute);

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
      next: (res) => {

        this.tokenService.setTokens(res.accessToken, res.refreshToken);

        this.isLoading.set(false);
        window.location.href = this.returnUrl;
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Login failed');
        this.isLoading.set(false);
      }
    });
  }
}