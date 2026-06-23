import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { CashAccountDto, CashAccountService } from '../../../service/cash-management/cash-account.service';
import {
  CashAdjustmentDto,
  CashAdjustmentService,
  CashAdjustmentType
} from '../../../service/cash-management/cash-adjustment.service';
import { ExcelService } from '../../../service/common/excel.service';
import { PdfService } from '../../../service/common/pdf.service';
import { PrintService } from '../../../service/common/print.service';
import { createEmptyToast, ToastController, ToastState, ToastType } from '../../../service/common/toast-helper';

@Component({
  selector: 'app-cash-adjustment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cash-adjustment.html',
  styleUrl: './cash-adjustment.css'
})
export class CashAdjustment implements OnInit, OnDestroy {
  readonly adjustmentType = CashAdjustmentType;

  adjustments: CashAdjustmentDto[] = [];
  cashAccounts: CashAccountDto[] = [];
  adjustment: Partial<CashAdjustmentDto> = this.getEmptyAdjustment();
  selectedAdjustmentDetails: CashAdjustmentDto | null = null;
  showForm = false;
  loading = false;
  search = '';
  fromDate = '';
  toDate = '';
  cashAccountId: number | null = null;
  page = 1;
  pageSize = 10;
  toast: ToastState = createEmptyToast();
  private readonly toastController = new ToastController();

  constructor(
    private adjustmentService: CashAdjustmentService,
    private cashAccountService: CashAccountService,
    private pdfService: PdfService,
    private excelService: ExcelService,
    private printService: PrintService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadPageData();
  }

  ngOnDestroy(): void {
    this.toastController.destroy();
  }

  get filteredAdjustments(): CashAdjustmentDto[] {
    const term = this.search.trim().toLowerCase();

    if (!term) return this.adjustments;

    return this.adjustments.filter((item) =>
      this.getCashAccountName(item).toLowerCase().includes(term)
      || this.getTransactionTypeName(item.transactionType).toLowerCase().includes(term)
      || this.formatDate(item.transactionDate).toLowerCase().includes(term)
      || this.formatNumber(item.amount).includes(term)
      || (item.reason || '').toLowerCase().includes(term)
      || (item.referenceNo || '').toLowerCase().includes(term)
      || (item.note || '').toLowerCase().includes(term)
    );
  }

