import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { SaleItem, InvoiceService, SearchSalesDto, SalesInvoiceDto, SalesInvoiceItemDto } from '../../../service/inventory/invoice-list.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExcelService } from '../../../service/common/excel.service';
import { PrintService } from '../../../service/common/print.service';
import { InvoiceGenerateService } from '../../../service/inventory/invoice-generate/invoice-pdf-generate.service';

type SalesInvoiceView = SaleItem & Partial<SalesInvoiceDto>;

@Component({
  selector: 'app-invoce-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './invoce-list.html',
  styleUrl: './invoce-list.css',
})

export class InvoiceListComponent implements OnInit {

  // Main data arrays
  invoices: SaleItem[] = [];
  filteredInvoices: SaleItem[] = [];
  selectedInvoice: SalesInvoiceView | null = null;

  // Filter properties matching template bindings
  searchQuery: string = '';
  selectedStartDate: string = '';
  selectedEndDate: string = '';
  selectedStatus: string = '';
  selectedCustomerId: string = '';
  selectedCompanyName: string = '';

  // Dropdown lists
  customers: { id: string; name: string }[] = [];

  // Calculated values (optimized)
  totalAmountSum: number = 0;
  uniqueCustomersCount: number = 0;

  // Pagination parameters
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalItems: number = 0;
  loading: boolean = false;

  constructor(
    private invoiceService: InvoiceService,
    private excelService: ExcelService,
    private printService: PrintService,
    private invoiceGenerateService: InvoiceGenerateService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadInvoices();
  }

  private buildSearchDto(): SearchSalesDto {
    return {
      searchText: this.searchQuery || undefined,
      startDate: this.selectedStartDate
        ? new Date(this.selectedStartDate).toISOString()
        : undefined,
      endDate: this.selectedEndDate
        ? new Date(this.selectedEndDate).toISOString()
        : undefined,
      customerId: this.selectedCustomerId || undefined,
      companyName: this.selectedCompanyName || undefined,
      pageNumber: this.currentPage,
      pageSize: this.itemsPerPage
    };
  }

  loadInvoices(): void {
    this.loading = true;
    const searchDto = this.buildSearchDto();

    this.invoiceService.GetAllBySearchWithPagination(searchDto).subscribe({
      next: (result) => {
        this.invoices = result.items || [];
        this.totalItems = result.totalCount;

        // Fix pagination overflow
        const totalPages = this.totalPages;
        if (this.currentPage > totalPages && totalPages > 0) {
          this.currentPage = 1;
          this.loadInvoices();
          return;
        }

        // Optimized calculations
        this.totalAmountSum = this.invoices.reduce((sum, item) => sum + this.getInvoiceTotal(item), 0);

        this.uniqueCustomersCount = new Set(
          this.invoices.map(p => this.getInvoiceCustomerName(p))
        ).size;

        this.customers = Array.from(
          new Map(
            this.invoices
              .map((invoice) => [
                String(invoice.customerId),
                {
                  id: String(invoice.customerId),
                  name: `${invoice.firstName || ''} ${invoice.lastName || ''}`.trim()
                }
              ] as const)
              .filter(([, customer]) => customer.id && customer.name)
          ).values()
        );

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading invoices', err);
        this.loading = false;
      }
    });
  }

  downloadPdf() {
    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 19).replace(/[:T]/g, '-');

