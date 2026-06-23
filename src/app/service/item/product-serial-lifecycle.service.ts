import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export enum ProductSerialLifecycleStatus {
  InStock = 1,
  Sold = 2,
  InRent = 3,
  InService = 4,
  Damaged = 5,
  Lost = 6,
  Scrapped = 7
}

export enum ProductSerialHistoryType {
  Created = 1,
  OpeningStock = 2,
  Purchase = 3,
  Sale = 4,
  SaleReturn = 5,
  RentalOut = 6,
  RentalReturn = 7,
  TransferOut = 8,
  TransferIn = 9,
  AdjustmentIn = 10,
  AdjustmentOut = 11,
  RepairStarted = 12,
  RepairCompleted = 13,
  Damaged = 14,
  Lost = 15,
  Scrapped = 16,
  ImageAdded = 17,
  ImageUpdated = 18,
  ImageRemoved = 19,
  StatusChanged = 20,
  CustomerChanged = 21,
  BranchChanged = 22
}

export enum ProductSerialImageType {
  Purchase = 1,
  OpeningStock = 2,
  RentalOut = 3,
  RentalReturn = 4,
  Sale = 5,
  Damage = 6,
  Repair = 7,
  Transfer = 8,
  Other = 9
}

export interface SerialLifecycleRequest {
  serialNumber: string;
  productId?: number | null;
  purchaseId?: number | null;
  purchaseItemId?: number | null;
  saleInvoiceId?: number | null;
  saleInvoiceItemId?: number | null;
  rentalContractId?: number | null;
  rentalInvoiceId?: number | null;
  stockAdjustmentId?: number | null;
  customerId?: number | null;
  vendorId?: number | null;
  referenceNo?: string | null;
  remarks?: string | null;
  actionDate?: string | null;
  purchaseCost?: number;
  sellingCost?: number;
  rentalCost?: number;
}

export interface ProductSerialImageRequest {
  serialNumber: string;
  imageUrl: string;
  imageType: ProductSerialImageType;
  notes?: string | null;
  uploadedBy?: string | null;
  uploadedAt?: string | null;
}

export interface UpdateProductSerialImageRequest {
  id: string;
  imageUrl?: string | null;
  imageType?: ProductSerialImageType | null;
  notes?: string | null;
  uploadedBy?: string | null;
}

export interface ProductSerialCurrentState {
  id: number;
  serialNumber: string;
  productId: number;
  productName: string;
  status: ProductSerialLifecycleStatus;
  statusName: string;
  currentCustomerId?: number | null;
  currentCustomerName?: string | null;
  currentVendorId?: number | null;
  currentVendorName?: string | null;
  currentRentalContractId?: number | null;
  saleInvoiceId?: number | null;
  isAvailable: boolean;
  imageUrl?: string | null;
  createdAt: string;
}

export interface ProductSerialHistory {
  id: string;
  productSerialId: number;
  serialNumber: string;
  actionType: ProductSerialHistoryType;
  actionTypeName: string;
  actionDate: string;
  purchaseId?: number | null;
  purchaseItemId?: number | null;
  saleInvoiceId?: number | null;
  saleInvoiceItemId?: number | null;
  rentalContractId?: number | null;
  rentalInvoiceId?: number | null;
  stockAdjustmentId?: number | null;
  customerId?: number | null;
  customerName?: string | null;
  vendorId?: number | null;
  vendorName?: string | null;
  oldStatus?: ProductSerialLifecycleStatus | null;
  newStatus?: ProductSerialLifecycleStatus | null;
  oldCustomerId?: number | null;
  newCustomerId?: number | null;
  oldVendorId?: number | null;
  newVendorId?: number | null;
  referenceNo?: string | null;
  remarks?: string | null;
  createdBy?: string | null;
  createdAt: string;
}

export interface ProductSerialLifecycleImage {
  id: string;
  productSerialId: number;
  serialNumber: string;
  imageUrl: string;
  imageType: ProductSerialImageType;
  imageTypeName: string;
  notes?: string | null;
  uploadedBy?: string | null;
  uploadedAt: string;
}

export interface ProductSerialMovementCount {
  actionType: ProductSerialHistoryType;
  actionTypeName: string;
  count: number;
}

export interface ProductSerialMovementSummary {
  serialNumber: string;
  currentStatus: ProductSerialLifecycleStatus;
  currentStatusName: string;
  currentCustomerId?: number | null;
  currentCustomerName?: string | null;
  currentVendorId?: number | null;
  currentVendorName?: string | null;
  totalEvents: number;
  firstActionDate?: string | null;
  lastActionDate?: string | null;
  actionCounts: ProductSerialMovementCount[];
}

