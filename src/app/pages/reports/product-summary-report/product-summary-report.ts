import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Brand, BrandService } from '../../../service/item/brand.service';
import { ProductService } from '../../../service/item/product.service';
import { ExcelService } from '../../../service/common/excel.service';
import { PdfService } from '../../../service/common/pdf.service';
import { ProductSummaryReportRow, SerialReportService } from '../../../service/reports/serial-report.service';
import { ReportTableColumn, ReportTableComponent } from '../report-table/report-table';
import { compactFilter, createReportFilterForm, exportReport } from '../report-shared';

@Component({
  selector: 'app-product-summary-report',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ReportTableComponent],
  templateUrl: './product-summary-report.html'
})
export class ProductSummaryReportComponent implements OnInit {
  private fb = inject(FormBuilder);
  filterForm = createReportFilterForm(this.fb);
  brands: Brand[] = [];
  rows: ProductSummaryReportRow[] = [];
  totalCount = 0;
  page = 1;
  pageSize = 20;
  sortBy = 'productName';
  sortDirection: 'asc' | 'desc' = 'asc';
  loading = false;
  columns: ReportTableColumn[] = [
    { key: 'productName', label: 'Product', sortable: true },
    { key: 'brandName', label: 'Brand' },
    { key: 'totalSerials', label: 'Total', align: 'right' },
    { key: 'available', label: 'Available', align: 'right' },
    { key: 'rented', label: 'Rented', align: 'right' },
    { key: 'sold', label: 'Sold', align: 'right' },
    { key: 'repair', label: 'Repair', align: 'right' },
    { key: 'lost', label: 'Lost', align: 'right' },
    { key: 'scrapped', label: 'Scrapped', align: 'right' }
  ];

  constructor(private reports: SerialReportService, private brandsService: BrandService, private excel: ExcelService, private pdf: PdfService, private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.brandsService.getAll().subscribe({ next: (data) => { this.brands = data; this.cdr.detectChanges(); } });
    this.loadReport();
  }

  loadReport(): void {
    this.loading = true;
    this.reports.getProductSummary(compactFilter(this.filterForm, this.page, this.pageSize, this.sortBy, this.sortDirection)).subscribe({
      next: (data) => { this.rows = data.items; this.totalCount = data.totalCount; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  reset(): void { this.filterForm.reset({ overdueOnly: false }); this.page = 1; this.loadReport(); }
  pageChange(page: number): void { this.page = page; this.loadReport(); }
  sortChange(sort: any): void { this.sortBy = sort.sortBy; this.sortDirection = sort.sortDirection; this.loadReport(); }
  export(type: 'excel' | 'pdf'): void { exportReport(this.excel, this.pdf, this.rows, this.columns, 'Product Summary Report', 'product-summary-report', type); }
}
