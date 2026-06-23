import { Component, ChangeDetectorRef, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BrandService } from '../../../service/item/brand.service';
import { PdfService } from '../../../service/common/pdf.service';
import { ExcelService } from '../../../service/common/excel.service';
import { PrintService } from '../../../service/common/print.service';
import { createEmptyToast, ToastController, ToastState, ToastType } from '../../../service/common/toast-helper';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-brand',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './brand.html',
  styleUrl: './brand.css'
})

export class Brand implements OnInit, OnDestroy {

  brands: any[] = [];
  toast: ToastState = createEmptyToast();
  
  showForm = false;
  loading = false;
  search = '';
  selectedActiveStatus = '';
  appliedActiveStatus = '';
  page = 1;
  pageSize = 10;
  selectedBrandDetail: any | null = null;
  private readonly toastController = new ToastController();

  isEditMode = false;
  selectedId: number | null = null;

  brand = {
    name: '',
    description: '',
    logoUrl: '',
    isActive: true
  };

  constructor(
    private brandService: BrandService,
    private pdfService: PdfService,
    private excelService: ExcelService,
    private printService: PrintService,
    private cdr: ChangeDetectorRef
  ) {

  }

  ngOnInit(): void {
    this.loadBrands();
  }

  ngOnDestroy(): void {
    this.toastController.destroy();
  }

  get filteredBrands(): any[] {
    const term = this.search.trim().toLowerCase();
    const status = this.appliedActiveStatus;

    return this.brands.filter((item) => {
      const matchesStatus = !status
        || (status === 'active' && item.isActive)
        || (status === 'inactive' && !item.isActive);

      const matchesSearch = !term
        || item.name?.toLowerCase().includes(term)
        || item.description?.toLowerCase().includes(term);

      return matchesStatus && matchesSearch;
    });
  }

  get totalCount(): number {
    return this.filteredBrands.length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  get pagedBrands(): any[] {
    const currentPage = Math.min(this.page, this.totalPages);
    const start = (currentPage - 1) * this.pageSize;

    return this.filteredBrands.slice(start, start + this.pageSize);
  }

  get pageStart(): number {
    return this.totalCount === 0 ? 0 : ((Math.min(this.page, this.totalPages) - 1) * this.pageSize) + 1;
  }

  get pageEnd(): number {
    return Math.min(Math.min(this.page, this.totalPages) * this.pageSize, this.totalCount);
  }

  get activeCount(): number {
    return this.brands.filter((item) => item.isActive).length;
  }

  get inactiveCount(): number {
    return this.brands.filter((item) => !item.isActive).length;
  }

  loadBrands() {
    this.loading = true;
    this.brandService.getAll().subscribe({
      next: (res) => {

        this.brands = [...res];
        this.page = Math.min(this.page, this.totalPages);
        this.selectedBrandDetail = null;
        this.loading = false;

        this.cdr.detectChanges(); // 🔥 FORCE UI REFRESH
      },
      error: (err) => {
        console.log('ERROR:', err);
        this.loading = false;
      }
    });
  }

  openForm() {
    this.resetForm();
    this.showForm = true;
  }

  onSearch() {
    this.appliedActiveStatus = this.selectedActiveStatus;
    this.page = 1;
  }

  onPageSizeChange() {
    this.page = 1;
  }

  resetFilters() {
    this.search = '';
    this.selectedActiveStatus = '';
    this.appliedActiveStatus = '';
    this.page = 1;
    this.selectedBrandDetail = null;
  }

  onPageChange(newPage: number) {
    if (newPage < 1 || newPage > this.totalPages) return;

    this.page = newPage;
  }

  downloadExcel() {
    const rows = this.filteredBrands.map((x, index) => ({
      SL: index + 1,
      Name: x.name,
      Description: x.description || '-',
      Status: x.isActive ? 'Active' : 'Inactive'
    }));

    this.excelService.exportToExcel(rows, 'brand-report');
  }

  downloadPdf() {
    const columns = [
      { header: 'SL', field: 'sl' },
      { header: 'Name', field: 'name' },
      { header: 'Description', field: 'description' },
      { header: 'Status', field: 'status' }
    ];

    const rows = this.filteredBrands.map((x, index) => ({
      sl: index + 1,
      name: x.name,
      description: x.description || '-',
      status: x.isActive ? 'Active' : 'Inactive'
    }));

    this.pdfService.downloadTablePdf('Brand Report', columns, rows, 'brands.pdf');
  }

  printReport() {
    this.printService.printReport({
      title: 'Brand Report',
      data: this.filteredBrands,
      columns: [
        { header: 'SL', value: (_x, index) => String(index + 1), align: 'center' },
        { header: 'Name', value: x => x.name || '-' },
        { header: 'Description', value: x => x.description || '-' },
        { header: 'Status', value: x => x.isActive ? 'Active' : 'Inactive', align: 'center' }
      ]
    });
  }

  closeForm() {
    this.showForm = false;
  }

  edit(item: any) {
    this.isEditMode = true;
    this.selectedId = item.id;

    this.brand = {
      name: item.name,
      description: item.description,
      logoUrl: item.logoUrl,
      isActive: item.isActive
    };

    this.showForm = true;
  }

  showBrandDetail(item: any) {
    this.selectedBrandDetail = item;
  }

  closeBrandDetail() {
    this.selectedBrandDetail = null;
  }

  saveBrand() {

    if (!this.brand.name || this.brand.name.trim() === '') {
      this.showToast('warning', 'Validation Error', 'Brand name is required.');

      // If using SweetAlert2 (Standard in AdminLTE)
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Brand Name is required!',
      });

      // Or if using standard alert:
      // alert('Brand Name is required!');

      return; // Stop the function here
    }

