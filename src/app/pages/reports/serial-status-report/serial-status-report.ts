import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Brand, BrandService } from '../../../service/item/brand.service';
import { Product, ProductService } from '../../../service/item/product.service';
import { ReportEnumOption, SerialReportService, SerialStatusReport } from '../../../service/reports/serial-report.service';
import { createReportFilterForm } from '../report-shared';

@Component({
  selector: 'app-serial-status-report',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './serial-status-report.html'
})
export class SerialStatusReportComponent implements OnInit {
  private fb = inject(FormBuilder);
  filterForm = createReportFilterForm(this.fb);
  products: Product[] = [];
  brands: Brand[] = [];
  statuses: ReportEnumOption[] = [];
  report: SerialStatusReport | null = null;
  loading = false;

  constructor(
    private reportService: SerialReportService,
    private productService: ProductService,
    private brandService: BrandService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadOptions();
    this.loadReport();
  }

  loadReport(): void {
    this.loading = true;
    this.reportService.getSerialStatus(this.filterForm.value).subscribe({
      next: (data) => {
        this.report = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  reset(): void {
    this.filterForm.reset({ overdueOnly: false });
    this.loadReport();
  }

  private loadOptions(): void {
    this.productService.getAll().subscribe({ next: (data) => { this.products = data; this.cdr.detectChanges(); } });
    this.brandService.getAll().subscribe({ next: (data) => { this.brands = data; this.cdr.detectChanges(); } });
    this.reportService.getSerialStatuses().subscribe({ next: (data) => { this.statuses = data; this.cdr.detectChanges(); } });
  }
}
