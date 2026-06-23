import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.prod';

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CashTransferDto {
  id: number;
  fromCashAccountId: number;
  fromCashAccountName?: string | null;
  toCashAccountId: number;
  toCashAccountName?: string | null;
  amount: number;
  transferDate: string | Date;
  note?: string | null;
}

export interface CashTransferFilter {
  page?: number;
  pageSize?: number;
  search?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  cashAccountId?: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class CashTransferService {
  private apiUrl = `${environment.apiUrl}/cashtransfer`;
  private http = inject(HttpClient);

  getAll(): Observable<CashTransferDto[]> {
    return this.http.get<CashTransferDto[]>(this.apiUrl);
  }

  getPaged(filter: CashTransferFilter): Observable<PagedResult<CashTransferDto>> {
    const params: Record<string, string> = {
      page: String(filter.page ?? 1),
      pageSize: String(filter.pageSize ?? 10)
    };

    if (filter.search) params['search'] = filter.search;
    if (filter.fromDate) params['fromDate'] = filter.fromDate;
    if (filter.toDate) params['toDate'] = filter.toDate;
    if (filter.cashAccountId) params['cashAccountId'] = String(filter.cashAccountId);

    return this.http.get<PagedResult<CashTransferDto>>(`${this.apiUrl}/GetAllBySearchWithPagination`, { params });
  }

  create(data: Partial<CashTransferDto>): Observable<CashTransferDto> {
    return this.http.post<CashTransferDto>(this.apiUrl, data);
  }
}
