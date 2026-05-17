import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  PurchaseDetailItem,
  PurchaseInvoiceDto,
  PurchaseItem,
  PurchaseListService,
  SearchPurchaseDto
} from '../../../service/inventory/purchase-list.service';
import { PdfService } from '../../../service/common/pdf.service';
import { ExcelService } from '../../../service/common/excel.service';
import { PrintService } from '../../../service/common/print.service';
import { InvoiceGenerateService } from '../../../service/inventory/invoice-generate/invoice-pdf-generate.service';

type PurchaseView = PurchaseItem & Partial<PurchaseInvoiceDto>;

@Component({
  selector: 'app-purchase-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './purchase-list.html',
  styleUrls: ['./purchase-list.css'],
})
export class PurchaseListComponent implements OnInit {

  private purchaseService = inject(PurchaseListService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private pdfService = inject(PdfService);
  private excelService = inject(ExcelService);
  private printService = inject(PrintService);
  private invoiceGenerateService = inject(InvoiceGenerateService);

  public Math = Math;

  purchases: PurchaseItem[] = [];
  loading: boolean = false;
  selectedPurchase: PurchaseView | null = null;

  // Filters
  searchQuery: string = '';
  selectedStartDate: string = '';
  selectedEndDate: string = '';
  selectedVendorId: string = '';
  selectedCompanyName: string = '';

  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalItems: number = 0;

  // Calculated values (optimized)
  totalAmountSum: number = 0;
  uniqueVendorsCount: number = 0;

  // Mock dropdowns (replace with API later)
  vendors: { id: string; name: string }[] = [];

  ngOnInit(): void {
    this.loadPurchases();
  }

  private buildSearchDto(): SearchPurchaseDto {
    return {
      searchText: this.searchQuery || undefined,
      startDate: this.selectedStartDate
        ? new Date(this.selectedStartDate).toISOString()
        : undefined,
      endDate: this.selectedEndDate
        ? new Date(this.selectedEndDate).toISOString()
        : undefined,
      vendorId: this.selectedVendorId || undefined,
      companyName: this.selectedCompanyName || undefined,
      pageNumber: this.currentPage,
      pageSize: this.itemsPerPage
    };
  }

  loadPurchases(): void {
    this.loading = true;
    const searchDto = this.buildSearchDto();

    this.purchaseService.GetAllBySearchWithPagination(searchDto).subscribe({
      next: (result) => {
        this.purchases = result.items || [];
        this.totalItems = result.totalCount;

        // Fix pagination overflow
        const totalPages = this.totalPages;
        if (this.currentPage > totalPages && totalPages > 0) {
          this.currentPage = 1;
          this.loadPurchases();
          return;
        }

        // Optimized calculations
        this.totalAmountSum = this.purchases.reduce((sum, item) => sum + this.getPurchaseTotal(item), 0);

        this.uniqueVendorsCount = new Set(
          this.purchases.map(p => this.getPurchaseVendorName(p))
        ).size;

        this.vendors = Array.from(
          new Map(
            this.purchases
              .map((purchase) => [
                String(purchase.vendorId),
                {
                  id: String(purchase.vendorId),
                  name: `${purchase.firstName || ''} ${purchase.lastName || ''}`.trim()
                }
              ] as const)
              .filter(([, vendor]) => vendor.id && vendor.name)
          ).values()
        );

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading purchases', err);
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadPurchases();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedStartDate = '';
    this.selectedEndDate = '';
    this.selectedVendorId = '';
    this.selectedCompanyName = '';
    this.currentPage = 1;
    this.loadPurchases();
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadPurchases();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.loadPurchases();
  }

  downloadPdf(): void {
    const columns = [
      { header: 'PO Number', field: 'purchaseNumber' },
      { header: 'Vendor', field: 'vendorName' },
      { header: 'Purchase Date', field: 'purchaseDate' },
      { header: 'Total Amount', field: 'totalAmount' },
      { header: 'Paid Amount', field: 'paidAmount' },
      { header: 'Status', field: 'status' }
    ];

    const rows = this.purchases.map(x => ({
      purchaseNumber: x.purchaseNumber,
      vendorName: this.getPurchaseVendorName(x),
      purchaseDate: x.purchaseDate ? new Date(x.purchaseDate).toLocaleDateString() : '-',
      totalAmount: this.formatNumber(this.getPurchaseTotal(x)),
      paidAmount: this.formatNumber(this.getPurchasePaid(x)),
      status: x.isPaid ? 'Paid' : 'Pending'
    }));

    const formattedDate = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    this.pdfService.downloadTablePdf('Purchase Report', columns, rows, `purchase-${formattedDate}.pdf`);
  }

  downloadExcel(): void {
    const rows = this.purchases.map((x, index) => ({
      SL: index + 1,
      Purchase: x.purchaseNumber,
      Vendor: this.getPurchaseVendorName(x),
      Company: x.companyName,
      TotalAmount: this.formatNumber(this.getPurchaseTotal(x)),
      PaidAmount: this.formatNumber(this.getPurchasePaid(x)),
      Status: x.isPaid ? 'Paid' : 'Pending'
    }));

    const formattedDate = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    this.excelService.exportToExcel(rows, `purchase-report-${formattedDate}`);
  }

  printReport(): void {
    this.printService.printReport({
      title: 'Purchase Report',
      data: this.purchases,
      columns: [
        { header: 'PO Number', value: x => x.purchaseNumber },
        { header: 'Vendor', value: x => this.getPurchaseVendorName(x) },
        { header: 'Amount', value: x => `${this.formatNumber(this.getPurchaseTotal(x))} Tk`, align: 'right' },
        { header: 'Paid', value: x => `${this.formatNumber(this.getPurchasePaid(x))} Tk`, align: 'right' },
        { header: 'Status', value: x => x.isPaid ? 'Paid' : 'Pending', align: 'center' }
      ]
    });
  }

  createNewPurchase(): void {
    this.router.navigate(['/inventory/purchase']);
  }

  editPurchase(item: PurchaseItem): void {
    this.router.navigate(['/purchase/edit', item.id]);
  }

  viewPurchase(item: PurchaseItem): void {
    this.selectedPurchase = item;

    this.purchaseService.getById(item.id).subscribe({
      next: (purchase) => {
        this.selectedPurchase = { ...item, ...purchase };
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('Unable to load purchase details. Showing list data only.', err);
        this.cdr.detectChanges();
      }
    });
  }

  closePurchaseView(): void {
    this.selectedPurchase = null;
  }

  getPurchaseVendorName(purchase: PurchaseView | PurchaseItem | null = this.selectedPurchase): string {
    if (!purchase) return '-';
    if (purchase.vendorFullName) {
      return purchase.companyName ? `${purchase.vendorFullName} (${purchase.companyName})` : purchase.vendorFullName;
    }
    const personName = `${purchase.firstName || ''} ${purchase.lastName || ''}`.trim();
    return purchase.companyName ? `${personName} (${purchase.companyName})` : personName || '-';
  }

  getPurchaseContactName(purchase: PurchaseView | PurchaseItem | null = this.selectedPurchase): string {
    if (!purchase) return '-';
    return purchase.vendorFullName || `${purchase.firstName || ''} ${purchase.lastName || ''}`.trim() || '-';
  }

  getPurchaseTotal(purchase: PurchaseView | PurchaseItem | null = this.selectedPurchase): number {
    if (!purchase) return 0;

    const totalAmount = this.toNumber(purchase.totalAmount);
    if (totalAmount > 0) return totalAmount;

    const subTotal = this.toNumber(purchase.subTotal);
    const discount = this.toNumber(purchase.discount);
    return Math.max(subTotal - discount, 0);
  }

  getPurchasePaid(purchase: PurchaseView | PurchaseItem | null = this.selectedPurchase): number {
    return this.toNumber(purchase?.paidAmount ?? purchase?.amount);
  }

  getPurchaseDue(purchase: PurchaseView | PurchaseItem | null = this.selectedPurchase): number {
    return this.getPurchaseTotal(purchase) - this.getPurchasePaid(purchase);
  }

  getSelectedPurchaseItems(): PurchaseDetailItem[] {
    const purchase = this.selectedPurchase as any;
    return purchase?.invoiceItems || purchase?.items || purchase?.purchaseItems || [];
  }

  getDetailItemName(item: PurchaseDetailItem): string {
    const name = item.productName || item.name || 'Product';
    const details = [item.model, item.brandName].filter(Boolean).join(', ');
    return details ? `${name} (${details})` : name;
  }

  getDetailItemTotal(item: PurchaseDetailItem): number {
    return this.toNumber(item.totalAmount ?? item.subTotal) || (this.toNumber(item.quantity) * this.toNumber(item.unitCost));
  }

  getDetailItemSerials(item: PurchaseDetailItem): string {
    return item.productSerialNumber?.length ? item.productSerialNumber.join(', ') : '';
  }

  printPurchaseInvoice(): void {
    if (!this.selectedPurchase) return;

    const printContents = document.getElementById('purchase-invoice-print')?.innerHTML;
    if (!printContents) return;

    const win = window.open('', '_blank', 'width=1000,height=800');
    if (!win) return;

    win.document.open();
    win.document.write(`
      <html>
        <head>
          <title>${this.selectedPurchase.purchaseNumber || 'Purchase Invoice'}</title>
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

  downloadPurchaseInvoicePdf(): void {
    if (!this.selectedPurchase) return;

    this.invoiceGenerateService.downloadInvoicePdf(
      'purchase-invoice-print',
      `${this.selectedPurchase.purchaseNumber}.pdf`
    );
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.itemsPerPage));
  }

  get pageStart(): number {
    return this.totalItems === 0 ? 0 : ((Math.min(this.currentPage, this.totalPages) - 1) * this.itemsPerPage) + 1;
  }

  get currentRecordMax(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
  }

  getTotalAmount(): number {
    return this.totalAmountSum;
  }
  getUniqueVendorsCount(): number {
    return this.uniqueVendorsCount;

  }

  private formatNumber(value: unknown): string {
    return this.toNumber(value).toFixed(2);
  }

  private toNumber(value: unknown): number {
    return Number(value) || 0;
  }
}
