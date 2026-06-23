import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CashAccountDto,
  CashAccountService,
  CashAccountType,
  MobileBankType
} from '../../../service/cash-management/cash-account.service';
import { PdfService } from '../../../service/common/pdf.service';
import { ExcelService } from '../../../service/common/excel.service';
import { PrintService } from '../../../service/common/print.service';
import {
  CashTransactionDto,
  CashTransactionService,
  TransactionSource,
  TransactionType
} from '../../../service/cash-management/cash-transaction.service';
import { createEmptyToast, ToastController, ToastState, ToastType } from '../../../service/common/toast-helper';

@Component({
  selector: 'app-cash-account',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cash-account.html',
  styleUrl: './cash-account.css',
})
export class CashAccount implements OnInit, OnDestroy {
  accounts: CashAccountDto[] = [];
  account: Partial<CashAccountDto> = this.getEmptyAccount();
  showForm = false;
  showHistoryModal = false;
  loading = false;
  historyLoading = false;
  isEditMode = false;
  selectedId: number | null = null;
  selectedHistoryAccount: CashAccountDto | null = null;
  selectedHistoryTransaction: CashTransactionDto | null = null;
  historyTransactions: CashTransactionDto[] = [];
  historyPage = 1;
  historyPageSize = 10;
  historyTotalCount = 0;
  historyTotalPages = 1;
  search = '';
  page = 1;
  pageSize = 10;
  accountTypes = [
    { value: CashAccountType.Cash, label: 'Cash' },
    { value: CashAccountType.Bank, label: 'Bank' },
    { value: CashAccountType.MobileBanking, label: 'Mobile Bank' },
    { value: CashAccountType.Others, label: 'Others' }
  ];
  mobileBankTypes = [
    { value: MobileBankType.Bkash, label: 'Bkash' },
    { value: MobileBankType.Nagad, label: 'Nagad' },
    { value: MobileBankType.Rocket, label: 'Rocket' },
    { value: MobileBankType.Others, label: 'Others' }
  ];
  readonly cashAccountType = CashAccountType;
  toast: ToastState = createEmptyToast();
  private readonly toastController = new ToastController();

  constructor(
    private cashAccountService: CashAccountService,
    private cashTransactionService: CashTransactionService,
    private pdfService: PdfService,
    private excelService: ExcelService,
    private printService: PrintService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadAccounts();
  }

  ngOnDestroy(): void {
    this.toastController.destroy();
  }

  get filteredAccounts(): CashAccountDto[] {
    const term = this.search.trim().toLowerCase();

    if (!term) return this.accounts;

    return this.accounts.filter((item) =>
      item.name?.toLowerCase().includes(term)
      || this.getAccountTypeName(item).toLowerCase().includes(term)
      || (item.accountNumber || '').toLowerCase().includes(term)
      || (item.accountHolderName || '').toLowerCase().includes(term)
      || (item.bankName || '').toLowerCase().includes(term)
      || (item.branchName || '').toLowerCase().includes(term)
      || (item.isActive ? 'active' : 'inactive').includes(term)
    );
  }

