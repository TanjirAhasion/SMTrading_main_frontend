import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
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

type ToastType = 'success' | 'danger' | 'warning' | 'info';

@Component({
  selector: 'app-cash-account',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cash-account.html',
  styleUrl: './cash-account.css',
})
export class CashAccount implements OnInit {
  accounts: CashAccountDto[] = [];
  account: Partial<CashAccountDto> = this.getEmptyAccount();
  showForm = false;
  loading = false;
  isEditMode = false;
  selectedId: number | null = null;
  search = '';
  page = 1;
  pageSize = 10;
  accountTypes = [
    { value: CashAccountType.Cash, label: 'Cash' },
    { value: CashAccountType.Bank, label: 'Bank' },
    { value: CashAccountType.MobileBank, label: 'Mobile Bank' }
  ];
  mobileBankTypes = [
    { value: MobileBankType.Bkash, label: 'Bkash' },
    { value: MobileBankType.Nagad, label: 'Nagad' },
    { value: MobileBankType.Rocket, label: 'Rocket' }
  ];
  readonly cashAccountType = CashAccountType;
  toast: { show: boolean; type: ToastType; title: string; message: string; icon: string } = {
    show: false,
    type: 'success',
    title: '',
    message: '',
    icon: 'fas fa-check-circle'
  };
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private cashAccountService: CashAccountService,
    private pdfService: PdfService,
    private excelService: ExcelService,
    private printService: PrintService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadAccounts();
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
    if (this.account.accountType !== CashAccountType.MobileBank) {
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

    const payload: Partial<CashAccountDto> = {
      ...this.account,
      name: this.account.name.trim(),
      openingBalance: Number(this.account.openingBalance) || 0,
      currentBalance: Number(this.account.currentBalance) || 0,
      isDefault: this.account.isDefault ?? false,
      isActive: this.account.isActive ?? true
    };

    if (payload.accountType !== CashAccountType.MobileBank) {
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

  resetForm(): void {
    this.isEditMode = false;
    this.selectedId = null;
    this.account = this.getEmptyAccount();
  }

  getAccountTypeName(item: Partial<CashAccountDto>): string {
    if (item.accountTypeName) return item.accountTypeName;

    if (item.accountType === CashAccountType.Cash) return 'Cash';
    if (item.accountType === CashAccountType.Bank) return 'Bank';
    if (item.accountType === CashAccountType.MobileBank) {
      return item.mobileBankTypeName ? `Mobile Bank (${item.mobileBankTypeName})` : 'Mobile Bank';
    }

    return '-';
  }

  getAccountIcon(item: Partial<CashAccountDto>): string {
    if (item.accountType === CashAccountType.Bank) return 'fas fa-university';
    if (item.accountType === CashAccountType.MobileBank) return 'fas fa-mobile-alt';
    return 'fas fa-wallet';
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
    const icons: Record<ToastType, string> = {
      success: 'fas fa-check-circle',
      danger: 'fas fa-times-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle'
    };

    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }

    this.toast = { show: true, type, title, message, icon: icons[type] };

    this.toastTimer = setTimeout(() => {
      this.closeToast();
    }, 3500);
  }

  closeToast(): void {
    this.toast.show = false;
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
  }
}
