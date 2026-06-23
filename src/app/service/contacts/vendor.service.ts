import { inject, Injectable } from "@angular/core";
import { environment } from "../../../environments/environment";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface Vendor {
    id: number;
    firstName: string;
    lastName: string;

    phone: string;
    secondaryPhone: string;
    email: string;
    address: string;
    companyName: string;
    businessCardPath: string;
    isActive: boolean;
    dueAmount: number;
}

export interface VendorPaymentHistory {
    id: number;
    vendorId: number;
    vendorName: string;
    companyName?: string;
    purchaseId?: number;
    amount: number;
    transactionDate: string | Date;
    sourceType: number;
    sourceTypeName: string;
    debit: number;
    credit: number;
    balance: number;
    description?: string;
}

export interface VendorDuePaymentRequest {
    vendorId: number;
    amount: number;
    cashAccountId?: number | null;
    paymentDate?: string | Date;
    paymentMethod: number;
    actionType: number;
    note?: string;
}

@Injectable({
    providedIn: 'root'
})


export class VendorService {

    private apiUrl = `${environment.apiUrl}/vendors`;
    private http = inject(HttpClient); // Modern Angular style using inject()

    getAll(): Observable<Vendor[]> {
        return this.http.get<Vendor[]>(this.apiUrl);
    }

    getById(id: number): Observable<Vendor> {
        return this.http.get<Vendor>(`${this.apiUrl}/${id}`);
    }

    create(data: Partial<Vendor>): Observable<Vendor> {
        return this.http.post<Vendor>(this.apiUrl, data);
    }

    update(id: number, data: Partial<Vendor>): Observable<Vendor> {
        return this.http.put<Vendor>(`${this.apiUrl}/${id}`, data);
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }

    getPaymentHistory(vendorId?: number): Observable<VendorPaymentHistory[]> {
        const url = `${environment.apiUrl}/vendor-payments/history`;
        return this.http.get<VendorPaymentHistory[]>(vendorId ? `${url}?vendorId=${vendorId}` : url);
    }

    payDue(data: VendorDuePaymentRequest): Observable<number> {
        return this.http.post<number>(`${environment.apiUrl}/vendor-payments/pay-due`, data);
    }
}
