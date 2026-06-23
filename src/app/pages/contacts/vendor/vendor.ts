import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Vendor, VendorPaymentHistory, VendorService } from '../../../service/contacts/vendor.service'; // Adjust path as needed
import { PdfService } from '../../../service/common/pdf.service';
import { ExcelService } from '../../../service/common/excel.service';
import { PrintService } from '../../../service/common/print.service';
import { PurchaseItem, PurchaseListService } from '../../../service/inventory/purchase-list.service';
import { CashAccountDto, CashAccountService } from '../../../service/cash-management/cash-account.service';
import { createEmptyToast, ToastController, ToastState, ToastType } from '../../../service/common/toast-helper';

@Component({
  selector: 'app-vendor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vendor.html',
  styleUrl: './vendor.css',
})

export class VendorComponent implements OnInit, OnDestroy {
  //private vendorService = inject(VendorService);

  // State Management
  vendors: Vendor[] = [];
  vendor: Partial<Vendor> = {}; // The model for the form
  showForm = false;
  loading = false;
  isEditMode = false;
  selectedId: number | null = null;
  search = '';
  selectedActiveStatus = '';
  appliedActiveStatus = '';
  page = 1;
  pageSize = 10;
  selectedVendor: Vendor | null = null;
  showInvoiceModal = false;
  showPaymentHistoryModal = false;
  vendorInvoices: PurchaseItem[] = [];
  invoiceTotalCount = 0;
  invoicePage = 1;
  invoicePageSize = 10;
  loadingInvoices = false;
  paymentHistory: VendorPaymentHistory[] = [];
  selectedPaymentHistoryDetail: VendorPaymentHistory | null = null;
  loadingPaymentHistory = false;
  cashAccounts: CashAccountDto[] = [];
  paymentForm = {
    amount: null as number | null,
    cashAccountId: null as number | null,
    actionType: 1,
    paymentMethod: 1,
    paymentDate: this.getTodayDate(),
    note: ''
  };
  savingPayment = false;
  toast: ToastState = createEmptyToast();
  private readonly toastController = new ToastController();

  constructor(
    private vendorService: VendorService,
    private pdfService: PdfService,
    private excelService: ExcelService,
    private printService: PrintService,
    private purchaseListService: PurchaseListService,
    private cashAccountService: CashAccountService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadVendors();
    this.loadCashAccounts();
  }

