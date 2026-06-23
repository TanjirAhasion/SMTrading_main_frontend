import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SerialReportService, SerialStatusReport } from '../../../service/reports/serial-report.service';

@Component({
  selector: 'app-report-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './report-dashboard.html',
  styleUrl: './report-dashboard.css'
})
export class ReportDashboardComponent implements OnInit {
  loading = false;
  status: SerialStatusReport | null = null;

  constructor(
    private reportService: SerialReportService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loading = true;
    this.reportService.getSerialStatus().subscribe({
      next: (data) => {
        this.status = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
}
