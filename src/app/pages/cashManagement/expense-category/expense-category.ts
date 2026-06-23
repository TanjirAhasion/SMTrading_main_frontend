import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExpenseCategoryDto, ExpenseCategoryService } from '../../../service/cash-management/expenseCategory.service';
import { PdfService } from '../../../service/common/pdf.service';
import { ExcelService } from '../../../service/common/excel.service';
import { PrintService } from '../../../service/common/print.service';
import { createEmptyToast, ToastController, ToastState, ToastType } from '../../../service/common/toast-helper';

@Component({
  selector: 'app-expense-category',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './expense-category.html',
  styleUrl: './expense-category.css',
})
export class ExpenseCategory implements OnInit, OnDestroy {
  categories: ExpenseCategoryDto[] = [];
  category: Partial<ExpenseCategoryDto> = this.getEmptyCategory();
  showForm = false;
  loading = false;
  isEditMode = false;
  selectedId: number | null = null;
  search = '';
  page = 1;
  pageSize = 10;
  toast: ToastState = createEmptyToast();
  private readonly toastController = new ToastController();

  constructor(
    private expenseCategoryService: ExpenseCategoryService,
    private pdfService: PdfService,
    private excelService: ExcelService,
    private printService: PrintService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadCategories();
  }

  ngOnDestroy(): void {
    this.toastController.destroy();
  }

  get filteredCategories(): ExpenseCategoryDto[] {
    const term = this.search.trim().toLowerCase();

    if (!term) return this.categories;

    return this.categories.filter((item) =>
      item.name?.toLowerCase().includes(term)
      || (item.isActive ? 'active' : 'inactive').includes(term)
    );
  }

  get totalCount(): number {
    return this.filteredCategories.length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  get pagedCategories(): ExpenseCategoryDto[] {
    const currentPage = Math.min(this.page, this.totalPages);
    const start = (currentPage - 1) * this.pageSize;

    return this.filteredCategories.slice(start, start + this.pageSize);
  }

  get pageStart(): number {
    return this.totalCount === 0 ? 0 : ((Math.min(this.page, this.totalPages) - 1) * this.pageSize) + 1;
  }

  get pageEnd(): number {
    return Math.min(Math.min(this.page, this.totalPages) * this.pageSize, this.totalCount);
  }

  get activeCount(): number {
    return this.categories.filter((item) => item.isActive).length;
  }

  get inactiveCount(): number {
    return this.categories.filter((item) => !item.isActive).length;
  }

  loadCategories(): void {
    this.loading = true;
    this.expenseCategoryService.getAll().subscribe({
      next: (res) => {
        this.categories = [...res];
        this.page = Math.min(this.page, this.totalPages);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading expense categories', err);
        this.loading = false;
        this.showToast('danger', 'Load Failed', 'Unable to load expense categories.');
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
    const rows = this.filteredCategories.map((x, index) => ({
      SL: index + 1,
      Name: x.name,
      Status: x.isActive ? 'Active' : 'Inactive'
    }));

    this.excelService.exportToExcel(rows, 'expense-category-report');
  }

  downloadPdf(): void {
    const columns = [
      { header: 'SL', field: 'sl' },
      { header: 'Name', field: 'name' },
      { header: 'Status', field: 'status' }
    ];

    const rows = this.filteredCategories.map((x, index) => ({
      sl: index + 1,
      name: x.name,
      status: x.isActive ? 'Active' : 'Inactive'
    }));

    this.pdfService.downloadTablePdf('Expense Category Report', columns, rows, 'expense-categories.pdf');
  }

  printReport(): void {
    this.printService.printReport({
      title: 'Expense Category Report',
      data: this.filteredCategories,
      columns: [
        { header: 'SL', value: (_x, index) => String(index + 1), align: 'center' },
        { header: 'Name', value: x => x.name || '-' },
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

  edit(item: ExpenseCategoryDto): void {
    this.isEditMode = true;
    this.selectedId = item.id;
    this.category = { ...item };
    this.showForm = true;
  }

  saveCategory(): void {
    if (!this.category.name?.trim()) {
      this.showToast('warning', 'Validation Error', 'Category name is required.');
      return;
    }

    const payload: Partial<ExpenseCategoryDto> = {
      ...this.category,
      name: this.category.name.trim(),
      isActive: this.category.isActive ?? true
    };

    const request = this.isEditMode && this.selectedId
      ? this.expenseCategoryService.update(this.selectedId, payload)
      : this.expenseCategoryService.create(payload);
    const message = this.isEditMode ? 'Expense category updated successfully.' : 'Expense category added successfully.';

    request.subscribe({
      next: () => this.afterSave(message),
      error: (err) => {
        console.error('Error saving expense category', err);
        this.showToast('danger', 'Save Failed', 'Unable to save the expense category.');
      }
    });
  }

  delete(id: number): void {
    if (confirm('Delete this expense category?')) {
      this.expenseCategoryService.delete(id).subscribe({
        next: () => {
          this.loadCategories();
          this.showToast('success', 'Deleted', 'Expense category deleted successfully.');
        },
        error: (err) => {
          console.error('Error deleting expense category', err);
          this.showToast('danger', 'Delete Failed', 'Unable to delete the expense category.');
        }
      });
    }
  }

  resetForm(): void {
    this.isEditMode = false;
    this.selectedId = null;
    this.category = this.getEmptyCategory();
  }

  private getEmptyCategory(): Partial<ExpenseCategoryDto> {
    return {
      name: '',
      isActive: true
    };
  }

  private afterSave(message: string): void {
    this.loadCategories();
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
