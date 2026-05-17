import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { CashAccountDto, CashAccountService } from '../../../service/cash-management/cash-account.service';
import { ExpenseDto, ExpenseService } from '../../../service/cash-management/expense.service';
import { ExpenseCategoryDto, ExpenseCategoryService } from '../../../service/cash-management/expenseCategory.service';
import { ExcelService } from '../../../service/common/excel.service';
import { PdfService } from '../../../service/common/pdf.service';
import { PrintService } from '../../../service/common/print.service';

type ToastType = 'success' | 'danger' | 'warning' | 'info';

@Component({
  selector: 'app-expense',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './expense.html',
  styleUrl: './expense.css',
})
export class Expense implements OnInit {
  expenses: ExpenseDto[] = [];
  categories: ExpenseCategoryDto[] = [];
  cashAccounts: CashAccountDto[] = [];
  expense: Partial<ExpenseDto> = this.getEmptyExpense();
  showForm = false;
  loading = false;
  isEditMode = false;
  selectedId: number | null = null;
  search = '';
  page = 1;
  pageSize = 10;
  toast: { show: boolean; type: ToastType; title: string; message: string; icon: string } = {
    show: false,
    type: 'success',
    title: '',
    message: '',
    icon: 'fas fa-check-circle'
  };
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private expenseService: ExpenseService,
    private expenseCategoryService: ExpenseCategoryService,
    private cashAccountService: CashAccountService,
    private pdfService: PdfService,
    private excelService: ExcelService,
    private printService: PrintService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadPageData();
  }

  get filteredExpenses(): ExpenseDto[] {
    const term = this.search.trim().toLowerCase();

    if (!term) return this.expenses;

    return this.expenses.filter((item) =>
      this.getCategoryName(item).toLowerCase().includes(term)
      || this.getCashAccountName(item).toLowerCase().includes(term)
      || this.formatDate(item.expenseDate).toLowerCase().includes(term)
      || this.formatNumber(item.amount).includes(term)
      || (item.note || '').toLowerCase().includes(term)
    );
  }

  get totalCount(): number {
    return this.filteredExpenses.length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  get pagedExpenses(): ExpenseDto[] {
    const currentPage = Math.min(this.page, this.totalPages);
    const start = (currentPage - 1) * this.pageSize;

    return this.filteredExpenses.slice(start, start + this.pageSize);
  }

  get pageStart(): number {
    return this.totalCount === 0 ? 0 : ((Math.min(this.page, this.totalPages) - 1) * this.pageSize) + 1;
  }

  get pageEnd(): number {
    return Math.min(Math.min(this.page, this.totalPages) * this.pageSize, this.totalCount);
  }

  get totalAmount(): number {
    return this.expenses.reduce((total, item) => total + (Number(item.amount) || 0), 0);
  }

  get filteredAmount(): number {
    return this.filteredExpenses.reduce((total, item) => total + (Number(item.amount) || 0), 0);
  }

  get todayAmount(): number {
    const today = this.toDateInputValue(new Date());

    return this.expenses
      .filter((item) => this.toDateInputValue(item.expenseDate) === today)
      .reduce((total, item) => total + (Number(item.amount) || 0), 0);
  }

  get activeCategories(): ExpenseCategoryDto[] {
    return this.categories.filter((item) => item.isActive);
  }

  get activeCashAccounts(): CashAccountDto[] {
    return this.cashAccounts.filter((item) => item.isActive);
  }

  get selectedCashAccount(): CashAccountDto | undefined {
    return this.cashAccounts.find((account) => account.id === Number(this.expense.cashAccountId));
  }

  get selectedCashAccountBalance(): number {
    return Number(this.selectedCashAccount?.currentBalance) || 0;
  }

  get isAmountOverCurrentBalance(): boolean {
    if (!this.expense.cashAccountId || !this.expense.amount) return false;

    return Number(this.expense.amount) > this.selectedCashAccountBalance;
  }

  loadPageData(): void {
    this.loading = true;
    forkJoin({
      expenses: this.expenseService.getAll(),
      categories: this.expenseCategoryService.getAll(),
      cashAccounts: this.cashAccountService.getAll()
    }).subscribe({
      next: ({ expenses, categories, cashAccounts }) => {
        this.expenses = [...expenses].sort((a, b) =>
          new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime()
        );
        this.categories = [...categories];
        this.cashAccounts = [...cashAccounts];
        this.page = Math.min(this.page, this.totalPages);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading expenses', err);
        this.loading = false;
        this.showToast('danger', 'Load Failed', 'Unable to load expenses.');
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

  downloadExcel(): void {
    const rows = this.filteredExpenses.map((x, index) => ({
      SL: index + 1,
      Date: this.formatDate(x.expenseDate),
      Category: this.getCategoryName(x),
      CashAccount: this.getCashAccountName(x),
      Amount: this.formatNumber(x.amount),
      Note: x.note || '-'
    }));

    this.excelService.exportToExcel(rows, 'expense-report');
  }

  downloadPdf(): void {
    const columns = [
      { header: 'SL', field: 'sl' },
      { header: 'Date', field: 'date' },
      { header: 'Category', field: 'category' },
      { header: 'Cash Account', field: 'cashAccount' },
      { header: 'Amount', field: 'amount' },
      { header: 'Note', field: 'note' }
    ];

    const rows = this.filteredExpenses.map((x, index) => ({
      sl: index + 1,
      date: this.formatDate(x.expenseDate),
      category: this.getCategoryName(x),
      cashAccount: this.getCashAccountName(x),
      amount: this.formatNumber(x.amount),
      note: x.note || '-'
    }));

    this.pdfService.downloadTablePdf('Expense Report', columns, rows, 'expenses.pdf');
  }

  printReport(): void {
    this.printService.printReport({
      title: 'Expense Report',
      data: this.filteredExpenses,
      columns: [
        { header: 'SL', value: (_x, index) => String(index + 1), align: 'center' },
        { header: 'Date', value: x => this.formatDate(x.expenseDate), align: 'center' },
        { header: 'Category', value: x => this.getCategoryName(x) },
        { header: 'Cash Account', value: x => this.getCashAccountName(x) },
        { header: 'Amount', value: x => this.formatNumber(x.amount), align: 'right' },
        { header: 'Note', value: x => x.note || '-' }
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

  edit(item: ExpenseDto): void {
    this.isEditMode = true;
    this.selectedId = item.id;
    this.expense = {
      ...item,
      expenseDate: this.toDateInputValue(item.expenseDate)
    };
    this.showForm = true;
  }

  saveExpense(): void {
    if (!this.expense.expenseCategoryId) {
      this.showToast('warning', 'Validation Error', 'Expense category is required.');
      return;
    }

    if (!this.expense.cashAccountId) {
      this.showToast('warning', 'Validation Error', 'Cash account is required.');
      return;
    }

    if (!this.expense.expenseDate) {
      this.showToast('warning', 'Validation Error', 'Expense date is required.');
      return;
    }

    if (!this.expense.amount || Number(this.expense.amount) <= 0) {
      this.showToast('warning', 'Validation Error', 'Amount must be greater than zero.');
      return;
    }

    if (this.isAmountOverCurrentBalance) {
      this.showToast(
        'warning',
        'Insufficient Balance',
        `Expense amount cannot be more than current balance ${this.formatNumber(this.selectedCashAccountBalance)}.`
      );
      return;
    }

    const payload: Partial<ExpenseDto> = {
      ...this.expense,
      expenseCategoryId: Number(this.expense.expenseCategoryId),
      cashAccountId: Number(this.expense.cashAccountId),
      amount: Number(this.expense.amount),
      expenseDate: this.expense.expenseDate,
      note: this.expense.note?.trim() || null
    };

    const request = this.isEditMode && this.selectedId
      ? this.expenseService.update(this.selectedId, payload)
      : this.expenseService.create(payload);
    const message = this.isEditMode ? 'Expense updated successfully.' : 'Expense added successfully.';

    request.subscribe({
      next: () => this.afterSave(message),
      error: (err) => {
        console.error('Error saving expense', err);
        this.showToast('danger', 'Save Failed', 'Unable to save the expense.');
      }
    });
  }

  delete(id: number): void {
    if (confirm('Delete this expense?')) {
      this.expenseService.delete(id).subscribe({
        next: () => {
          this.loadPageData();
          this.showToast('success', 'Deleted', 'Expense deleted successfully.');
        },
        error: (err) => {
          console.error('Error deleting expense', err);
          this.showToast('danger', 'Delete Failed', 'Unable to delete the expense.');
        }
      });
    }
  }

  resetForm(): void {
    this.isEditMode = false;
    this.selectedId = null;
    this.expense = this.getEmptyExpense();
  }

  getCategoryName(item: Partial<ExpenseDto>): string {
    if (item.expenseCategoryName) return item.expenseCategoryName;

    return this.categories.find((category) => category.id === Number(item.expenseCategoryId))?.name || '-';
  }

  getCashAccountName(item: Partial<ExpenseDto>): string {
    if (item.cashAccountName) return item.cashAccountName;

    return this.cashAccounts.find((account) => account.id === Number(item.cashAccountId))?.name || '-';
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

  private getEmptyExpense(): Partial<ExpenseDto> {
    return {
      expenseCategoryId: undefined,
      cashAccountId: undefined,
      amount: 0,
      expenseDate: this.toDateInputValue(new Date()),
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

  private afterSave(message: string): void {
    this.loadPageData();
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