  ngOnDestroy(): void {
    this.toastController.destroy();
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
    const status = this.appliedActiveStatus;

    return this.vendors.filter((item) => {
      const matchesStatus = !status
        || (status === 'active' && item.isActive)
        || (status === 'inactive' && !item.isActive);

      const matchesSearch = !term
        || item.firstName?.toLowerCase().includes(term)
        || item.lastName?.toLowerCase().includes(term)
        || item.companyName?.toLowerCase().includes(term)
        || item.phone?.toLowerCase().includes(term)
        || item.email?.toLowerCase().includes(term);

      return matchesStatus && matchesSearch;
    });
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

  get totalDueAmount(): number {
    return this.vendors.reduce((sum, item) => sum + (Number(item.dueAmount) || 0), 0);
  }

  get hasMoreInvoices(): boolean {
    return this.invoiceTotalCount > this.vendorInvoices.length;
  }

  get activeCashAccounts(): CashAccountDto[] {
    return this.cashAccounts.filter((item) => item.isActive);
  }

  get selectedPaymentCashAccount(): CashAccountDto | undefined {
    return this.cashAccounts.find((item) => item.id === this.paymentForm.cashAccountId);
  }

  get selectedPaymentCashBalance(): number {
    return Number(this.selectedPaymentCashAccount?.currentBalance) || 0;
  }

  onSearch(): void {
    this.appliedActiveStatus = this.selectedActiveStatus;
    this.page = 1;
  }

  onPageSizeChange(): void {
    this.page = 1;
  }

  resetFilters(): void {
    this.search = '';
    this.selectedActiveStatus = '';
    this.appliedActiveStatus = '';
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

  loadCashAccounts(): void {
    this.cashAccountService.getAll().subscribe({
      next: (data) => {
        this.cashAccounts = data;
      },
      error: (err) => {
        console.error('Error loading cash accounts', err);
      }
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

  openInvoiceModal(vendor: Vendor): void {
    this.selectedVendor = vendor;
    this.showInvoiceModal = true;
    this.invoicePage = 1;
    this.vendorInvoices = [];
    this.loadVendorInvoices();
  }

  loadVendorInvoices(loadMore = false): void {
    if (!this.selectedVendor) return;

    this.loadingInvoices = true;
    this.purchaseListService.GetAllBySearchWithPagination({
      vendorId: String(this.selectedVendor.id),
      pageNumber: this.invoicePage,
      pageSize: this.invoicePageSize
    }).subscribe({
      next: (result) => {
        this.invoiceTotalCount = result.totalCount || 0;
        this.vendorInvoices = loadMore
          ? [...this.vendorInvoices, ...(result.items || [])]
          : (result.items || []);
        this.loadingInvoices = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading vendor invoices', err);
        this.loadingInvoices = false;
        this.showToast('danger', 'Load Failed', 'Unable to load vendor invoices.');
      }
    });
  }

  viewMoreInvoices(): void {
    this.invoicePage += 1;
    this.loadVendorInvoices(true);
  }

  closeInvoiceModal(): void {
    this.showInvoiceModal = false;
    this.selectedVendor = null;
    this.vendorInvoices = [];
    this.invoiceTotalCount = 0;
  }

  openPaymentHistoryModal(vendor: Vendor): void {
    this.selectedVendor = vendor;
    this.showPaymentHistoryModal = true;
    this.paymentForm = {
      amount: null,
      cashAccountId: this.activeCashAccounts[0]?.id ?? null,
      actionType: 1,
      paymentMethod: 1,
      paymentDate: this.getTodayDate(),
      note: ''
    };
    this.loadVendorPaymentHistory();
  }

  loadVendorPaymentHistory(): void {
    if (!this.selectedVendor) return;

    this.loadingPaymentHistory = true;
    this.selectedPaymentHistoryDetail = null;
    this.vendorService.getPaymentHistory(this.selectedVendor.id).subscribe({
      next: (data) => {
        this.paymentHistory = data;
        this.loadingPaymentHistory = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading vendor payment history', err);
        this.loadingPaymentHistory = false;
        this.showToast('danger', 'Load Failed', 'Unable to load payment history.');
      }
    });
  }

  submitDuePayment(): void {
    if (!this.selectedVendor) return;

    const amount = Number(this.paymentForm.amount) || 0;
    const dueAmount = Number(this.selectedVendor.dueAmount) || 0;

    if (amount <= 0) {
      this.showToast('warning', 'Validation Error', 'Amount must be greater than zero.');
      return;
    }

    if (amount > dueAmount) {
      this.showToast('warning', 'Validation Error', 'Amount cannot be more than vendor due.');
      return;
    }

    if (this.paymentForm.actionType === 1 && !this.paymentForm.cashAccountId) {
      this.showToast('warning', 'Validation Error', 'Select a cash account for payment.');
      return;
    }

    this.savingPayment = true;
    this.vendorService.payDue({
      vendorId: this.selectedVendor.id,
      amount,
      cashAccountId: this.paymentForm.actionType === 1 ? this.paymentForm.cashAccountId : null,
      actionType: this.paymentForm.actionType,
      paymentMethod: this.paymentForm.paymentMethod,
      paymentDate: this.paymentForm.paymentDate,
      note: this.paymentForm.note
    }).subscribe({
      next: () => {
        this.savingPayment = false;
        this.showToast('success', 'Success', 'Vendor due updated successfully.');
        this.loadVendors();
        this.loadCashAccounts();
        this.selectedVendor = {
          ...this.selectedVendor!,
          dueAmount: Math.max(0, dueAmount - amount)
        };
        this.paymentForm.amount = null;
        this.paymentForm.note = '';
        this.loadVendorPaymentHistory();
      },
      error: (err) => {
        console.error('Error updating vendor due', err);
        this.savingPayment = false;
        this.showToast('danger', 'Payment Failed', typeof err.error === 'string' ? err.error : 'Unable to update vendor due.');
      }
    });
  }

  closePaymentHistoryModal(): void {
    this.showPaymentHistoryModal = false;
    this.selectedVendor = null;
    this.paymentHistory = [];
    this.selectedPaymentHistoryDetail = null;
  }

  showPaymentHistoryDetail(history: VendorPaymentHistory): void {
    this.selectedPaymentHistoryDetail = history;
  }

  closePaymentHistoryDetail(): void {
    this.selectedPaymentHistoryDetail = null;
  }

  formatNumber(value: number | string | null | undefined): string {
    return (Number(value) || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  getInvoiceDue(item: PurchaseItem): number {
    const total = (Number(item.subTotal) || 0) - (Number(item.discount) || 0);
    const paid = Number(item.paidAmount ?? item.amount) || 0;
    return Math.max(0, total - paid);
  }

  private getTodayDate(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private afterSave(message: string): void {
    this.loadVendors();
    this.cancel();
    this.showToast('success', 'Success', message);
  }

  showToast(type: ToastType, title: string, message: string): void {
    this.toastController.show(type, title, message, (toast) => this.toast = toast, () => this.closeToast());
  }

  closeToast(): void {
    this.toastController.close((toast) => this.toast = toast);
  }
}
