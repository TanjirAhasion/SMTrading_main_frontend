import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ExcelService } from '../../../service/common/excel.service';
import { PrintService } from '../../../service/common/print.service';
import {
  RentalContractInvoiceDto,
  RentalContractInvoiceItemDto,
  RentalItem,
  RentalListService,
  SearchRentalDto
} from '../../../service/inventory/rental-list.service';
import { InvoiceGenerateService } from '../../../service/inventory/invoice-generate/invoice-pdf-generate.service';

type RentalView = Omit<RentalItem, 'paymentMethod' | 'status'>
  & Partial<Omit<RentalContractInvoiceDto, 'paymentMethod' | 'status'>>
  & {
    paymentMethod?: string | number;
    status?: string | number;
  };

@Component({
  selector: 'app-rental-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rental-list.html',
  styleUrl: './rental-list.css',
})
export class RentalList implements OnInit {
  private rentalService = inject(RentalListService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private excelService = inject(ExcelService);
  private printService = inject(PrintService);
  private invoiceGenerateService = inject(InvoiceGenerateService);

  rentals: RentalItem[] = [];
  customers: { id: string; name: string }[] = [];
  selectedRental: RentalView | null = null;

  searchQuery = '';
  selectedStartDate = '';
  selectedEndDate = '';
  selectedStatus = '';
  selectedCustomerId = '';
  selectedCompanyName = '';

  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;
  loading = false;

  totalAmountSum = 0;
  uniqueCustomersCount = 0;

  ngOnInit(): void {
    this.loadRentals();
  }

  private buildSearchDto(): SearchRentalDto {
    return {
      searchText: this.searchQuery || undefined,
      startDate: this.selectedStartDate ? new Date(this.selectedStartDate).toISOString() : undefined,
      endDate: this.selectedEndDate ? new Date(this.selectedEndDate).toISOString() : undefined,
      customerId: this.selectedCustomerId || undefined,
      companyName: this.selectedCompanyName || undefined,
      status: this.selectedStatus || undefined,
      pageNumber: this.currentPage,
      pageSize: this.itemsPerPage
    };
  }

  loadRentals(): void {
    this.loading = true;

    this.rentalService.GetAllBySearchWithPagination(this.buildSearchDto()).subscribe({
      next: (result) => {
        this.rentals = result.items || [];
        this.totalItems = result.totalCount;

        const totalPages = this.totalPages;
        if (this.currentPage > totalPages && totalPages > 0) {
          this.currentPage = 1;
          this.loadRentals();
          return;
        }

        this.totalAmountSum = this.rentals.reduce((sum, item) => sum + this.getRentalAmount(item), 0);
        this.uniqueCustomersCount = new Set(this.rentals.map(item => this.getCustomerName(item))).size;
        this.customers = Array.from(
          new Map(
            this.rentals
              .map((rental) => [
                String(rental.customerId),
                {
                  id: String(rental.customerId),
                  name: `${rental.firstName || ''} ${rental.lastName || ''}`.trim()
                }
              ] as const)
              .filter(([, customer]) => customer.id && customer.name)
          ).values()
        );

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading rentals', err);
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadRentals();
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

  onPageChange(pageNumber: number): void {
    if (pageNumber < 1 || pageNumber > this.totalPages) return;
    this.currentPage = pageNumber;
    this.loadRentals();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.loadRentals();
  }

  createNewRental(): void {
    this.router.navigate(['/inventory/rentalcontract']);
  }

  editRental(rental: RentalItem): void {
    this.router.navigate(['/rental/edit', rental.id]);
  }

  viewRental(rental: RentalItem): void {
    this.selectedRental = rental;

    this.rentalService.getById(rental.id).subscribe({
      next: (rentalDetail) => {
        this.selectedRental = { ...rental, ...rentalDetail };
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('Unable to load rental details. Showing list data only.', err);
        this.cdr.detectChanges();
      }
    });
  }

  closeRentalView(): void {
    this.selectedRental = null;
  }

  downloadPdf(): void {
    const formattedDate = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    this.invoiceGenerateService.downloadInvoicePdf('rentalPrintSection', `rental-${formattedDate}.pdf`);
  }

  downloadExcel(): void {
    const rows = this.rentals.map((x, index) => ({
      SL: index + 1,
      Contract: this.getContractNumber(x),
      Customer: this.getCustomerName(x),
      Company: x.companyName,
      StartDate: x.startDate ? new Date(x.startDate).toLocaleDateString() : '-',
      EndDate: x.endDate ? new Date(x.endDate).toLocaleDateString() : '-',
      Amount: this.formatNumber(this.getRentalAmount(x)),
      Status: this.getStatus(x)
    }));

    const formattedDate = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    this.excelService.exportToExcel(rows, `rental-report-${formattedDate}`);
  }

  printReport(): void {
    this.printService.printReport({
      title: 'Rental Report',
      data: this.rentals,
      columns: [
        { header: 'Contract', value: x => this.getContractNumber(x) },
        { header: 'Customer', value: x => this.getCustomerName(x) },
        { header: 'Start', value: x => x.startDate ? new Date(x.startDate).toLocaleDateString() : '-' },
        { header: 'End', value: x => x.endDate ? new Date(x.endDate).toLocaleDateString() : '-' },
        { header: 'Amount', value: x => `${this.formatNumber(this.getRentalAmount(x))} Tk`, align: 'right' },
        { header: 'Status', value: x => this.getStatus(x), align: 'center' }
      ]
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.itemsPerPage));
  }

  get pageStart(): number {
    return this.totalItems === 0 ? 0 : ((Math.min(this.currentPage, this.totalPages) - 1) * this.itemsPerPage) + 1;
  }

  get currentRecordMaxRecord(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
  }

  getTotalAmount(): number {
    return this.totalAmountSum;
  }

  getUniqueCustomersCount(): number {
    return this.uniqueCustomersCount;
  }

  getContractNumber(rental: RentalView | RentalItem | null = this.selectedRental): string {
    if (!rental) return '-';
    return rental.contractNumber || rental.rentalNumber || `RC-${rental.id}`;
  }

  getCustomerName(rental: RentalView | RentalItem | null = this.selectedRental): string {
    if (!rental) return '-';
    if (rental.customerFullName) {
      return rental.companyName ? `${rental.customerFullName} (${rental.companyName})` : rental.customerFullName;
    }

    const name = `${rental.firstName || ''} ${rental.lastName || ''}`.trim();
    return rental.companyName ? `${name} (${rental.companyName})` : name || '-';
  }

  getCustomerContactName(rental: RentalView | RentalItem | null = this.selectedRental): string {
    if (!rental) return '-';
    return rental.customerFullName || `${rental.firstName || ''} ${rental.lastName || ''}`.trim() || '-';
  }

  getRentalAmount(rental: RentalView | RentalItem | null = this.selectedRental): number {
    return this.toNumber(rental?.totalAmount) || this.toNumber(rental?.totalRent) || this.getSelectedRentalItems(rental).reduce(
      (sum, item) => sum + this.getRentalItemTotal(item),
      0
    );
  }

  getStatus(rental: RentalView | RentalItem | null = this.selectedRental): string {
    if (!rental) return '-';

    if (typeof rental.status === 'number') {
      return rental.status === 1 ? 'Active' : rental.status === 2 ? 'Closed' : 'Pending';
    }

    return rental.status || (rental.isActive ? 'Active' : 'Closed');
  }

  getBillingCycle(rental: RentalView | RentalItem | null = this.selectedRental): string {
    if (!rental) return '-';
    return Number(rental.billingCycle) === 2 ? 'Yearly' : 'Monthly';
  }

  getPaymentMethod(rental: RentalView | RentalItem | null = this.selectedRental): string {
    if (!rental) return '-';
    if (typeof rental.paymentMethod === 'number') {
      return rental.paymentMethod === 2 ? 'Bank' : 'Cash';
    }

    return rental.paymentMethod || '-';
  }

  getSelectedRentalItems(rental: RentalView | RentalItem | null = this.selectedRental): RentalContractInvoiceItemDto[] {
    return rental?.invoiceItems || [];
  }

  getRentalItemName(item: RentalContractInvoiceItemDto): string {
    const details = [item.model, item.brandName].filter(Boolean).join(', ');
    return details ? `${item.productName} (${details})` : item.productName;
  }

  getRentalItemTotal(item: RentalContractInvoiceItemDto): number {
    return this.toNumber(item.quantity) * this.toNumber(item.unitRent);
  }

  getRentalItemSerials(item: RentalContractInvoiceItemDto): string {
    return item.serialNumbers?.length ? item.serialNumbers.join(', ') : '';
  }

  printRentalContract(): void {
    if (!this.selectedRental) return;

    const printContents = document.getElementById('rental-contract-print')?.innerHTML;
    if (!printContents) return;

    const win = window.open('', '_blank', 'width=1000,height=800');
    if (!win) return;

    win.document.open();
    win.document.write(`
      <html>
        <head>
          <title>${this.getContractNumber() || 'Rental Contract'}</title>
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

  downloadRentalContractPdf(): void {
    if (!this.selectedRental) return;

    this.invoiceGenerateService.downloadInvoicePdf(
      'rental-contract-print',
      `${this.getContractNumber() || 'rental-contract'}.pdf`
    );
  }

  private formatNumber(value: unknown): string {
    return this.toNumber(value).toFixed(2);
  }

  private toNumber(value: unknown): number {
    return Number(value) || 0;
  }
}
