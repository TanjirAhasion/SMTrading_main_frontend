import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.prod';

export enum CashAdjustmentType {
  CashIn = 1,
  CashOut = 2
}

export interface CashAdjustmentDto {
  id: number;
  transactionDate: string | Date;
  cashAccountId: number;
  cashAccountName?: string | null;
  transactionType: CashAdjustmentType;
  amount: number;
  reason: string;
  referenceNo?: string | null;
  note?: string | null;
}

export interface CashAdjustmentFilter {
  fromDate?: string | null;
  toDate?: string | null;
  cashAccountId?: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class CashAdjustmentService {
  private apiUrl = `${environment.apiUrl}/cashadjustment`;
  private http = inject(HttpClient);

  getAll(filter: CashAdjustmentFilter = {}): Observable<CashAdjustmentDto[]> {
    const params: Record<string, string> = {};

    if (filter.fromDate) params['fromDate'] = filter.fromDate;
    if (filter.toDate) params['toDate'] = filter.toDate;
    if (filter.cashAccountId) params['cashAccountId'] = String(filter.cashAccountId);

    return this.http.get<CashAdjustmentDto[]>(this.apiUrl, { params });
  }

  getById(id: number): Observable<CashAdjustmentDto> {
    return this.http.get<CashAdjustmentDto>(`${this.apiUrl}/${id}`);
  }

  create(data: Partial<CashAdjustmentDto>): Observable<CashAdjustmentDto> {
    return this.http.post<CashAdjustmentDto>(this.apiUrl, data);
  }
}