export interface ProductSerialTimeline {
  currentStatus: ProductSerialCurrentState;
  history: ProductSerialHistory[];
  images: ProductSerialLifecycleImage[];
}

export interface EnumOption {
  id: number;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProductSerialLifecycleService {
  private readonly apiUrl = `${environment.apiUrl}/product-serial-lifecycle`;
  private readonly http = inject(HttpClient);

  addOpeningStockSerial(data: SerialLifecycleRequest): Observable<string> {
    return this.http.post<string>(`${this.apiUrl}/opening-stock`, data);
  }

  receivePurchaseSerial(data: SerialLifecycleRequest): Observable<string> {
    return this.http.post<string>(`${this.apiUrl}/purchase`, data);
  }

  sellSerial(data: SerialLifecycleRequest): Observable<string> {
    return this.http.post<string>(`${this.apiUrl}/sale`, data);
  }

  returnSoldSerial(data: SerialLifecycleRequest): Observable<string> {
    return this.http.post<string>(`${this.apiUrl}/sale-return`, data);
  }

  rentOutSerial(data: SerialLifecycleRequest): Observable<string> {
    return this.http.post<string>(`${this.apiUrl}/rental-out`, data);
  }

  returnRentalSerial(data: SerialLifecycleRequest): Observable<string> {
    return this.http.post<string>(`${this.apiUrl}/rental-return`, data);
  }

  markDamaged(data: SerialLifecycleRequest): Observable<string> {
    return this.http.post<string>(`${this.apiUrl}/damaged`, data);
  }

  startRepair(data: SerialLifecycleRequest): Observable<string> {
    return this.http.post<string>(`${this.apiUrl}/repair/start`, data);
  }

  completeRepair(data: SerialLifecycleRequest): Observable<string> {
    return this.http.post<string>(`${this.apiUrl}/repair/complete`, data);
  }

  markLost(data: SerialLifecycleRequest): Observable<string> {
    return this.http.post<string>(`${this.apiUrl}/lost`, data);
  }

  markScrapped(data: SerialLifecycleRequest): Observable<string> {
    return this.http.post<string>(`${this.apiUrl}/scrapped`, data);
  }

  addSerialImage(data: ProductSerialImageRequest): Observable<string> {
    return this.http.post<string>(`${this.apiUrl}/images`, data);
  }

  updateSerialImage(id: string, data: UpdateProductSerialImageRequest): Observable<string> {
    return this.http.put<string>(`${this.apiUrl}/images/${id}`, data);
  }

  deleteSerialImage(id: string, remarks?: string): Observable<string> {
    const query = remarks ? `?remarks=${encodeURIComponent(remarks)}` : '';
    return this.http.delete<string>(`${this.apiUrl}/images/${id}${query}`);
  }

  getSerialTimeline(serialNumber: string): Observable<ProductSerialTimeline> {
    return this.http.get<ProductSerialTimeline>(`${this.apiUrl}/${encodeURIComponent(serialNumber)}/timeline`);
  }

  getSerialCurrentStatus(serialNumber: string): Observable<ProductSerialCurrentState> {
    return this.http.get<ProductSerialCurrentState>(`${this.apiUrl}/${encodeURIComponent(serialNumber)}/status`);
  }

  getSerialCurrentCustomer(serialNumber: string): Observable<number | null> {
    return this.http.get<number | null>(`${this.apiUrl}/${encodeURIComponent(serialNumber)}/customer`);
  }

  getSerialHistory(serialNumber: string): Observable<ProductSerialHistory[]> {
    return this.http.get<ProductSerialHistory[]>(`${this.apiUrl}/${encodeURIComponent(serialNumber)}/history`);
  }

  getSerialImages(serialNumber: string): Observable<ProductSerialLifecycleImage[]> {
    return this.http.get<ProductSerialLifecycleImage[]>(`${this.apiUrl}/${encodeURIComponent(serialNumber)}/images`);
  }

  getSerialMovementSummary(serialNumber: string): Observable<ProductSerialMovementSummary> {
    return this.http.get<ProductSerialMovementSummary>(`${this.apiUrl}/${encodeURIComponent(serialNumber)}/movement-summary`);
  }

  getHistoryTypes(): Observable<EnumOption[]> {
    return this.http.get<EnumOption[]>(`${this.apiUrl}/history-types`);
  }

  getImageTypes(): Observable<EnumOption[]> {
    return this.http.get<EnumOption[]>(`${this.apiUrl}/image-types`);
  }
}
