import { inject, Injectable } from "@angular/core";
import { environment } from "../../../environments/environment";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface SaleItemRequest {
  productId: number;
  productName: string; // For display purposes, not sent to backend
  brand?: string; // Optional, for display only
  model?: string; // Optional, for display only
  quantity: number;
  unitPrice: number;
  discount: number;
  serialNumbers: string[]; // Note: Backend generates these, but DTO includes it
}

export interface CreateInvoiceRequest {
  customerId: number;
  totalAmount: number;
  subTotal: number;
  discount: number;
  paidAmount: number;
  salesInvoiceDate: string;
  cashAccountId: number;
  paymentMethod: string; // 'Cash' or 'Bank'
  items: SaleItemRequest[];
}

@Injectable({ providedIn: 'root' })

export class InvoiceService {
  private apiUrl = `${environment.apiUrl}/sales`;
  private http = inject(HttpClient);

  createInvoice(data: CreateInvoiceRequest) {
    return this.http.post<number>(this.apiUrl, data);
  }
}
