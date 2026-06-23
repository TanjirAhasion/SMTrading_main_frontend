import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SerialReportFilter {
  productId?: number | null;
  brandId?: number | null;
  customerId?: number | null;
  status?: number | null;
  fromDate?: string | null;
  toDate?: string | null;
  overdueOnly?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string | null;
  sortDirection?: 'asc' | 'desc' | string | null;
}

export interface ReportPage<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface SerialStatusReport {
  totalSerials: number;
  availableCount: number;
  rentedCount: number;
  soldCount: number;
  repairCount: number;
  damagedCount: number;
  lostCount: number;
  scrappedCount: number;
}

export interface SerialHistoryReport {
  serial: any;
  timeline: SerialHistoryRow[];
  images: SerialReportImage[];
}

export interface SerialHistoryRow {
  date: string;
  actionType: number;
  actionTypeName: string;
  referenceNo?: string | null;
  customerId?: number | null;
  customerName?: string | null;
  vendorId?: number | null;
  vendorName?: string | null;
  remarks?: string | null;
}

export interface SerialReportImage {
  id: string;
  imageUrl: string;
  imageTypeName: string;
  notes?: string | null;
  uploadedAt: string;
}

export interface ProductSummaryReportRow {
  productId: number;
  productName: string;
  brandName: string;
  totalSerials: number;
  available: number;
  rented: number;
  sold: number;
  repair: number;
  damaged: number;
  lost: number;
  scrapped: number;
}

export interface RentalActiveReportRow {
  serialNumber: string;
  productId: number;
  product: string;
  customerId?: number | null;
  customer?: string | null;
  rentalContractId?: number | null;
  rentalStartDate?: string | null;
  expectedReturnDate?: string | null;
  status: string;
  isOverdue: boolean;
}

export interface RentalHistoryReportRow {
  serialNumber: string;
  customerId?: number | null;
  customer?: string | null;
  rentalOutDate: string;
  rentalReturnDate?: string | null;
  totalDays?: number | null;
  status: string;
}

export interface SerialSalesReportRow {
  serialNumber: string;
  productId: number;
  product: string;
  customerId?: number | null;
  customer?: string | null;
  invoiceNo?: string | null;
  saleDate: string;
  amount: number;
}

export interface SerialMaintenanceReportRow {
  serialNumber: string;
  productId: number;
  product: string;
  issueType: string;
  dateReported: string;
  currentStatus: string;
  remarks?: string | null;
}

export interface ReportEnumOption {
  id: number;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class SerialReportService {
  private readonly apiUrl = `${environment.apiUrl}/reports`;
  private readonly http = inject(HttpClient);

  getSerialStatus(filter: SerialReportFilter = {}): Observable<SerialStatusReport> {
    return this.http.get<SerialStatusReport>(`${this.apiUrl}/serial-status`, { params: this.toParams(filter) });
  }

  getSerialHistory(serialNumber: string): Observable<SerialHistoryReport> {
    return this.http.get<SerialHistoryReport>(`${this.apiUrl}/serial-history/${encodeURIComponent(serialNumber)}`);
  }

  getProductSummary(filter: SerialReportFilter = {}): Observable<ReportPage<ProductSummaryReportRow>> {
    return this.http.get<ReportPage<ProductSummaryReportRow>>(`${this.apiUrl}/product-summary`, { params: this.toParams(filter) });
  }

  getRentalActive(filter: SerialReportFilter = {}): Observable<ReportPage<RentalActiveReportRow>> {
    return this.http.get<ReportPage<RentalActiveReportRow>>(`${this.apiUrl}/rental-active`, { params: this.toParams(filter) });
  }

  getRentalHistory(filter: SerialReportFilter = {}): Observable<ReportPage<RentalHistoryReportRow>> {
    return this.http.get<ReportPage<RentalHistoryReportRow>>(`${this.apiUrl}/rental-history`, { params: this.toParams(filter) });
  }

  getSales(filter: SerialReportFilter = {}): Observable<ReportPage<SerialSalesReportRow>> {
    return this.http.get<ReportPage<SerialSalesReportRow>>(`${this.apiUrl}/sales`, { params: this.toParams(filter) });
  }

  getMaintenance(filter: SerialReportFilter = {}): Observable<ReportPage<SerialMaintenanceReportRow>> {
    return this.http.get<ReportPage<SerialMaintenanceReportRow>>(`${this.apiUrl}/maintenance`, { params: this.toParams(filter) });
  }

  getSerialStatuses(): Observable<ReportEnumOption[]> {
    return this.http.get<ReportEnumOption[]>(`${this.apiUrl}/serial-statuses`);
  }

  private toParams(filter: SerialReportFilter): HttpParams {
    let params = new HttpParams();
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return params;
  }
}
