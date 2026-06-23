import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface ReportTableColumn {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  type?: 'text' | 'date' | 'number' | 'status' | 'boolean';
  sortable?: boolean;
}

@Component({
  selector: 'app-report-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './report-table.html'
})
export class ReportTableComponent {
  @Input() columns: ReportTableColumn[] = [];
  @Input() rows: any[] = [];
  @Input() loading = false;
  @Input() page = 1;
  @Input() pageSize = 20;
  @Input() totalCount = 0;
  @Input() sortBy = '';
  @Input() sortDirection: 'asc' | 'desc' = 'asc';
  @Input() rowClass: (row: any) => string = () => '';
  @Output() pageChange = new EventEmitter<number>();
  @Output() sortChange = new EventEmitter<{ sortBy: string; sortDirection: 'asc' | 'desc' }>();

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  get pageStart(): number {
    return this.totalCount === 0 ? 0 : ((Math.min(this.page, this.totalPages) - 1) * this.pageSize) + 1;
  }

  get pageEnd(): number {
    return Math.min(Math.min(this.page, this.totalPages) * this.pageSize, this.totalCount);
  }

  getCell(row: any, key: string): any {
    return key.split('.').reduce((value, part) => value?.[part], row);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.pageChange.emit(page);
  }

  sort(column: ReportTableColumn): void {
    if (!column.sortable) return;
    const direction = this.sortBy === column.key && this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.sortChange.emit({ sortBy: column.key, sortDirection: direction });
  }

  statusClass(value: any): string {
    const text = String(value || '').toLowerCase();
    if (text.includes('stock') || text.includes('available') || text.includes('returned')) return 'badge-success';
    if (text.includes('rent')) return 'badge-info';
    if (text.includes('sold')) return 'badge-secondary';
    if (text.includes('repair') || text.includes('service')) return 'badge-warning text-white';
    if (text.includes('damage')) return 'badge-danger';
    if (text.includes('lost') || text.includes('scrap') || text.includes('overdue')) return 'badge-dark';
    return 'badge-light border';
  }
}