    this.invoiceGenerateService.downloadInvoicePdf(
      'invoicePrintSection',
      `invoice-${formattedDate}.pdf`
    );
  }

  downloadExcel() {

    const rows = this.invoices.map((x, index) => ({
      SL: index + 1,
      Invoice: x.invoiceNumber,
      Customer: this.getInvoiceCustomerName(x),
      Company: x.companyName,
      TotalAmount: this.formatNumber(this.getInvoiceTotal(x)),
      PaidAmount: this.formatNumber(this.getInvoicePaid(x)),
      Discount: this.formatNumber(x.discount),
      Status: this.getInvoiceStatus(x)
    }));

    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 19).replace(/[:T]/g, '-');

    this.excelService.exportToExcel(
      rows,
      `invoice-report-${formattedDate}`
    );
  }

  printReport(): void {
    this.printService.printReport({
      title: 'Invoice Report',
      data: this.invoices,
      columns: [
        { header: 'Invoice', value: x => x.invoiceNumber },
        { header: 'Customer', value: x => this.getInvoiceCustomerName(x) },
        { header: 'Amount', value: x => `${this.formatNumber(this.getInvoiceTotal(x))} Tk` },
        { header: 'Paid', value: x => `${this.formatNumber(this.getInvoicePaid(x))} Tk` },
        { header: 'Status', value: x => this.getInvoiceStatus(x) }
      ]
    });
  }

  formatDate(date: string): string {

    if (!date || date.startsWith('0001-01-01')) {
      return '-';
    }

    return new Date(date).toLocaleDateString();
  }
  applyFilters(): void {
    this.currentPage = 1;
    this.loadInvoices();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedStartDate = '';
    this.selectedEndDate = '';
    this.selectedCustomerId = '';
    this.selectedCompanyName = '';
    this.selectedStatus = '';
    this.applyFilters();
  }

  get pagedInvoices(): SaleItem[] {
    return this.invoices;
  }

  get pageStart(): number {
    return this.totalItems === 0 ? 0 : ((Math.min(this.currentPage, this.totalPages) - 1) * this.itemsPerPage) + 1;
  }

  get currentRecordMaxRecord(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
  }

  onPageChange(pageNumber: number): void {
    if (pageNumber < 1 || pageNumber > this.totalPages) return;
    this.currentPage = pageNumber;
    this.loadInvoices();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.loadInvoices();
  }

  getTotalAmount(): number {
    return this.totalAmountSum;
  }

  getUniqueCustomersCount(): number {
    return this.uniqueCustomersCount;
  }

  createNewInvoice(): void {
    this.router.navigate(['/inventory/sales']);
  }

  editInvoice(invoice: SaleItem): void {
    this.router.navigate([`/invoice/edit`, invoice.id]);
  }

  viewInvoice(invoice: SaleItem): void {
    this.selectedInvoice = invoice;

    this.invoiceService.getById(invoice.id).subscribe({
      next: (invoiceDetail) => {
        this.selectedInvoice = { ...invoice, ...invoiceDetail };
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('Unable to load invoice details. Showing list data only.', err);
        this.cdr.detectChanges();
      }
    });
  }

  closeInvoiceView(): void {
    this.selectedInvoice = null;
  }

  getInvoiceCustomerName(invoice: SalesInvoiceView | SaleItem | null = this.selectedInvoice): string {
    if (!invoice) return '-';
    if (invoice.customerFullName) {
      return invoice.companyName ? `${invoice.customerFullName} (${invoice.companyName})` : invoice.customerFullName;
    }

    const personName = `${invoice.firstName || ''} ${invoice.lastName || ''}`.trim();
    return invoice.companyName ? `${personName} (${invoice.companyName})` : personName || '-';
  }

  getInvoiceContactName(invoice: SalesInvoiceView | SaleItem | null = this.selectedInvoice): string {
    if (!invoice) return '-';
    return invoice.customerFullName || `${invoice.firstName || ''} ${invoice.lastName || ''}`.trim() || '-';
  }

  getInvoiceStatus(invoice: SalesInvoiceView | SaleItem | null = this.selectedInvoice): string {
    if (!invoice) return '-';
    return invoice.isPaid ? 'Paid' : (invoice.status || 'Pending');
  }

  getInvoiceTotal(invoice: SalesInvoiceView | SaleItem | null = this.selectedInvoice): number {
    if (!invoice) return 0;

    const totalAmount = this.toNumber(invoice.totalAmount);
    if (totalAmount > 0) return totalAmount;

    const subTotal = this.toNumber(invoice.subTotal);
    const discount = this.toNumber(invoice.discount);
    return Math.max(subTotal - discount, 0);
  }

  getInvoicePaid(invoice: SalesInvoiceView | SaleItem | null = this.selectedInvoice): number {
    return this.toNumber(invoice?.paidAmount);
  }

  getInvoiceDue(invoice: SalesInvoiceView | SaleItem | null = this.selectedInvoice): number {
    return this.getInvoiceTotal(invoice) - this.getInvoicePaid(invoice);
  }

  getSelectedInvoiceItems(): SalesInvoiceItemDto[] {
    return this.selectedInvoice?.invoiceItems || [];
  }

  getInvoiceItemName(item: SalesInvoiceItemDto): string {
    const details = [item.model, item.brandName].filter(Boolean).join(', ');
    return details ? `${item.productName} (${details})` : item.productName;
  }

  getInvoiceItemTotal(item: SalesInvoiceItemDto): number {
    return this.toNumber(item.quantity) * this.toNumber(item.unitPrice);
  }

  getInvoiceItemSerials(item: SalesInvoiceItemDto): string {
    return item.serialNumbers?.length ? item.serialNumbers.join(', ') : '';
  }

  printInvoice(): void {
    if (!this.selectedInvoice) return;

    const printContents = document.getElementById('sales-invoice-print')?.innerHTML;
    if (!printContents) return;

    const win = window.open('', '_blank', 'width=1000,height=800');
    if (!win) return;

    win.document.open();
    win.document.write(`
      <html>
        <head>
          <title>${this.selectedInvoice.invoiceNumber || 'Sales Invoice'}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #212529; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #dee2e6; padding: 8px; font-size: 12px; }
            th { background: #f8f9fa; text-align: left; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .text-muted { color: #6c757d; }
            .font-weight-bold { font-weight: 700; }
            .row { display: flex; justify-content: space-between; gap: 24px; }
            .mb-0 { margin-bottom: 0; }
            @media print { @page { size: A4; margin: 12mm; } }
          </style>
        </head>
        <body>${printContents}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  }

  downloadInvoicePdf(): void {
    if (!this.selectedInvoice) return;

    this.invoiceGenerateService.downloadInvoicePdf(
      'sales-invoice-print',
      `${this.selectedInvoice.invoiceNumber || 'sales-invoice'}.pdf`
    );
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.itemsPerPage));
  }

  get currentRecordMax(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
  }

  private formatNumber(value: unknown): string {
    return this.toNumber(value).toFixed(2);
  }

  private toNumber(value: unknown): number {
    return Number(value) || 0;
  }
}
