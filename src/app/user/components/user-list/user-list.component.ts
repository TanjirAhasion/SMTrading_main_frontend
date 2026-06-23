import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

import { CreateUserRequest } from '../../models/create-user-request.model';
import { UserListItem } from '../../models/user-list-item.model';
import { UserService } from '../../services/user.service';
import { createEmptyToast, ToastController, ToastState, ToastType } from '../../../service/common/toast-helper';

@Component({
  selector: 'app-user-list',
  standalone: false,
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.css',
})
export class UserListComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);

  readonly users = signal<UserListItem[]>([]);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  showForm = false;
  search = '';
  page = 1;
  pageSize = 10;
  toast: ToastState = createEmptyToast();
  private readonly toastController = new ToastController();

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

  ngOnInit(): void {
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.toastController.destroy();
  }

  loadUsers(): void {
    this.isLoading.set(true);

    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users.set(users ?? []);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.showToast('danger', 'Load Failed', this.getApiErrorMessage(error));
        this.isLoading.set(false);
      },
    });
  }

  get filteredUsers(): UserListItem[] {
    const term = this.search.trim().toLowerCase();

    if (!term) {
      return this.users();
    }

    return this.users().filter((user) =>
      this.getDisplayName(user).toLowerCase().includes(term)
      || user.username?.toLowerCase().includes(term)
      || user.email?.toLowerCase().includes(term)
      || user.phone?.toLowerCase().includes(term)
    );
  }

  get totalCount(): number {
    return this.filteredUsers.length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  get pagedUsers(): UserListItem[] {
    const currentPage = Math.min(this.page, this.totalPages);
    const start = (currentPage - 1) * this.pageSize;

    return this.filteredUsers.slice(start, start + this.pageSize);
  }

  get pageStart(): number {
    return this.totalCount === 0 ? 0 : ((Math.min(this.page, this.totalPages) - 1) * this.pageSize) + 1;
  }

  get pageEnd(): number {
    return Math.min(Math.min(this.page, this.totalPages) * this.pageSize, this.totalCount);
  }

  get tenantCount(): number {
    return this.users().filter((user) => user.type?.toLowerCase() === 'tenant').length;
  }

  get nonTenantCount(): number {
    return this.users().length - this.tenantCount;
  }

  onSearch(): void {
    this.page = 1;
  }

  resetFilters(): void {
    this.search = '';
    this.page = 1;
  }

  onPageChange(newPage: number): void {
    if (newPage < 1 || newPage > this.totalPages) {
      return;
    }

    this.page = newPage;
  }

  getDisplayName(user: UserListItem): string {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    return fullName || user.name || user.username || 'User';
  }

  openForm(): void {
    this.form.reset();
    this.showForm = true;
  }

  cancel(): void {
    this.showForm = false;
    this.form.reset();
    this.isSaving.set(false);
  }

  saveUser(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.showToast('warning', 'Validation Error', 'Please complete the required fields.');
      return;
    }

    this.isSaving.set(true);

    this.userService.createUser(this.form.getRawValue() as CreateUserRequest).subscribe({
      next: () => {
        this.cancel();
        this.loadUsers();
        this.showToast('success', 'Success', 'User created successfully.');
      },
      error: (error) => {
        this.isSaving.set(false);
        this.showToast('danger', 'Save Failed', this.getApiErrorMessage(error));
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

  showToast(type: ToastType, title: string, message: string): void {
    this.toastController.show(type, title, message, (toast) => this.toast = toast, () => this.closeToast());
  }

  closeToast(): void {
    this.toastController.close((toast) => this.toast = toast);
  }

  private getApiErrorMessage(error: any): string {
    const apiError = error?.error;

    if (typeof apiError === 'string') {
      return apiError;
    }

    if (apiError?.errors) {
      return this.flattenValidationErrors(apiError.errors);
    }

    return apiError?.message ?? apiError?.title ?? 'Failed to load users.';
  }

  private flattenValidationErrors(errors: Record<string, string[] | string>): string {
    return Object.values(errors)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .join(' ');
  }
}
