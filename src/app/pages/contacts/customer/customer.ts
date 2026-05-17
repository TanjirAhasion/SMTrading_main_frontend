import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Customer, CustomerService } from '../../../service/contacts/customer.service'; // Adjust path as needed
import { PdfService } from '../../../service/common/pdf.service';
import { ExcelService } from '../../../service/common/excel.service';
import { PrintService } from '../../../service/common/print.service';

type ToastType = 'success' | 'danger' | 'warning' | 'info';

@Component({
  selector: 'app-customer',
  imports: [CommonModule, FormsModule],
  templateUrl: './customer.html',
  styleUrl: './customer.css',
})
export class CustomerComponent implements OnInit {

  // State Management
  customers: Customer[] = [];
  customer: Partial<Customer> = {}; // The model for the form
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
    private customerService: CustomerService,
    private pdfService: PdfService,
    private excelService: ExcelService,
    private printService: PrintService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.loading = true;
    this.customerService.getAll().subscribe({
      next: (data) => {
        console.log(data);
        this.customers = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading customers', err);
        this.loading = false;
        this.showToast('danger', 'Load Failed', 'Unable to load customers.');
      }
    });
  }

  get filteredCustomers(): Customer[] {
    const term = this.search.trim().toLowerCase();

    if (!term) return this.customers;

    return this.customers.filter((item) =>
      item.firstName?.toLowerCase().includes(term)
      || item.lastName?.toLowerCase().includes(term)
      || item.companyName?.toLowerCase().includes(term)
      || item.phone?.toLowerCase().includes(term)
      || item.email?.toLowerCase().includes(term)
    );
  }

  get totalCount(): number {
    return this.filteredCustomers.length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  get pagedCustomers(): Customer[] {
    const currentPage = Math.min(this.page, this.totalPages);
    const start = (currentPage - 1) * this.pageSize;

    return this.filteredCustomers.slice(start, start + this.pageSize);
  }

  get pageStart(): number {
    return this.totalCount === 0 ? 0 : ((Math.min(this.page, this.totalPages) - 1) * this.pageSize) + 1;
  }

  get pageEnd(): number {
    return Math.min(Math.min(this.page, this.totalPages) * this.pageSize, this.totalCount);
  }

  get activeCount(): number {
    return this.customers.filter((item) => item.isActive).length;
  }

  get inactiveCount(): number {
    return this.customers.filter((item) => !item.isActive).length;
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
    const rows = this.filteredCustomers.map((x, index) => ({
      SL: index + 1,
      Name: this.getFullName(x),
      Company: x.companyName || '-',
      Phone: x.phone || '-',
      Email: x.email || '-',
      Address: x.address || '-',
      Status: x.isActive ? 'Active' : 'Inactive'
    }));

    this.excelService.exportToExcel(rows, 'customer-report');
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

    const rows = this.filteredCustomers.map((x, index) => ({
      sl: index + 1,
      name: this.getFullName(x),
      company: x.companyName || '-',
      phone: x.phone || '-',
      email: x.email || '-',
      address: x.address || '-',
      status: x.isActive ? 'Active' : 'Inactive'
    }));

    this.pdfService.downloadTablePdf('Customer Report', columns, rows, 'customers.pdf');
  }

  printReport(): void {
    this.printService.printReport({
      title: 'Customer Report',
      data: this.filteredCustomers,
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

  private getFullName(item: Customer): string {
    return `${item.firstName || ''} ${item.lastName || ''}`.trim() || '-';
  }

  openForm(): void {
    this.isEditMode = false;
    this.selectedId = null;
    this.customer = { isActive: true };
    this.showForm = true;
  }

  toggleForm(editMode = false, customerData: Customer | null = null): void {
    this.isEditMode = editMode;
    this.showForm = true;

    if (editMode && customerData) {
      this.selectedId = customerData.id;
      this.customer = { ...customerData }; // Clone to avoid direct mutation
    } else {
      this.selectedId = null;
      this.customer = { isActive: true }; // Default values for new customer
    }
  }

  saveCustomer(): void {
    if (!this.customer.firstName?.trim() || !this.customer.phone?.trim()) {
      this.showToast('warning', 'Validation Error', 'First name and phone are required.');
      return;
    }

    if (this.isEditMode && this.selectedId) {
      this.customerService.update(this.selectedId, this.customer).subscribe({
        next: () => {
          this.afterSave('Customer updated successfully.');
        },
        error: (err) => {
          console.error('Error updating customer', err);
          this.showToast('danger', 'Update Failed', 'Unable to update the customer.');
        }
      });
    } else {
      this.customerService.create(this.customer).subscribe({
        next: () => {
          this.afterSave('Customer added successfully.');
        },
        error: (err) => {
          console.error('Error creating customer', err);
          this.showToast('danger', 'Save Failed', 'Unable to add the customer.');
        }
      });
    }
  }

  deleteCustomer(id: number): void {
    if (confirm('Are you sure you want to delete this customer?')) {
      this.customerService.delete(id).subscribe({
        next: () => {
          this.loadCustomers();
          this.showToast('success', 'Deleted', 'Customer deleted successfully.');
        },
        error: (err) => {
          console.error('Error deleting customer', err);
          this.showToast('danger', 'Delete Failed', 'Unable to delete the customer.');
        }
      });
    }
  }

  cancel(): void {
    this.showForm = false;
    this.customer = { isActive: true };
    this.isEditMode = false;
    this.selectedId = null;
  }

  private afterSave(message: string): void {
    this.loadCustomers();
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
