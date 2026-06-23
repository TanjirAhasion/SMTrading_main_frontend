import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { environmentImageUrl } from '../../../../environments/environment';
import { createEmptyToast, ToastController, ToastState, ToastType } from '../../../service/common/toast-helper';
import { ProductSerialDto, ProductSerialService } from '../../../service/item/product-serial.service';
import {
  EnumOption,
  ProductSerialHistory,
  ProductSerialHistoryType,
  ProductSerialImageRequest,
  ProductSerialImageType,
  ProductSerialLifecycleImage,
  ProductSerialLifecycleService,
  ProductSerialLifecycleStatus,
  ProductSerialMovementSummary,
  ProductSerialTimeline,
  SerialLifecycleRequest
} from '../../../service/item/product-serial-lifecycle.service';

@Component({
  selector: 'app-product-serial-lifecycle',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-serial-lifecycle.html',
  styleUrl: './product-serial-lifecycle.css'
})
export class ProductSerialLifecycleComponent implements OnInit, OnDestroy {
  searchSerial = '';
  searchedSerial = '';
  serialOptions: ProductSerialDto[] = [];
  serialLookupLoading = false;
  serialDropdownOpen = false;
  timeline: ProductSerialTimeline | null = null;
  summary: ProductSerialMovementSummary | null = null;
  selectedHistory: ProductSerialHistory | null = null;
  historyTypes: EnumOption[] = [];
  imageTypes: EnumOption[] = [];
  loading = false;
  savingAction = false;
  savingImage = false;
  activeTab: 'timeline' | 'history' | 'images' = 'timeline';
  imageBaseUrl = environmentImageUrl.apiUrl;
  toast: ToastState = createEmptyToast();

  actionForm = this.getEmptyActionForm();
  imageForm = this.getEmptyImageForm();

  readonly lifecycleStatus = ProductSerialLifecycleStatus;
  readonly lifecycleImageType = ProductSerialImageType;
  private readonly toastController = new ToastController();

  constructor(
    private lifecycleService: ProductSerialLifecycleService,
    private serialService: ProductSerialService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadOptions();
    this.loadSerialOptions();

    const serialFromQuery = this.route.snapshot.queryParamMap.get('serial');
    if (serialFromQuery) {
      this.searchSerial = serialFromQuery;
      this.loadTimeline();
    }
  }

  ngOnDestroy(): void {
    this.toastController.destroy();
  }

  get current() {
    return this.timeline?.currentStatus ?? null;
  }

  get history(): ProductSerialHistory[] {
    return this.timeline?.history ?? [];
  }

  get images(): ProductSerialLifecycleImage[] {
    return this.timeline?.images ?? [];
  }

  get latestHistory(): ProductSerialHistory[] {
    return [...this.history].slice(-5).reverse();
  }

  get hasTimeline(): boolean {
    return !!this.timeline;
  }

