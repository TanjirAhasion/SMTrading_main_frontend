import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Vendor, VendorService } from '../../../service/contacts/vendor.service'; // Adjust path as needed
import { PdfService } from '../../../service/common/pdf.service';
import { ExcelService } from '../../../service/common/excel.service';
import { PrintService } from '../../../service/common/print.service';

type ToastType = 'success' | 'danger' | 'warning' | 'info';

@Component({
  selector: 'app-vendor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vendor.html',
  styleUrl: './vendor.css',
})

export class VendorComponent implements OnInit {
  //private vendorService = inject(VendorService);

  // State Management
  vendors: Vendor[] = [];
  vendor: Partial<Vendor> = {}; // The model for the form
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
    private vendorService: VendorService,
    private pdfService: PdfService,
    private excelService: ExcelService,
    private printService: PrintService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadVendors();
  }

  loadVendors(): void {
    this.loading = true;
    this.vendorService.getAll().subscribe({
      next: (data) => {
        console.log(data);
        this.vendors = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading vendors', err);
        this.loading = false;
        this.showToast('danger', 'Load Failed', 'Unable to load vendors.');
      }
    });
  }

  get filteredVendors(): Vendor[] {
    const term = this.search.trim().toLowerCase();

    if (!term) return this.vendors;

    return this.vendors.filter((item) =>
      item.firstName?.toLowerCase().includes(term)
      || item.lastName?.toLowerCase().includes(term)
      || item.companyName?.toLowerCase().includes(term)
      || item.phone?.toLowerCase().includes(term)
      || item.email?.toLowerCase().includes(term)
    );
  }

  get totalCount(): number {
    return this.filteredVendors.length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  get pagedVendors(): Vendor[] {
    const currentPage = Math.min(this.page, this.totalPages);
    const start = (currentPage - 1) * this.pageSize;

    return this.filteredVendors.slice(start, start + this.pageSize);
  }

  get pageStart(): number {
    return this.totalCount === 0 ? 0 : ((Math.min(this.page, this.totalPages) - 1) * this.pageSize) + 1;
  }

  get pageEnd(): number {
    return Math.min(Math.min(this.page, this.totalPages) * this.pageSize, this.totalCount);
  }

  get activeCount(): number {
    return this.vendors.filter((item) => item.isActive).length;
  }

  get inactiveCount(): number {
    return this.vendors.filter((item) => !item.isActive).length;
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
    const rows = this.filteredVendors.map((x, index) => ({
      SL: index + 1,
      Name: this.getFullName(x),
      Company: x.companyName || '-',
      Phone: x.phone || '-',
      Email: x.email || '-',
      Address: x.address || '-',
      Status: x.isActive ? 'Active' : 'Inactive'
    }));

    this.excelService.exportToExcel(rows, 'vendor-report');
  }

  downloadPdf(): void {
    const columns = [
      { header: 'SL', field: 'sl' },
      { header: 'Name', field: 'name' },
      { header: 'Company', field: 'company' },
      { header: 'Phone', field: 'phone' },
      { header: 'Email', field: 'email' },
      { header: 'Address', field: 'address' },
      { header: 'Status', field: 'status' }
    ];

    const rows = this.filteredVendors.map((x, index) => ({
      sl: index + 1,
      name: this.getFullName(x),
      company: x.companyName || '-',
      phone: x.phone || '-',
      email: x.email || '-',
      address: x.address || '-',
      status: x.isActive ? 'Active' : 'Inactive'
    }));

    this.pdfService.downloadTablePdf('Vendor Report', columns, rows, 'vendors.pdf');
  }

  printReport(): void {
    this.printService.printReport({
      title: 'Vendor Report',
      data: this.filteredVendors,
      columns: [
        { header: 'SL', value: (_x, index) => String(index + 1), align: 'center' },
        { header: 'Name', value: x => this.getFullName(x) },
        { header: 'Company', value: x => x.companyName || '-' },
        { header: 'Phone', value: x => x.phone || '-' },
        { header: 'Email', value: x => x.email || '-' },
        { header: 'Address', value: x => x.address || '-' },
        { header: 'Status', value: x => x.isActive ? 'Active' : 'Inactive', align: 'center' }
      ]
    });
  }

  private getFullName(item: Vendor): string {
    return `${item.firstName || ''} ${item.lastName || ''}`.trim() || '-';
  }

  openForm(): void {
    this.isEditMode = false;
    this.selectedId = null;
    this.vendor = { isActive: true };
    this.showForm = true;
  }

  toggleForm(editMode = false, vendorData: Vendor | null = null): void {
    this.isEditMode = editMode;
    this.showForm = true;

    if (editMode && vendorData) {
      this.selectedId = vendorData.id;
      this.vendor = { ...vendorData }; // Clone to avoid direct mutation
    } else {
      this.selectedId = null;
      this.vendor = { isActive: true }; // Default values for new vendor
    }
  }

  saveVendor(): void {
    if (!this.vendor.firstName?.trim() || !this.vendor.phone?.trim()) {
      this.showToast('warning', 'Validation Error', 'First name and phone are required.');
      return;
    }

    if (this.isEditMode && this.selectedId) {
      this.vendorService.update(this.selectedId, this.vendor).subscribe({
        next: () => {
          this.afterSave('Vendor updated successfully.');
        },
        error: (err) => {
          console.error('Error updating vendor', err);
          this.showToast('danger', 'Update Failed', 'Unable to update the vendor.');
        }
      });
    } else {
      this.vendorService.create(this.vendor).subscribe({
        next: () => {
          this.afterSave('Vendor added successfully.');
        },
        error: (err) => {
          console.error('Error creating vendor', err);
          this.showToast('danger', 'Save Failed', 'Unable to add the vendor.');
        }
      });
    }
  }

  deleteVendor(id: number): void {
    if (confirm('Are you sure you want to delete this vendor?')) {
      this.vendorService.delete(id).subscribe({
        next: () => {
          this.loadVendors();
          this.showToast('success', 'Deleted', 'Vendor deleted successfully.');
        },
        error: (err) => {
          console.error('Error deleting vendor', err);
          this.showToast('danger', 'Delete Failed', 'Unable to delete the vendor.');
        }
      });
    }
  }

  cancel(): void {
    this.showForm = false;
    this.vendor = { isActive: true };
    this.isEditMode = false;
    this.selectedId = null;
  }

  createPurchase(vendor: Vendor): void {
    // Navigate to purchase creation page with vendor ID as query parameter
    this.router.navigate(['/inventory/purchase'], { queryParams: { vendorId: vendor.id, vendorName: vendor.firstName + ' ' + vendor.lastName } });
  }

  private afterSave(message: string): void {
    this.loadVendors();
    this.cancel();
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

    this.toast = {
      show: true,
      type,
      title,
      message,
      icon: icons[type]
    };

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
