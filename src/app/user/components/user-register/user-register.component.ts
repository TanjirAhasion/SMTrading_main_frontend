import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  Validators,
} from '@angular/forms';

import { CreateUserRequest } from '../../models/create-user-request.model';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-user-register',
  standalone: false,
  templateUrl: './user-register.component.html',
  styleUrl: './user-register.component.css',
})
export class UserRegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);

  readonly isLoading = signal(false);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/),
      ],
    ],
    firstName: ['', [Validators.required]],
    lastName: [''],
    phone: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    avatarUrl: [''],
  });

  submit(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    this.userService.createUser(this.form.getRawValue() as CreateUserRequest).subscribe({
      next: () => {
        this.successMessage.set('User registered successfully.');
        this.form.reset();
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(this.getApiErrorMessage(error));
        this.isLoading.set(false);
      },
    });
  }

  isInvalid(controlName: keyof CreateUserRequest): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  hasError(controlName: keyof CreateUserRequest, errorName: string): boolean {
    return this.form.controls[controlName].hasError(errorName);
  }

  private getApiErrorMessage(error: any): string {
    const apiError = error?.error;

    if (typeof apiError === 'string') {
      return apiError;
    }

    if (apiError?.message) {
      return apiError.message;
    }

    if (apiError?.title) {
      return apiError.title;
    }

    if (apiError?.errors) {
      return this.flattenValidationErrors(apiError.errors);
    }

    return 'Registration failed. Please try again.';
  }

  private flattenValidationErrors(errors: Record<string, string[] | string>): string {
    return Object.values(errors)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .join(' ');
  }
}
