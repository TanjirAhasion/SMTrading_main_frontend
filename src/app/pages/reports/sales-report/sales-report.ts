import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Customer, CustomerService } from '../../../service/contacts/customer.service';
import { ExcelService } from '../../../service/common/excel.service';
import { PdfService } from '../../../service/common/pdf.service';
import { Brand, BrandService } from '../../../service/item/brand.service';
import { Product, ProductService } from '../../../service/item/product.service';
import { SerialReportService, SerialSalesReportRow } from '../../../service/reports/serial-report.service';
import { compactFilter, createReportFilterForm, exportReport, getProductOptions } from '../report-shared';
import { ReportTableColumn, ReportTableComponent } from '../report-table/report-table';

@Component({
  selector: 'app-sales-report',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ReportTableComponent],
  templateUrl: './sales-report.html'
})
export class SalesReportComponent implements OnInit {
  private fb = inject(FormBuilder);
  filterForm = createReportFilterForm(this.fb);
  products: Product[] = [];
  brands: Brand[] = [];
  customers: Customer[] = [];
  rows: SerialSalesReportRow[] = [];
  totalCount = 0;
  page = 1;
  pageSize = 20;
  sortBy = 'saleDate';
  sortDirection: 'asc' | 'desc' = 'desc';
  loading = false;
  columns: ReportTableColumn[] = [
    { key: 'serialNumber', label: 'Serial', sortable: true },
    { key: 'product', label: 'Product', sortable: true },
    { key: 'customer', label: 'Customer' },
    { key: 'invoiceNo', label: 'Invoice No' },
    { key: 'saleDate', label: 'Sale Date', type: 'date', sortable: true },
    { key: 'amount', label: 'Amount', type: 'number', align: 'right' }
  ];

  constructor(
    private reports: SerialReportService,
    private productService: ProductService,
    private brandService: BrandService,
    private customerService: CustomerService,
    private excel: ExcelService,
    private pdf: PdfService,
    private cdr: ChangeDetectorRef
  ) { }

  get filteredProducts(): Product[] {
    return getProductOptions(this.products, this.filterForm.value.brandId);
  }

  ngOnInit(): void {
    this.productService.getAll().subscribe({ next: (data) => { this.products = data; this.cdr.detectChanges(); } });
    this.brandService.getAll().subscribe({ next: (data) => { this.brands = data; this.cdr.detectChanges(); } });
    this.customerService.getAll().subscribe({ next: (data) => { this.customers = data; this.cdr.detectChanges(); } });
    this.loadReport();
  }

  loadReport(): void {
    this.loading = true;
    this.reports.getSales(compactFilter(this.filterForm, this.page, this.pageSize, this.sortBy, this.sortDirection)).subscribe({
      next: (data) => { this.rows = data.items; this.totalCount = data.totalCount; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  reset(): void { this.filterForm.reset({ overdueOnly: false }); this.page = 1; this.loadReport(); }
  pageChange(page: number): void { this.page = page; this.loadReport(); }
  sortChange(sort: { sortBy: string; sortDirection: 'asc' | 'desc' }): void { this.sortBy = sort.sortBy; this.sortDirection = sort.sortDirection; this.loadReport(); }
  export(type: 'excel' | 'pdf'): void { if (this.rows.length) exportReport(this.excel, this.pdf, this.rows, this.columns, 'Serial Sales Report', 'serial-sales-report', type); }
}