  get totalCount(): number {
    return this.filteredAccounts.length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  get pagedAccounts(): CashAccountDto[] {
    const currentPage = Math.min(this.page, this.totalPages);
    const start = (currentPage - 1) * this.pageSize;

    return this.filteredAccounts.slice(start, start + this.pageSize);
  }

  get pageStart(): number {
    return this.totalCount === 0 ? 0 : ((Math.min(this.page, this.totalPages) - 1) * this.pageSize) + 1;
  }

  get pageEnd(): number {
    return Math.min(Math.min(this.page, this.totalPages) * this.pageSize, this.totalCount);
  }

  get activeCount(): number {
    return this.accounts.filter((item) => item.isActive).length;
  }

  get defaultCount(): number {
    return this.accounts.filter((item) => item.isDefault).length;
  }

  get totalCurrentBalance(): number {
    return this.accounts.reduce((total, item) => total + (Number(item.currentBalance) || 0), 0);
  }

  get historyPageCashIn(): number {
    return this.historyTransactions
      .filter((item) => Number(item.transactionType) === TransactionType.CashIn)
      .reduce((total, item) => total + (Number(item.amount) || 0), 0);
  }

  get historyPageCashOut(): number {
    return this.historyTransactions
      .filter((item) => Number(item.transactionType) === TransactionType.CashOut)
      .reduce((total, item) => total + (Number(item.amount) || 0), 0);
  }

  get historyPageNetChange(): number {
    return this.historyPageCashIn - this.historyPageCashOut;
  }

  get historyAccountOpeningBalance(): number {
    return Number(this.selectedHistoryAccount?.openingBalance) || 0;
  }

  get historyAccountCurrentBalance(): number {
    return Number(this.selectedHistoryAccount?.currentBalance) || 0;
  }

  loadAccounts(): void {
    this.loading = true;
    this.cashAccountService.getAll().subscribe({
      next: (res) => {
        this.accounts = [...res];
        this.page = Math.min(this.page, this.totalPages);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading cash accounts', err);
        this.loading = false;
        this.showToast('danger', 'Load Failed', 'Unable to load cash accounts.');
      }
    });
  }

  onSearch(): void {
    this.page = 1;
  }

  resetFilters(): void {
    this.search = '';
    this.page = 1;
  }

  onPageChange(newPage: number): void {
    if (newPage < 1 || newPage > this.totalPages) return;

    this.page = newPage;
  }

  onAccountTypeChange(): void {
    if (this.account.accountType !== CashAccountType.MobileBanking) {
      this.account.mobileBankType = null;
    }

    if (this.account.accountType !== CashAccountType.Bank) {
      this.account.bankName = null;
      this.account.branchName = null;
    }
  }

  downloadExcel(): void {
    const rows = this.filteredAccounts.map((x, index) => ({
      SL: index + 1,
      Name: x.name,
      Type: this.getAccountTypeName(x),
      AccountNo: x.accountNumber || '-',
      Holder: x.accountHolderName || '-',
      OpeningBalance: this.formatNumber(x.openingBalance),
      CurrentBalance: this.formatNumber(x.currentBalance),
      Default: x.isDefault ? 'Yes' : 'No',
      Status: x.isActive ? 'Active' : 'Inactive'
    }));

    this.excelService.exportToExcel(rows, 'cash-account-report');
  }

  downloadPdf(): void {
    const columns = [
      { header: 'SL', field: 'sl' },
      { header: 'Name', field: 'name' },
      { header: 'Type', field: 'type' },
      { header: 'Account No', field: 'accountNo' },
      { header: 'Opening', field: 'opening' },
      { header: 'Current', field: 'current' },
      { header: 'Default', field: 'isDefault' },
      { header: 'Status', field: 'status' }
    ];

    const rows = this.filteredAccounts.map((x, index) => ({
      sl: index + 1,
      name: x.name,
      type: this.getAccountTypeName(x),
      accountNo: x.accountNumber || '-',
      opening: this.formatNumber(x.openingBalance),
      current: this.formatNumber(x.currentBalance),
      isDefault: x.isDefault ? 'Yes' : 'No',
      status: x.isActive ? 'Active' : 'Inactive'
    }));

    this.pdfService.downloadTablePdf('Cash Account Report', columns, rows, 'cash-accounts.pdf');
  }

  printReport(): void {
    this.printService.printReport({
      title: 'Cash Account Report',
      data: this.filteredAccounts,
      columns: [
        { header: 'SL', value: (_x, index) => String(index + 1), align: 'center' },
        { header: 'Name', value: x => x.name || '-' },
        { header: 'Type', value: x => this.getAccountTypeName(x) },
        { header: 'Account No', value: x => x.accountNumber || '-' },
        { header: 'Opening', value: x => this.formatNumber(x.openingBalance), align: 'right' },
        { header: 'Current', value: x => this.formatNumber(x.currentBalance), align: 'right' },
        { header: 'Default', value: x => x.isDefault ? 'Yes' : 'No', align: 'center' },
        { header: 'Status', value: x => x.isActive ? 'Active' : 'Inactive', align: 'center' }
      ]
    });
  }

  openForm(): void {
    this.resetForm();
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
  }

  edit(item: CashAccountDto): void {
    this.isEditMode = true;
    this.selectedId = item.id;
    this.account = { ...item };
    this.showForm = true;
  }

  saveAccount(): void {
    if (!this.account.name?.trim()) {
      this.showToast('warning', 'Validation Error', 'Account name is required.');
      return;
    }

    if (this.account.accountType === undefined || this.account.accountType === null) {
      this.showToast('warning', 'Validation Error', 'Account type is required.');
      return;
    }

    const openingBalance = Number(this.account.openingBalance) || 0;
    const payload: Partial<CashAccountDto> = {
      ...this.account,
      name: this.account.name.trim(),
      openingBalance,
      currentBalance: this.isEditMode ? (Number(this.account.currentBalance) || 0) : openingBalance,
      isDefault: this.isEditMode ? (this.account.isDefault ?? false) : false,
      isActive: this.account.isActive ?? true
    };

    if (payload.accountType !== CashAccountType.MobileBanking) {
      payload.mobileBankType = null;
    }

    if (payload.accountType !== CashAccountType.Bank) {
      payload.bankName = null;
      payload.branchName = null;
    }

    const request = this.isEditMode && this.selectedId
      ? this.cashAccountService.update(this.selectedId, payload)
      : this.cashAccountService.create(payload);
    const message = this.isEditMode ? 'Cash account updated successfully.' : 'Cash account added successfully.';

    request.subscribe({
      next: () => this.afterSave(message),
      error: (err) => {
        console.error('Error saving cash account', err);
        this.showToast('danger', 'Save Failed', 'Unable to save the cash account.');
      }
    });
  }

  delete(id: number): void {
    if (confirm('Delete this cash account?')) {
      this.cashAccountService.delete(id).subscribe({
        next: () => {
          this.loadAccounts();
          this.showToast('success', 'Deleted', 'Cash account deleted successfully.');
        },
        error: (err) => {
          console.error('Error deleting cash account', err);
          this.showToast('danger', 'Delete Failed', 'Unable to delete the cash account.');
        }
      });
    }
  }

  setDefault(item: CashAccountDto): void {
    if (item.isDefault) return;

    if (!confirm(`Set "${item.name}" as the default cash account?`)) return;

    this.cashAccountService.setDefault(item.id).subscribe({
      next: () => {
        this.loadAccounts();
        this.showToast('success', 'Default Updated', 'Default cash account updated successfully.');
      },
      error: (err) => {
        console.error('Error setting default cash account', err);
        this.showToast('danger', 'Update Failed', 'Unable to set default cash account.');
      }
    });
  }

  openHistory(item: CashAccountDto): void {
    this.selectedHistoryAccount = item;
    this.historyPage = 1;
    this.historyTransactions = [];
    this.showHistoryModal = true;
    this.loadHistory();
  }

  closeHistory(): void {
    this.showHistoryModal = false;
    this.selectedHistoryAccount = null;
    this.selectedHistoryTransaction = null;
    this.historyTransactions = [];
  }

  loadHistory(): void {
    if (!this.selectedHistoryAccount) return;

    this.historyLoading = true;
    this.cashTransactionService.getCashFlowHistory({
      page: this.historyPage,
      pageSize: this.historyPageSize,
      cashAccountId: this.selectedHistoryAccount.id,
      defaultToday: false
    }).subscribe({
      next: (result) => {
        this.historyTransactions = result.items || [];
        this.historyTotalCount = result.totalCount || 0;
        this.historyTotalPages = Math.max(1, result.totalPages || Math.ceil(this.historyTotalCount / this.historyPageSize));
        this.historyLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading cash account transaction history', err);
        this.historyLoading = false;
        this.showToast('danger', 'Load Failed', 'Unable to load transaction history.');
      }
    });
  }

  onHistoryPageChange(newPage: number): void {
    if (newPage < 1 || newPage > this.historyTotalPages) return;

    this.historyPage = newPage;
    this.selectedHistoryTransaction = null;
    this.loadHistory();
  }

  onHistoryPageSizeChange(): void {
    this.historyPage = 1;
    this.selectedHistoryTransaction = null;
    this.loadHistory();
  }

  viewHistoryDetails(item: CashTransactionDto): void {
    this.selectedHistoryTransaction = item;
  }

  closeHistoryDetails(): void {
    this.selectedHistoryTransaction = null;
  }

  resetForm(): void {
    this.isEditMode = false;
    this.selectedId = null;
    this.account = this.getEmptyAccount();
  }

  getAccountTypeName(item: Partial<CashAccountDto>): string {
    if (item.accountTypeName) return item.accountTypeName;

    if (item.accountType === CashAccountType.Cash) return 'Cash';
    if (item.accountType === CashAccountType.Bank) return 'Bank';
    if (item.accountType === CashAccountType.MobileBanking) {
      return item.mobileBankTypeName ? `Mobile Bank (${item.mobileBankTypeName})` : 'Mobile Bank';
    }

    if (item.accountType === CashAccountType.Others) return 'Others';

    return item.accountTypeName || '-';
  }

  getAccountIcon(item: Partial<CashAccountDto>): string {
    if (item.accountType === CashAccountType.Bank) return 'fas fa-university';
    if (item.accountType === CashAccountType.MobileBanking) return 'fas fa-mobile-alt';
    return 'fas fa-wallet';
  }

  getHistoryPageStart(): number {
    return this.historyTotalCount === 0 ? 0 : ((Math.min(this.historyPage, this.historyTotalPages) - 1) * this.historyPageSize) + 1;
  }

  getHistoryPageEnd(): number {
    return Math.min(Math.min(this.historyPage, this.historyTotalPages) * this.historyPageSize, this.historyTotalCount);
  }

  getTransactionTypeName(type: number | undefined): string {
    if (Number(type) === TransactionType.CashOut) return 'Cash Out';
    if (Number(type) === TransactionType.CashIn) return 'Cash In';
    return '-';
  }

  getTransactionBadgeClass(type: number | undefined): string {
    return Number(type) === TransactionType.CashOut ? 'badge-danger' : 'badge-success';
  }

  getSourceTypeName(type: number | undefined): string {
    const names: Record<number, string> = {
      [TransactionSource.SalePayment]: 'Sale Payment',
      [TransactionSource.SaleDueCollection]: 'Sale Due Collection',
      [TransactionSource.PurchasePayment]: 'Purchase Payment',
      [TransactionSource.PurchaseDuePayment]: 'Purchase Due Payment',
      [TransactionSource.VendorPayment]: 'Vendor Payment',
      [TransactionSource.RentalIncome]: 'Rental Income',
      [TransactionSource.RentalSecurityDeposit]: 'Rental Security Deposit',
      [TransactionSource.Expense]: 'Expense',
      [TransactionSource.Salary]: 'Salary',
      [TransactionSource.ShopRent]: 'Shop Rent',
      [TransactionSource.CashTransfer]: 'Cash Transfer',
      [TransactionSource.OpeningBalance]: 'Opening Balance',
      [TransactionSource.Adjustment]: 'Adjustment',
      [TransactionSource.Other]: 'Other'
    };

    return names[Number(type)] || '-';
  }

  formatDate(value: string | Date | undefined): string {
    if (!value) return '-';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';

    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  formatNumber(value: number | undefined): string {
    return (Number(value) || 0).toFixed(2);
  }

  private getEmptyAccount(): Partial<CashAccountDto> {
    return {
      name: '',
      accountType: CashAccountType.Cash,
      mobileBankType: null,
      accountNumber: '',
      accountHolderName: '',
      bankName: '',
      branchName: '',
      note: '',
      openingBalance: 0,
      currentBalance: 0,
      isDefault: false,
      isActive: true
    };
  }

  private afterSave(message: string): void {
    this.loadAccounts();
    this.resetForm();
    this.showForm = false;
    this.showToast('success', 'Success', message);
  }

  showToast(type: ToastType, title: string, message: string): void {
    this.toastController.show(type, title, message, (toast) => this.toast = toast, () => this.closeToast());
  }

  closeToast(): void {
    this.toastController.close((toast) => this.toast = toast);
  }
}
