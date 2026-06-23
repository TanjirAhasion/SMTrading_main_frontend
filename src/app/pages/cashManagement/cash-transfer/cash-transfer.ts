import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { CashAccountDto, CashAccountService } from '../../../service/cash-management/cash-account.service';
import { CashTransferDto, CashTransferService, PagedResult } from '../../../service/cash-management/cash-transfer.service';
import { createEmptyToast, ToastController, ToastState, ToastType } from '../../../service/common/toast-helper';

@Component({
  selector: 'app-cash-transfer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cash-transfer.html',
  styleUrl: './cash-transfer.css'
})
export class CashTransfer implements OnInit, OnDestroy {
  cashAccounts: CashAccountDto[] = [];
  transfers: CashTransferDto[] = [];
  transfer: Partial<CashTransferDto> = this.getEmptyTransfer();
  selectedTransferDetails: CashTransferDto | null = null;
  showForm = false;
  loading = false;
  page = 1;
  pageSize = 10;
  totalCount = 0;
  totalPages = 1;
  search = '';
  fromDate = '';
  toDate = '';
  cashAccountId: number | null = null;
  toast: ToastState = createEmptyToast();
  private readonly toastController = new ToastController();

  constructor(
    private transferService: CashTransferService,
    private cashAccountService: CashAccountService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadPageData();
  }

  ngOnDestroy(): void {
    this.toastController.destroy();
  }

  get activeCashAccounts(): CashAccountDto[] {
    return this.cashAccounts.filter((item) => item.isActive);
  }

  get selectedFromAccount(): CashAccountDto | undefined {
    return this.cashAccounts.find((account) => account.id === Number(this.transfer.fromCashAccountId));
  }

  get selectedToAccount(): CashAccountDto | undefined {
    return this.cashAccounts.find((account) => account.id === Number(this.transfer.toCashAccountId));
  }

  get selectedFromBalance(): number {
    return Number(this.selectedFromAccount?.currentBalance) || 0;
  }

  get selectedToBalance(): number {
    return Number(this.selectedToAccount?.currentBalance) || 0;
  }

  get isAmountOverCurrentBalance(): boolean {
    if (!this.transfer.fromCashAccountId || !this.transfer.amount) return false;

    return Number(this.transfer.amount) > this.selectedFromBalance;
  }

  get isSameAccount(): boolean {
    return !!this.transfer.fromCashAccountId
      && !!this.transfer.toCashAccountId
      && Number(this.transfer.fromCashAccountId) === Number(this.transfer.toCashAccountId);
  }

  get pageStart(): number {
    return this.totalCount === 0 ? 0 : ((Math.min(this.page, this.totalPages) - 1) * this.pageSize) + 1;
  }

  get pageEnd(): number {
    return Math.min(Math.min(this.page, this.totalPages) * this.pageSize, this.totalCount);
  }

  loadPageData(): void {
    this.loading = true;
    forkJoin({
      accounts: this.cashAccountService.getAll(),
      transfers: this.transferService.getPaged(this.buildFilter())
    }).subscribe({
      next: ({ accounts, transfers }) => {
        this.cashAccounts = accounts || [];
        this.applyPagedResult(transfers);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading cash transfers', err);
        this.loading = false;
        this.showToast('danger', 'Load Failed', 'Unable to load cash transfers.');
      }
    });
  }

  searchTransfers(): void {
    this.page = 1;
    this.loadTransfers();
  }

  resetFilters(): void {
    this.search = '';
    this.fromDate = '';
    this.toDate = '';
    this.cashAccountId = null;
    this.page = 1;
    this.loadTransfers();
  }

  loadTransfers(): void {
    this.loading = true;
    this.transferService.getPaged(this.buildFilter()).subscribe({
      next: (result) => {
        this.applyPagedResult(result);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading cash transfers', err);
        this.loading = false;
        this.showToast('danger', 'Load Failed', 'Unable to load cash transfers.');
      }
    });
  }

  onPageChange(newPage: number): void {
    if (newPage < 1 || newPage > this.totalPages) return;

    this.page = newPage;
    this.loadTransfers();
  }

  openForm(): void {
    this.transfer = this.getEmptyTransfer();
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
  }

  openDetails(item: CashTransferDto): void {
    this.selectedTransferDetails = item;
  }

  closeDetails(): void {
    this.selectedTransferDetails = null;
  }

  saveTransfer(): void {
    if (!this.transfer.fromCashAccountId || !this.transfer.toCashAccountId) {
      this.showToast('warning', 'Validation Error', 'From and To cash accounts are required.');
      return;
    }

    if (this.isSameAccount) {
      this.showToast('warning', 'Validation Error', 'From and To accounts must be different.');
      return;
    }

    if (!this.transfer.transferDate) {
      this.showToast('warning', 'Validation Error', 'Transfer date is required.');
      return;
    }

    if (!this.transfer.amount || Number(this.transfer.amount) <= 0) {
      this.showToast('warning', 'Validation Error', 'Amount must be greater than zero.');
      return;
    }

    if (this.isAmountOverCurrentBalance) {
      this.showToast('warning', 'Insufficient Balance', `Transfer amount cannot be more than ${this.formatNumber(this.selectedFromBalance)}.`);
      return;
    }

    const payload: Partial<CashTransferDto> = {
      fromCashAccountId: Number(this.transfer.fromCashAccountId),
      toCashAccountId: Number(this.transfer.toCashAccountId),
      transferDate: this.transfer.transferDate,
      amount: Number(this.transfer.amount),
      note: this.transfer.note?.trim() || null
    };

    this.transferService.create(payload).subscribe({
      next: () => {
        this.showForm = false;
        this.transfer = this.getEmptyTransfer();
        this.loadPageData();
        this.showToast('success', 'Success', 'Cash transfer completed successfully.');
      },
      error: (err) => {
        console.error('Error saving cash transfer', err);
        this.showToast('danger', 'Transfer Failed', err?.error?.message || 'Unable to complete cash transfer.');
      }
    });
  }

  getAccountName(id: number | undefined, fallback?: string | null): string {
    if (fallback) return fallback;

    return this.cashAccounts.find((account) => account.id === Number(id))?.name || '-';
  }

  formatDate(value: string | Date | undefined): string {
    if (!value) return '-';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';

    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatNumber(value: number | undefined): string {
    return (Number(value) || 0).toFixed(2);
  }

  closeToast(): void {
    this.toastController.close((toast) => this.toast = toast);
  }

  showToast(type: ToastType, title: string, message: string): void {
    this.toastController.show(type, title, message, (toast) => this.toast = toast, () => this.closeToast());
  }

  private applyPagedResult(result: PagedResult<CashTransferDto>): void {
    this.transfers = result.items || [];
    this.totalCount = result.totalCount || 0;
    this.totalPages = Math.max(1, result.totalPages || Math.ceil(this.totalCount / this.pageSize));
  }

  private buildFilter() {
    return {
      page: this.page,
      pageSize: this.pageSize,
      search: this.search.trim() || null,
      fromDate: this.fromDate || null,
      toDate: this.toDate || null,
      cashAccountId: this.cashAccountId
    };
  }

  private getEmptyTransfer(): Partial<CashTransferDto> {
    return {
      fromCashAccountId: undefined,
      toCashAccountId: undefined,
      amount: 0,
      transferDate: this.toDateInputValue(new Date()),
      note: ''
    };
  }

  private toDateInputValue(value: string | Date | undefined): string {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