    if (this.isEditMode && this.selectedId) {
      const message = 'Brand updated successfully.';

      // UPDATE
      this.brandService.update(this.selectedId, this.brand).subscribe({
        next: () => {
          this.afterSave(message);

        },
        error: err => {
          console.log(err);
          this.showToast('danger', 'Update Failed', this.getErrorMessage(err, 'Unable to update the brand. Please try again.'));
        }
      });

    }
    else {
      const message = 'Brand added successfully.';

      // CREATE
      this.brandService.create(this.brand).subscribe({
        next: () => {
          this.afterSave(message);
        },
        error: err => {
          console.log(err);
          this.showToast('danger', 'Save Failed', this.getErrorMessage(err, 'Unable to add the brand. Please try again.'));
        }
      });
    }
  }

  delete(id: number) {
    if (confirm('Delete this brand?')) {
      this.brandService.delete(id).subscribe({
        next: () => {
          this.loadBrands();
          this.showToast('success', 'Deleted', 'Brand deleted successfully.');
        },
        error: err => {
          console.log(err);
          this.showToast('danger', 'Delete Failed', 'Unable to delete the brand. Please try again.');
        }
      });
    }
  }

  afterSave(message: string) {
    this.loadBrands();
    this.resetForm();
    this.showForm = false;
    this.showToast('success', 'Success', message);
  }

  resetForm() {
    this.isEditMode = false;
    this.selectedId = null;

    this.brand = {
      name: '',
      description: '',
      logoUrl: '',
      isActive: true
    };
  }

  showToast(type: ToastType, title: string, message: string) {
    this.toastController.show(
      type,
      title,
      message,
      (toast) => {
        this.toast = toast;
        this.cdr.detectChanges();
      },
      () => this.closeToast()
    );
  }

  closeToast() {
    this.toastController.close((toast) => {
      this.toast = toast;
      this.cdr.detectChanges();
    });
  }

  private getErrorMessage(error: any, fallback: string): string {
    if (typeof error?.error === 'string' && error.error.trim()) {
      return error.error;
    }

    if (typeof error?.error?.message === 'string' && error.error.message.trim()) {
      return error.error.message;
    }

    return fallback;
  }
}
