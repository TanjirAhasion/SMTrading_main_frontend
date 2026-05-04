import { inject, Injectable } from "@angular/core";
import { environment } from "../../../environments/environment";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface CreatePurchaseItemRequest {
  productId: number;
  quantity: number;
  unitCost: number;
  discount: number;
  productSerialNumber: string[]; // Note: Backend generates these, but DTO includes it
}

export interface CreatePurchaseRequest {
  vendorId: number;
  totalAmount: number;
  subTotal: number;
  discount: number;
  paidAmount: number;
  paymentMethod: string; // 'Cash' or 'Bank'
  items: CreatePurchaseItemRequest[];
}

@Injectable({ providedIn: 'root' })
export class PurchaseService {
  private apiUrl = `${environment.apiUrl}/purchase`;
  private http = inject(HttpClient);

  createPurchase(data: CreatePurchaseRequest) {
    return this.http.post<number>(this.apiUrl, data);
  }
}