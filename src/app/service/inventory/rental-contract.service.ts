import { inject, Injectable } from "@angular/core";
import { environment } from "../../../environments/environment";
import { HttpClient } from "@angular/common/http";


export interface CreateRentalContractItemRequest {
  productId: number;
  productName: string; // For display purposes, not sent to backend
  brand?: string; // Optional, for display only
  model?: string; // Optional, for display only
  quantity: number;
  rent: number;
  serialNumbers: string[]; // Note: Backend generates these, but DTO includes it
}

export interface CreateRentalContractRequest {
  customerId: number;
  startDate: string; // ISO format date string
  endDate: string | null; // ISO format date string
  billingCycle: number;
  cashAccountId: number;
  paymentMethod: string; // 'Cash' or 'Bank'
  securityDeposit: number; 
  note: string; // Optional note for the rental contract
  items: CreateRentalContractItemRequest[];
}

@Injectable({ providedIn: 'root' })

export class RentalContractService {
  private apiUrl = `${environment.apiUrl}/rentalContract`;
  private http = inject(HttpClient);

  createRentalContract(data: CreateRentalContractRequest) {
    return this.http.post<number>(this.apiUrl, data);
  }
}