  loadTimeline(): void {
    const serial = this.searchSerial.trim();
    if (!serial) {
      this.showToast('warning', 'Serial Required', 'Enter a serial number to view lifecycle.');
      return;
    }

    this.loading = true;
    this.searchedSerial = serial;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { serial },
      queryParamsHandling: 'merge'
    });

    this.lifecycleService.getSerialTimeline(serial).subscribe({
      next: (timeline) => {
        this.timeline = timeline;
        this.loadSummary(serial);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Serial timeline load failed', err);
        this.timeline = null;
        this.summary = null;
        this.loading = false;
        this.showToast('danger', 'Not Found', 'No lifecycle data found for this serial.');
      }
    });
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

  onSerialSearchChange(value: string): void {
    this.searchSerial = value;
    this.serialDropdownOpen = true;
    this.loadSerialOptions(value);
  }

  selectSerial(serial: ProductSerialDto): void {
    this.searchSerial = serial.serialNumber;
    this.serialDropdownOpen = false;
    this.serialOptions = [];
  }

  openSerialDropdown(): void {
    this.serialDropdownOpen = true;
    if (this.serialOptions.length === 0 && this.searchSerial.trim().length < 3) {
      this.loadSerialOptions();
    }
  }

  closeSerialDropdown(): void {
    setTimeout(() => {
      this.serialDropdownOpen = false;
      this.cdr.detectChanges();
    }, 150);
  }

  resetSearch(): void {
    this.searchSerial = '';
    this.searchedSerial = '';
    this.serialDropdownOpen = false;
    this.timeline = null;
    this.summary = null;
    this.selectedHistory = null;
  }

  openAction(action: SerialAction): void {
    const serialNumber = this.current?.serialNumber || this.searchSerial.trim();
    this.actionForm = {
      ...this.getEmptyActionForm(),
      action,
      serialNumber,
      actionDate: this.getTodayDate()
    };
  }

  cancelAction(): void {
    this.actionForm = this.getEmptyActionForm();
  }

  submitAction(): void {
    if (!this.actionForm.serialNumber.trim()) {
      this.showToast('warning', 'Serial Required', 'Serial number is required.');
      return;
    }

    const payload: SerialLifecycleRequest = {
      serialNumber: this.actionForm.serialNumber.trim(),
      customerId: this.toNullableNumber(this.actionForm.customerId),
      referenceNo: this.actionForm.referenceNo?.trim() || null,
      remarks: this.actionForm.remarks?.trim() || null,
      actionDate: this.actionForm.actionDate || null
    };

    const request = this.getActionRequest(payload);
    if (!request) return;

    this.savingAction = true;
    request.subscribe({
      next: () => {
        this.savingAction = false;
        this.showToast('success', 'Saved', 'Serial lifecycle action posted.');
        this.searchSerial = payload.serialNumber;
        this.cancelAction();
        this.loadTimeline();
      },
      error: (err) => {
        console.error('Serial action failed', err);
        this.savingAction = false;
        this.showToast('danger', 'Action Failed', this.getErrorMessage(err, 'Unable to post lifecycle action.'));
      }
    });
  }

  submitImage(): void {
    if (!this.imageForm.serialNumber.trim() || !this.imageForm.imageUrl.trim()) {
      this.showToast('warning', 'Validation Error', 'Serial number and image URL are required.');
      return;
    }

    const payload: ProductSerialImageRequest = {
      serialNumber: this.imageForm.serialNumber.trim(),
      imageUrl: this.imageForm.imageUrl.trim(),
      imageType: Number(this.imageForm.imageType) as ProductSerialImageType,
      notes: this.imageForm.notes?.trim() || null,
      uploadedBy: this.imageForm.uploadedBy?.trim() || null,
      uploadedAt: this.imageForm.uploadedAt || null
    };

    this.savingImage = true;
    this.lifecycleService.addSerialImage(payload).subscribe({
      next: () => {
        this.savingImage = false;
        this.showToast('success', 'Image Added', 'Serial lifecycle image added.');
        this.searchSerial = payload.serialNumber;
        this.imageForm = this.getEmptyImageForm(payload.serialNumber);
        this.loadTimeline();
      },
      error: (err) => {
        console.error('Serial image failed', err);
        this.savingImage = false;
        this.showToast('danger', 'Image Failed', this.getErrorMessage(err, 'Unable to add serial image.'));
      }
    });
  }

  prepareImageForm(): void {
    this.imageForm = this.getEmptyImageForm(this.current?.serialNumber || this.searchSerial.trim());
  }

  selectHistory(item: ProductSerialHistory): void {
    this.selectedHistory = item;
  }

  closeHistoryDetail(): void {
    this.selectedHistory = null;
  }

  formatActionName(value: string | null | undefined): string {
    if (!value) return '-';
    return value.replace(/([a-z])([A-Z])/g, '$1 $2');
  }

  formatStatus(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'number') {
      return ProductSerialLifecycleStatus[value]?.replace(/([a-z])([A-Z])/g, '$1 $2') ?? String(value);
    }
    return value.replace(/([a-z])([A-Z])/g, '$1 $2');
  }

  getStatusBadge(status: string | number | null | undefined): string {
    const statusName = typeof status === 'number'
      ? ProductSerialLifecycleStatus[status]
      : status;

    switch (statusName) {
      case 'InStock': return 'badge-success';
      case 'InRent': return 'badge-warning text-white';
      case 'Sold': return 'badge-secondary';
      case 'InService': return 'badge-info';
      case 'Damaged':
      case 'Lost':
      case 'Scrapped':
        return 'badge-danger';
      default:
        return 'badge-light border';
    }
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

  hasParty(item: any): boolean {
    return this.getPartyName(item) !== '-';
  }

  getPartyTransition(item: ProductSerialHistory | null): string {
    if (!item) return '-';
    if (this.hasVendor(item) || this.isPurchaseAction(item)) {
      return `${item.oldVendorId || '-'} to ${item.newVendorId || item.vendorName || item.vendorId || '-'}`;
    }
    return `${item.oldCustomerId || '-'} to ${item.newCustomerId || item.customerName || item.customerId || '-'}`;
  }

  getActionIcon(action: string | null | undefined): string {
    switch (action) {
      case 'Purchase':
      case 'OpeningStock':
      case 'Created':
        return 'fa-plus-circle text-success';
      case 'Sale':
      case 'RentalOut':
      case 'TransferOut':
      case 'AdjustmentOut':
        return 'fa-arrow-up text-danger';
      case 'SaleReturn':
      case 'RentalReturn':
      case 'TransferIn':
      case 'AdjustmentIn':
      case 'RepairCompleted':
        return 'fa-arrow-down text-success';
      case 'ImageAdded':
      case 'ImageUpdated':
      case 'ImageRemoved':
        return 'fa-camera text-info';
      case 'RepairStarted':
        return 'fa-tools text-info';
      case 'Damaged':
      case 'Lost':
      case 'Scrapped':
        return 'fa-exclamation-triangle text-danger';
      default:
        return 'fa-circle text-muted';
    }
  }

  getImageUrl(imageUrl: string | null | undefined): string {
    if (!imageUrl) return '';
    if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
    return `${this.imageBaseUrl}${imageUrl}`;
  }

  showToast(type: ToastType, title: string, message: string): void {
    this.toastController.show(type, title, message, (toast) => this.toast = toast, () => this.closeToast());
  }

  closeToast(): void {
    this.toastController.close((toast) => this.toast = toast);
  }

  private loadOptions(): void {
    this.lifecycleService.getHistoryTypes().subscribe({ next: (data) => this.historyTypes = data, error: () => undefined });
    this.lifecycleService.getImageTypes().subscribe({ next: (data) => this.imageTypes = data, error: () => undefined });
  }

  private loadSummary(serial: string): void {
    this.lifecycleService.getSerialMovementSummary(serial).subscribe({
      next: (summary) => {
        this.summary = summary;
        this.cdr.detectChanges();
      },
      error: () => this.summary = null
    });
  }

  private getActionRequest(payload: SerialLifecycleRequest) {
    switch (this.actionForm.action) {
      case 'sale': return this.lifecycleService.sellSerial(payload);
      case 'saleReturn': return this.lifecycleService.returnSoldSerial(payload);
      case 'rentalOut': return this.lifecycleService.rentOutSerial(payload);
      case 'rentalReturn': return this.lifecycleService.returnRentalSerial(payload);
      case 'damaged': return this.lifecycleService.markDamaged(payload);
      case 'repairStart': return this.lifecycleService.startRepair(payload);
      case 'repairComplete': return this.lifecycleService.completeRepair(payload);
      case 'lost': return this.lifecycleService.markLost(payload);
      case 'scrapped': return this.lifecycleService.markScrapped(payload);
      default:
        this.showToast('warning', 'Action Required', 'Select a lifecycle action.');
        return null;
    }
  }

  private getEmptyActionForm(): SerialActionForm {
    return {
      action: '',
      serialNumber: '',
      customerId: null,
      referenceNo: '',
      remarks: '',
      actionDate: this.getTodayDate()
    };
  }

  getEmptyImageForm(serialNumber = ''): SerialImageForm {
    return {
      serialNumber,
      imageUrl: '',
      imageType: ProductSerialImageType.Other,
      notes: '',
      uploadedBy: '',
      uploadedAt: this.getTodayDate()
    };
  }

  private toNullableNumber(value: number | string | null | undefined): number | null {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
  }

  private getTodayDate(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private getErrorMessage(err: any, fallback: string): string {
    return typeof err?.error === 'string'
      ? err.error
      : err?.error?.message || fallback;
  }

  private hasVendor(item: any): boolean {
    return !!(item.vendorName || item.currentVendorName || item.vendorId || item.currentVendorId || item.oldVendorId || item.newVendorId);
  }

  private isPurchaseAction(item: any): boolean {
    const actionName = String(item.actionTypeName || item.actionName || '').toLowerCase();
    return item.actionType === ProductSerialHistoryType.Purchase || actionName.includes('purchase');
  }

  private getPartySource(item: any): any {
    if (item !== this.current || this.hasVendor(item) || item.currentCustomerName || item.currentCustomerId) {
      return item;
    }

    return [...this.history].reverse().find((history) => this.hasVendor(history) || this.hasCustomer(history) || this.isPurchaseAction(history)) || item;
  }

  private hasCustomer(item: any): boolean {
    return !!(item.customerName || item.currentCustomerName || item.customerId || item.currentCustomerId || item.oldCustomerId || item.newCustomerId);
  }
}

type SerialAction = '' | 'sale' | 'saleReturn' | 'rentalOut' | 'rentalReturn' | 'damaged' | 'repairStart' | 'repairComplete' | 'lost' | 'scrapped';

interface SerialActionForm {
  action: SerialAction;
  serialNumber: string;
  customerId: number | string | null;
  referenceNo: string;
  remarks: string;
  actionDate: string;
}

interface SerialImageForm {
  serialNumber: string;
  imageUrl: string;
  imageType: ProductSerialImageType;
  notes: string;
  uploadedBy: string;
  uploadedAt: string;
}
