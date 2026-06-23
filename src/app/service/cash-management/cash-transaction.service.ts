import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.prod';
import { PagedResult } from './cash-transfer.service';

export enum TransactionType {
  CashIn = 1,
  CashOut = 2
}

export enum TransactionSource {
  SalePayment = 1,
  SaleDueCollection = 2,
  PurchasePayment = 3,
  PurchaseDuePayment = 4,
  VendorPayment = 5,
  RentalIncome = 6,
  RentalSecurityDeposit = 7,
  Expense = 8,
  Salary = 9,
  ShopRent = 10,
  CashTransfer = 11,
  OpeningBalance = 12,
  Adjustment = 13,
  Other = 14
}

export interface CashTransactionDto {
  id: number;
  cashAccountId: number;
  cashAccountName?: string | null;
  amount: number;
  transactionType: TransactionType;
  sourceType: TransactionSource;
  referenceId?: number | null;
  referenceNumber?: string | null;
  transactionDate: string | Date;
  note?: string | null;
  createdBy?: string | null;
}

export interface CashFlowHistoryFilter {
  page?: number;
  pageSize?: number;
  fromDate?: string | null;
  toDate?: string | null;
  cashAccountId?: number | null;
  transactionType?: number | null;
  sourceType?: number | null;
  referenceNumber?: string | null;
  amountFrom?: number | null;
  amountTo?: number | null;
  createdBy?: string | null;
  keyword?: string | null;
  defaultToday?: boolean | null;
}

@Injectable({
  providedIn: 'root'
})
export class CashTransactionService {
  private apiUrl = `${environment.apiUrl}/cashtransaction`;
  private http = inject(HttpClient);

  getCashFlowHistory(filter: CashFlowHistoryFilter): Observable<PagedResult<CashTransactionDto>> {
    const params: Record<string, string> = {
      page: String(filter.page ?? 1),
      pageSize: String(filter.pageSize ?? 10)
    };

    if (filter.fromDate) params['fromDate'] = filter.fromDate;
    if (filter.toDate) params['toDate'] = filter.toDate;
    if (filter.cashAccountId) params['cashAccountId'] = String(filter.cashAccountId);
    if (filter.transactionType) params['transactionType'] = String(filter.transactionType);
    if (filter.sourceType) params['sourceType'] = String(filter.sourceType);
    if (filter.referenceNumber) params['referenceNumber'] = filter.referenceNumber;
    if (filter.amountFrom !== null && filter.amountFrom !== undefined) params['amountFrom'] = String(filter.amountFrom);
    if (filter.amountTo !== null && filter.amountTo !== undefined) params['amountTo'] = String(filter.amountTo);
    if (filter.createdBy) params['createdBy'] = filter.createdBy;
    if (filter.keyword) params['keyword'] = filter.keyword;
    if (filter.defaultToday !== null && filter.defaultToday !== undefined) params['defaultToday'] = String(filter.defaultToday);

    return this.http.get<PagedResult<CashTransactionDto>>(`${this.apiUrl}/CashFlowHistory`, { params });
  }
}
