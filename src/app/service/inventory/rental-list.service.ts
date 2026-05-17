import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface RentalContractInvoiceItemDto {
  id: number;
  productName: string;
  model: string;
  brandName: string;
  quantity: number;
  serialNumbers: string[];
  unitRent: number;
  totalRent: number;
}

export interface RentalContractInvoiceDto {
  id: string | number;
  contractNumber: string;
  startDate: Date | string;
  endDate?: Date | string | null; // Mapped from DateTime?
  securityDeposit: number;
  billingCycle: number;
  note?: string | null;           // Mapped from string?
  customerFullName: string;
  companyName: string;
  status: number;                 // You could also create a RentalStatusEnum here
  nextBillingDate: Date | string;
  paymentMethod: number;
  // Note: Usually, the header contains the items list, 
  // added here for consistency with your previous models:
  invoiceItems?: RentalContractInvoiceItemDto[]; 
}

export interface RentalItem {
  id: string | number;
  contractNumber: string;
  rentalNumber?: string;
  startDate: Date | string;
  endDate?: Date | string | null;
  customerId: number;
  firstName: string;
  lastName: string;
  companyName: string;
  billingCycle: number;
  paymentMethod: string | number;
  securityDeposit: number;
  totalRent: number;
  totalAmount?: number;
  status: string | number;
  isActive: boolean;
  note?: string | null;
  nextBillingDate?: Date | string;
  customerFullName?: string;
  invoiceItems?: RentalContractInvoiceItemDto[];
}

export interface SearchRentalDto {
  searchText?: string;
  startDate?: string;
  endDate?: string;
  companyName?: string;
  customerId?: string;
  status?: string;
  pageNumber: number;
  pageSize: number;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
}

@Injectable({ providedIn: 'root' })
export class RentalListService {
  private apiUrl = `${environment.apiUrl}/rentalContract`;
  private http = inject(HttpClient);

  GetAllBySearchWithPagination(searchDto: SearchRentalDto): Observable<PagedResult<RentalItem>> {
    let params = new HttpParams();

    if (searchDto.searchText) {
      params = params.set('searchText', searchDto.searchText);
    }
    if (searchDto.startDate) {
      params = params.set('startDate', searchDto.startDate);
    }
    if (searchDto.endDate) {
      params = params.set('endDate', searchDto.endDate);
    }
    if (searchDto.companyName) {
      params = params.set('companyName', searchDto.companyName);
    }
    if (searchDto.customerId) {
      params = params.set('customerId', searchDto.customerId);
    }
    if (searchDto.status) {
      params = params.set('status', searchDto.status);
    }

    params = params.set('pageNumber', searchDto.pageNumber.toString());
    params = params.set('pageSize', searchDto.pageSize.toString());

    return this.http.get<PagedResult<RentalItem>>(
      `${this.apiUrl}/GetAllBySearchWithPagination`,
      { params }
    );
  }

      getById(id: string | number): Observable<RentalContractInvoiceDto> {
          return this.http.get<RentalContractInvoiceDto>(`${this.apiUrl}/${id}`);
      }
}