  get totalCount(): number {
    return this.filteredAdjustments.length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  get pagedAdjustments(): CashAdjustmentDto[] {
    const currentPage = Math.min(this.page, this.totalPages);
    const start = (currentPage - 1) * this.pageSize;

    return this.filteredAdjustments.slice(start, start + this.pageSize);
  }

  get pageStart(): number {
    return this.totalCount === 0 ? 0 : ((Math.min(this.page, this.totalPages) - 1) * this.pageSize) + 1;
  }

  get pageEnd(): number {
    return Math.min(Math.min(this.page, this.totalPages) * this.pageSize, this.totalCount);
  }

  get activeCashAccounts(): CashAccountDto[] {
    return this.cashAccounts.filter((item) => item.isActive);
  }

  get selectedCashAccount(): CashAccountDto | undefined {
    return this.cashAccounts.find((account) => account.id === Number(this.adjustment.cashAccountId));
  }

  get selectedCashAccountBalance(): number {
    return Number(this.selectedCashAccount?.currentBalance) || 0;
  }

  get isCashOut(): boolean {
    return Number(this.adjustment.transactionType) === CashAdjustmentType.CashOut;
  }

  get isAmountOverCurrentBalance(): boolean {
    if (!this.adjustment.cashAccountId || !this.adjustment.amount || !this.isCashOut) return false;

    return Number(this.adjustment.amount) > this.selectedCashAccountBalance;
  }

  get cashInAmount(): number {
    return this.adjustments
      .filter((item) => Number(item.transactionType) === CashAdjustmentType.CashIn)
      .reduce((total, item) => total + (Number(item.amount) || 0), 0);
  }

  get cashOutAmount(): number {
    return this.adjustments
      .filter((item) => Number(item.transactionType) === CashAdjustmentType.CashOut)
      .reduce((total, item) => total + (Number(item.amount) || 0), 0);
  }

  get todayAmount(): number {
    const today = this.toDateInputValue(new Date());

    return this.adjustments
      .filter((item) => this.toDateInputValue(item.transactionDate) === today)
      .reduce((total, item) => total + (Number(item.amount) || 0), 0);
  }

  loadPageData(): void {
    this.loading = true;
    forkJoin({
      adjustments: this.adjustmentService.getAll(this.buildServerFilter()),
      cashAccounts: this.cashAccountService.getAll()
    }).subscribe({
      next: ({ adjustments, cashAccounts }) => {
        this.adjustments = [...adjustments].sort((a, b) =>
          new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
        );
        this.cashAccounts = [...cashAccounts];
        this.page = Math.min(this.page, this.totalPages);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading cash adjustments', err);
        this.loading = false;
        this.showToast('danger', 'Load Failed', 'Unable to load cash adjustments.');
      }
    });
  }

  openForm(type: CashAdjustmentType = CashAdjustmentType.CashIn): void {
    this.adjustment = this.getEmptyAdjustment(type);
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
  }

  openDetails(item: CashAdjustmentDto): void {
    this.selectedAdjustmentDetails = item;
  }

  closeDetails(): void {
    this.selectedAdjustmentDetails = null;
  }

  saveAdjustment(): void {
    if (!this.adjustment.cashAccountId) {
      this.showToast('warning', 'Validation Error', 'Cash account is required.');
      return;
    }

    if (!this.adjustment.transactionDate) {
      this.showToast('warning', 'Validation Error', 'Date is required.');
      return;
    }

    if (!this.adjustment.transactionType) {
      this.showToast('warning', 'Validation Error', 'Select Cash In or Cash Out.');
      return;
    }

    if (!this.adjustment.amount || Number(this.adjustment.amount) <= 0) {
      this.showToast('warning', 'Validation Error', 'Amount must be greater than zero.');
      return;
    }

    if (!this.adjustment.reason?.trim()) {
      this.showToast('warning', 'Validation Error', 'Reason is required.');
      return;
    }

    if (this.isAmountOverCurrentBalance) {
      this.showToast(
        'warning',
        'Insufficient Balance',
        `Cash out cannot be more than current balance ${this.formatNumber(this.selectedCashAccountBalance)}.`
      );
      return;
    }

    const payload: Partial<CashAdjustmentDto> = {
      ...this.adjustment,
      cashAccountId: Number(this.adjustment.cashAccountId),
      transactionType: Number(this.adjustment.transactionType),
      amount: Number(this.adjustment.amount),
      reason: this.adjustment.reason.trim(),
      referenceNo: this.adjustment.referenceNo?.trim() || null,
      note: this.adjustment.note?.trim() || null
    };

    this.adjustmentService.create(payload).subscribe({
      next: () => {
        this.loadPageData();
        this.showForm = false;
        this.adjustment = this.getEmptyAdjustment();
        this.showToast('success', 'Success', 'Cash adjustment posted successfully.');
      },
      error: (err) => {
        console.error('Error saving cash adjustment', err);
        const message = err?.error?.message || 'Unable to save the cash adjustment.';
        this.showToast('danger', 'Save Failed', message);
      }
    });
  }

  onSearch(): void {
    this.page = 1;
  }

  applyFilters(): void {
    this.page = 1;
    this.loadPageData();
  }

  resetFilters(): void {
    this.search = '';
    this.fromDate = '';
    this.toDate = '';
    this.cashAccountId = null;
    this.page = 1;
    this.loadPageData();
  }

  onPageChange(newPage: number): void {
    if (newPage < 1 || newPage > this.totalPages) return;

    this.page = newPage;
  }

  downloadExcel(): void {
    const rows = this.filteredAdjustments.map((x, index) => ({
      SL: index + 1,
      Date: this.formatDate(x.transactionDate),
      Type: this.getTransactionTypeName(x.transactionType),
      CashAccount: this.getCashAccountName(x),
      Amount: this.formatNumber(x.amount),
      Reason: x.reason || '-',
      Reference: x.referenceNo || '-',
      Note: x.note || '-'
    }));

    this.excelService.exportToExcel(rows, 'cash-adjustment-report');
  }

  downloadPdf(): void {
    const columns = [
      { header: 'SL', field: 'sl' },
      { header: 'Date', field: 'date' },
      { header: 'Type', field: 'type' },
      { header: 'Cash Account', field: 'cashAccount' },
      { header: 'Amount', field: 'amount' },
      { header: 'Reason', field: 'reason' },
      { header: 'Reference', field: 'reference' }
    ];

    const rows = this.filteredAdjustments.map((x, index) => ({
      sl: index + 1,
      date: this.formatDate(x.transactionDate),
      type: this.getTransactionTypeName(x.transactionType),
      cashAccount: this.getCashAccountName(x),
      amount: this.formatNumber(x.amount),
      reason: x.reason || '-',
      reference: x.referenceNo || '-'
    }));

    this.pdfService.downloadTablePdf('Cash In / Cash Out Report', columns, rows, 'cash-adjustments.pdf');
  }

  printReport(): void {
    this.printService.printReport({
      title: 'Cash In / Cash Out Report',
      data: this.filteredAdjustments,
      columns: [
        { header: 'SL', value: (_x, index) => String(index + 1), align: 'center' },
        { header: 'Date', value: x => this.formatDate(x.transactionDate), align: 'center' },
        { header: 'Type', value: x => this.getTransactionTypeName(x.transactionType) },
        { header: 'Cash Account', value: x => this.getCashAccountName(x) },
        { header: 'Amount', value: x => this.formatNumber(x.amount), align: 'right' },
        { header: 'Reason', value: x => x.reason || '-' },
        { header: 'Reference', value: x => x.referenceNo || '-' }
      ]
    });
  }

  getCashAccountName(item: Partial<CashAdjustmentDto>): string {
    if (item.cashAccountName) return item.cashAccountName;

    return this.cashAccounts.find((account) => account.id === Number(item.cashAccountId))?.name || '-';
  }

  getTransactionTypeName(type: CashAdjustmentType | number | undefined): string {
    return Number(type) === CashAdjustmentType.CashOut ? 'Cash Out' : 'Cash In';
  }

  getTransactionBadgeClass(type: CashAdjustmentType | number | undefined): string {
    return Number(type) === CashAdjustmentType.CashOut ? 'badge-danger' : 'badge-success';
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

  closeToast(): void {
    this.toastController.close((toast) => this.toast = toast);
  }

  showToast(type: ToastType, title: string, message: string): void {
    this.toastController.show(type, title, message, (toast) => this.toast = toast, () => this.closeToast());
  }

  private getEmptyAdjustment(type: CashAdjustmentType = CashAdjustmentType.CashIn): Partial<CashAdjustmentDto> {
    return {
      transactionDate: this.toDateInputValue(new Date()),
      cashAccountId: undefined,
      transactionType: type,
      amount: 0,
      reason: '',
      referenceNo: '',
      note: ''
    };
  }

  private buildServerFilter() {
    return {
      fromDate: this.fromDate || null,
      toDate: this.toDate || null,
      cashAccountId: this.cashAccountId
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
