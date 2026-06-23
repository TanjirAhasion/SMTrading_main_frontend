import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SerialHistoryReport, SerialReportService } from '../../../service/reports/serial-report.service';
import { ProductSerialDto, ProductSerialService } from '../../../service/item/product-serial.service';

@Component({
  selector: 'app-serial-history-report',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './serial-history-report.html'
})
export class SerialHistoryReportComponent {
  private fb = inject(FormBuilder);
  searchForm = this.fb.group({
    serialNumber: ['', Validators.required]
  });
  report: SerialHistoryReport | null = null;
  serialLookupText = '';
  serialOptions: ProductSerialDto[] = [];
  serialLookupLoading = false;
  serialDropdownOpen = false;
  loading = false;
  searched = false;

  constructor(
    private reports: SerialReportService,
    private serialService: ProductSerialService,
    private cdr: ChangeDetectorRef
  ) {
    this.loadSerialOptions();
  }

  loadSerialOptions(term = ''): void {
    const search = term.trim();
    if (search.length > 0 && search.length < 3) {
      this.serialOptions = [];
      return;
    }

    this.serialLookupLoading = true;
    this.serialService.getSerials(1, 10, search).subscribe({
      next: (res) => {
        this.serialOptions = res.items || [];
        this.serialLookupLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.serialOptions = [];
        this.serialLookupLoading = false;
      }
    });
  }

  onSerialLookupChange(value: string): void {
    this.serialLookupText = value;
    this.serialDropdownOpen = true;
    this.searchForm.patchValue({ serialNumber: value }, { emitEvent: false });
    this.loadSerialOptions(value);
  }

  selectSerial(serial: ProductSerialDto): void {
    this.serialLookupText = serial.serialNumber;
    this.searchForm.patchValue({ serialNumber: serial.serialNumber });
    this.serialDropdownOpen = false;
    this.serialOptions = [];
  }

  openSerialDropdown(): void {
    this.serialDropdownOpen = true;
    if (this.serialOptions.length === 0 && this.serialLookupText.trim().length < 3) {
      this.loadSerialOptions();
    }
  }

  closeSerialDropdown(): void {
    setTimeout(() => {
      this.serialDropdownOpen = false;
      this.cdr.detectChanges();
    }, 150);
  }

  loadReport(): void {
    if (this.searchForm.invalid) {
      this.searchForm.markAllAsTouched();
      return;
    }

    const serialNumber = this.searchForm.value.serialNumber?.trim();
    if (!serialNumber) return;

    this.loading = true;
    this.searched = true;
    this.reports.getSerialHistory(serialNumber).subscribe({
      next: (data) => {
        this.report = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.report = null;
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getPartyLabel(item: any): string {
    if (!item) return 'Party';
    const source = this.getPartySource(item);
    if (this.hasVendor(source) || this.isPurchaseAction(source)) return 'Vendor';
    return 'Customer';
  }

  getPartyName(item: any): string {
    if (!item) return '-';
    const source = this.getPartySource(item);
    if (this.hasVendor(source) || this.isPurchaseAction(source)) {
      return source.vendorName || source.currentVendorName || source.vendorId || source.currentVendorId || '-';
    }
    return source.customerName || source.currentCustomerName || source.customerId || source.currentCustomerId || '-';
  }

  private hasVendor(item: any): boolean {
    return !!(item.vendorName || item.currentVendorName || item.vendorId || item.currentVendorId);
  }

  private isPurchaseAction(item: any): boolean {
    const action = String(item.actionTypeName || item.actionName || item.actionType || '').toLowerCase();
    return item.actionType === 3 || action.includes('purchase');
  }

  private getPartySource(item: any): any {
    if (item !== this.report?.serial || this.hasVendor(item) || item.currentCustomerName || item.currentCustomerId || item.customerName || item.customerId) {
      return item;
    }

    return [...(this.report?.timeline || [])].reverse().find((history) => this.hasVendor(history) || this.hasCustomer(history) || this.isPurchaseAction(history)) || item;
  }

  private hasCustomer(item: any): boolean {
    return !!(item.customerName || item.currentCustomerName || item.customerId || item.currentCustomerId);
  }
}
