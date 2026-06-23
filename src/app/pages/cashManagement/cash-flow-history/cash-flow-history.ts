import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { CashAccountDto, CashAccountService } from '../../../service/cash-management/cash-account.service';
import {
  CashTransactionDto,
  CashTransactionService,
  TransactionSource,
  TransactionType
} from '../../../service/cash-management/cash-transaction.service';
import { PagedResult } from '../../../service/cash-management/cash-transfer.service';
import { createEmptyToast, ToastController, ToastState, ToastType } from '../../../service/common/toast-helper';

@Component({
  selector: 'app-cash-flow-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cash-flow-history.html',
  styleUrl: './cash-flow-history.css'
})
export class CashFlowHistory implements OnInit, OnDestroy {
  readonly transactionTypes = [
    { id: TransactionType.CashIn, name: 'Cash In' },
    { id: TransactionType.CashOut, name: 'Cash Out' }
  ];
  readonly sourceTypes = [
    { id: TransactionSource.SalePayment, name: 'Sale Payment' },
    { id: TransactionSource.SaleDueCollection, name: 'Sale Due Collection' },
    { id: TransactionSource.PurchasePayment, name: 'Purchase Payment' },
    { id: TransactionSource.PurchaseDuePayment, name: 'Purchase Due Payment' },
    { id: TransactionSource.VendorPayment, name: 'Vendor Payment' },
    { id: TransactionSource.RentalIncome, name: 'Rental Income' },
    { id: TransactionSource.RentalSecurityDeposit, name: 'Rental Security Deposit' },
    { id: TransactionSource.Expense, name: 'Expense' },
    { id: TransactionSource.Salary, name: 'Salary' },
    { id: TransactionSource.ShopRent, name: 'Shop Rent' },
    { id: TransactionSource.CashTransfer, name: 'Cash Transfer' },
    { id: TransactionSource.OpeningBalance, name: 'Opening Balance' },
    { id: TransactionSource.Adjustment, name: 'Adjustment' },
    { id: TransactionSource.Other, name: 'Other' }
  ];

  cashAccounts: CashAccountDto[] = [];
  transactions: CashTransactionDto[] = [];
  loading = false;
  page = 1;
  pageSize = 10;
  totalCount = 0;
  totalPages = 1;

  fromDate = this.toDateInputValue(new Date());
  toDate = this.toDateInputValue(new Date());
  cashAccountId: number | null = null;
  transactionType: number | null = null;
  sourceType: number | null = null;
  referenceNumber = '';
  amountFrom: number | null = null;
  amountTo: number | null = null;
  createdBy = '';
  keyword = '';

  toast: ToastState = createEmptyToast();
  private readonly toastController = new ToastController();

  constructor(
    private transactionService: CashTransactionService,
    private cashAccountService: CashAccountService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadPageData();
  }

  ngOnDestroy(): void {
    this.toastController.destroy();
  }

  get pageStart(): number {
    return this.totalCount === 0 ? 0 : ((Math.min(this.page, this.totalPages) - 1) * this.pageSize) + 1;
  }

  get pageEnd(): number {
    return Math.min(Math.min(this.page, this.totalPages) * this.pageSize, this.totalCount);
  }

  get cashInAmount(): number {
    return this.transactions
      .filter((item) => Number(item.transactionType) === TransactionType.CashIn)
      .reduce((total, item) => total + (Number(item.amount) || 0), 0);
  }

  get cashOutAmount(): number {
    return this.transactions
      .filter((item) => Number(item.transactionType) === TransactionType.CashOut)
      .reduce((total, item) => total + (Number(item.amount) || 0), 0);
  }

  loadPageData(): void {
    this.loading = true;
    forkJoin({
      accounts: this.cashAccountService.getAll(),
      transactions: this.transactionService.getCashFlowHistory(this.buildFilter())
    }).subscribe({
      next: ({ accounts, transactions }) => {
        this.cashAccounts = accounts || [];
        this.applyPagedResult(transactions);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading cash flow history', err);
        this.loading = false;
        this.showToast('danger', 'Load Failed', 'Unable to load cash flow history.');
      }
    });
  }

  searchHistory(): void {
    this.page = 1;
    this.loadHistory();
  }

  loadHistory(): void {
    this.loading = true;
    this.transactionService.getCashFlowHistory(this.buildFilter()).subscribe({
      next: (result) => {
        this.applyPagedResult(result);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading cash flow history', err);
        this.loading = false;
        this.showToast('danger', 'Load Failed', 'Unable to load cash flow history.');
      }
    });
  }

  resetFilters(): void {
    const today = this.toDateInputValue(new Date());
    this.fromDate = today;
    this.toDate = today;
    this.cashAccountId = null;
    this.transactionType = null;
    this.sourceType = null;
    this.referenceNumber = '';
    this.amountFrom = null;
    this.amountTo = null;
    this.createdBy = '';
    this.keyword = '';
    this.page = 1;
    this.loadHistory();
  }

  onPageChange(newPage: number): void {
    if (newPage < 1 || newPage > this.totalPages) return;

    this.page = newPage;
    this.loadHistory();
  }

  getTransactionTypeName(type: number | undefined): string {
    return this.transactionTypes.find((item) => item.id === Number(type))?.name || '-';
  }

  getSourceTypeName(type: number | undefined): string {
    return this.sourceTypes.find((item) => item.id === Number(type))?.name || '-';
  }

  getTransactionBadgeClass(type: number | undefined): string {
    return Number(type) === TransactionType.CashOut ? 'badge-danger' : 'badge-success';
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

  private applyPagedResult(result: PagedResult<CashTransactionDto>): void {
    this.transactions = result.items || [];
    this.totalCount = result.totalCount || 0;
    this.totalPages = Math.max(1, result.totalPages || Math.ceil(this.totalCount / this.pageSize));
  }

  private buildFilter() {
    return {
      page: this.page,
      pageSize: this.pageSize,
      fromDate: this.fromDate || null,
      toDate: this.toDate || null,
      cashAccountId: this.cashAccountId,
      transactionType: this.transactionType,
      sourceType: this.sourceType,
      referenceNumber: this.referenceNumber.trim() || null,
      amountFrom: this.amountFrom,
      amountTo: this.amountTo,
      createdBy: this.createdBy.trim() || null,
      keyword: this.keyword.trim() || null
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
