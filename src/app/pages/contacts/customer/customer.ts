import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Customer, CustomerPaymentHistory, CustomerService } from '../../../service/contacts/customer.service'; // Adjust path as needed
import { PdfService } from '../../../service/common/pdf.service';
import { ExcelService } from '../../../service/common/excel.service';
import { PrintService } from '../../../service/common/print.service';
import { InvoiceService, SaleItem } from '../../../service/inventory/invoice-list.service';
import { CashAccountDto, CashAccountService } from '../../../service/cash-management/cash-account.service';
import { createEmptyToast, ToastController, ToastState, ToastType } from '../../../service/common/toast-helper';

@Component({
  selector: 'app-customer',
  imports: [CommonModule, FormsModule],
  templateUrl: './customer.html',
  styleUrl: './customer.css',
})
export class CustomerComponent implements OnInit, OnDestroy {

  // State Management
  customers: Customer[] = [];
  customer: Partial<Customer> = {}; // The model for the form
  showForm = false;
  loading = false;
  isEditMode = false;
  selectedId: number | null = null;
  search = '';
  selectedActiveStatus = '';
  appliedActiveStatus = '';
  page = 1;
  pageSize = 10;
  selectedCustomer: Customer | null = null;
  showInvoiceModal = false;
  showPaymentHistoryModal = false;
  customerInvoices: SaleItem[] = [];
  invoiceTotalCount = 0;
  invoicePage = 1;
  invoicePageSize = 10;
  loadingInvoices = false;
  paymentHistory: CustomerPaymentHistory[] = [];
  selectedPaymentHistoryDetail: CustomerPaymentHistory | null = null;
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
    private customerService: CustomerService,
    private pdfService: PdfService,
    private excelService: ExcelService,
    private printService: PrintService,
    private invoiceService: InvoiceService,
    private cashAccountService: CashAccountService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadCustomers();
    this.loadCashAccounts();
  }

  ngOnDestroy(): void {
    this.toastController.destroy();
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
    const status = this.appliedActiveStatus;

    return this.customers.filter((item) => {
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

  get totalDueAmount(): number {
    return this.customers.reduce((sum, item) => sum + (Number(item.dueAmount) || 0), 0);
  }

  get hasMoreInvoices(): boolean {
    return this.invoiceTotalCount > this.customerInvoices.length;
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

  createSale(customer: Customer): void {
    this.router.navigate(['/inventory/sales'], {
      queryParams: {
        customerId: customer.id,
        customerName: `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
      }
    });
  }

  openInvoiceModal(customer: Customer): void {
    this.selectedCustomer = customer;
    this.showInvoiceModal = true;
    this.invoicePage = 1;
    this.customerInvoices = [];
    this.loadCustomerInvoices();
  }

  loadCustomerInvoices(loadMore = false): void {
    if (!this.selectedCustomer) return;

    this.loadingInvoices = true;
    this.invoiceService.GetAllBySearchWithPagination({
      customerId: String(this.selectedCustomer.id),
      pageNumber: this.invoicePage,
      pageSize: this.invoicePageSize
    }).subscribe({
      next: (result) => {
        this.invoiceTotalCount = result.totalCount || 0;
        this.customerInvoices = loadMore
          ? [...this.customerInvoices, ...(result.items || [])]
          : (result.items || []);
        this.loadingInvoices = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading customer invoices', err);
        this.loadingInvoices = false;
        this.showToast('danger', 'Load Failed', 'Unable to load customer invoices.');
      }
    });
  }

  viewMoreInvoices(): void {
    this.invoicePage += 1;
    this.loadCustomerInvoices(true);
  }

  closeInvoiceModal(): void {
    this.showInvoiceModal = false;
    this.selectedCustomer = null;
    this.customerInvoices = [];
    this.invoiceTotalCount = 0;
  }

  openPaymentHistoryModal(customer: Customer): void {
    this.selectedCustomer = customer;
    this.showPaymentHistoryModal = true;
    this.paymentForm = {
      amount: null,
      cashAccountId: this.activeCashAccounts[0]?.id ?? null,
      actionType: 1,
      paymentMethod: 1,
      paymentDate: this.getTodayDate(),
      note: ''
    };
    this.loadCustomerPaymentHistory();
  }

  loadCustomerPaymentHistory(): void {
    if (!this.selectedCustomer) return;

    this.loadingPaymentHistory = true;
    this.selectedPaymentHistoryDetail = null;
    this.customerService.getPaymentHistory(this.selectedCustomer.id).subscribe({
      next: (data) => {
        this.paymentHistory = data;
        this.loadingPaymentHistory = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading customer payment history', err);
        this.loadingPaymentHistory = false;
        this.showToast('danger', 'Load Failed', 'Unable to load payment history.');
      }
    });
  }

  submitDuePayment(): void {
    if (!this.selectedCustomer) return;

    const amount = Number(this.paymentForm.amount) || 0;
    const dueAmount = Number(this.selectedCustomer.dueAmount) || 0;

    if (amount <= 0) {
      this.showToast('warning', 'Validation Error', 'Amount must be greater than zero.');
      return;
    }

    if (amount > dueAmount) {
      this.showToast('warning', 'Validation Error', 'Amount cannot be more than customer due.');
      return;
    }

    if (this.paymentForm.actionType === 1 && !this.paymentForm.cashAccountId) {
      this.showToast('warning', 'Validation Error', 'Select a cash account for payment.');
      return;
    }

    this.savingPayment = true;
    this.customerService.collectDue({
      customerId: this.selectedCustomer.id,
      amount,
      cashAccountId: this.paymentForm.actionType === 1 ? this.paymentForm.cashAccountId : null,
      actionType: this.paymentForm.actionType,
      paymentMethod: this.paymentForm.paymentMethod,
      paymentDate: this.paymentForm.paymentDate,
      note: this.paymentForm.note
    }).subscribe({
      next: () => {
        this.savingPayment = false;
        this.showToast('success', 'Success', 'Customer due updated successfully.');
        this.loadCustomers();
        this.loadCashAccounts();
        this.selectedCustomer = {
          ...this.selectedCustomer!,
          dueAmount: Math.max(0, dueAmount - amount)
        };
        this.paymentForm.amount = null;
        this.paymentForm.note = '';
        this.loadCustomerPaymentHistory();
      },
      error: (err) => {
        console.error('Error updating customer due', err);
        this.savingPayment = false;
        this.showToast('danger', 'Payment Failed', typeof err.error === 'string' ? err.error : 'Unable to update customer due.');
      }
    });
  }

  closePaymentHistoryModal(): void {
    this.showPaymentHistoryModal = false;
    this.selectedCustomer = null;
    this.paymentHistory = [];
    this.selectedPaymentHistoryDetail = null;
  }

  showPaymentHistoryDetail(history: CustomerPaymentHistory): void {
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

  getInvoiceDue(item: SaleItem): number {
    const total = (Number(item.subTotal) || 0) - (Number(item.discount) || 0);
    const paid = Number(item.paidAmount) || 0;
    return Math.max(0, total - paid);
  }

  private getTodayDate(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private afterSave(message: string): void {
    this.loadCustomers();
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
