import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Customer, CustomerService } from '../../../service/contacts/customer.service';
import { ExcelService } from '../../../service/common/excel.service';
import { PdfService } from '../../../service/common/pdf.service';
import { RentalHistoryReportRow, SerialReportService } from '../../../service/reports/serial-report.service';
import { compactFilter, createReportFilterForm, exportReport } from '../report-shared';
import { ReportTableColumn, ReportTableComponent } from '../report-table/report-table';

@Component({
  selector: 'app-rental-history-report',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ReportTableComponent],
  templateUrl: './rental-history-report.html'
})
export class RentalHistoryReportComponent implements OnInit {
  private fb = inject(FormBuilder);
  filterForm = createReportFilterForm(this.fb);
  customers: Customer[] = [];
  rows: RentalHistoryReportRow[] = [];
  totalCount = 0;
  page = 1;
  pageSize = 20;
  sortBy = 'rentalOutDate';
  sortDirection: 'asc' | 'desc' = 'desc';
  loading = false;
  columns: ReportTableColumn[] = [
    { key: 'serialNumber', label: 'Serial', sortable: true },
    { key: 'customer', label: 'Customer' },
    { key: 'rentalOutDate', label: 'Rental Out', type: 'date', sortable: true },
    { key: 'rentalReturnDate', label: 'Rental Return', type: 'date', sortable: true },
    { key: 'totalDays', label: 'Days', align: 'right' },
    { key: 'status', label: 'Status', type: 'status' }
  ];

  constructor(private reports: SerialReportService, private customersService: CustomerService, private excel: ExcelService, private pdf: PdfService, private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.customersService.getAll().subscribe({ next: (data) => { this.customers = data; this.cdr.detectChanges(); } });
    this.loadReport();
  }

  loadReport(): void {
    this.loading = true;
    this.reports.getRentalHistory(compactFilter(this.filterForm, this.page, this.pageSize, this.sortBy, this.sortDirection)).subscribe({
      next: (data) => { this.rows = data.items; this.totalCount = data.totalCount; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  reset(): void { this.filterForm.reset({ overdueOnly: false }); this.page = 1; this.loadReport(); }
  pageChange(page: number): void { this.page = page; this.loadReport(); }
  sortChange(sort: { sortBy: string; sortDirection: 'asc' | 'desc' }): void { this.sortBy = sort.sortBy; this.sortDirection = sort.sortDirection; this.loadReport(); }
  export(type: 'excel' | 'pdf'): void { if (this.rows.length) exportReport(this.excel, this.pdf, this.rows, this.columns, 'Rental History Report', 'rental-history-report', type); }
}
