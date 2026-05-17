import { inject, Injectable } from "@angular/core";
import { environment } from "../../../environments/environment.prod";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export enum CashAccountType {
    // Add your enum values here
    Cash = 0,
    Bank = 1,
    MobileBank = 2
}

export enum MobileBankType {
    Bkash = 0,
    Nagad = 1,
    Rocket = 2
}

export interface CashAccountDto {
    id: number;
    name: string;
    accountType: CashAccountType;
    accountTypeName: string;
    mobileBankType?: MobileBankType | null;
    mobileBankTypeName?: string | null;
    accountNumber?: string | null;
    accountHolderName?: string | null;
    bankName?: string | null;
    branchName?: string | null;
    note?: string | null;
    openingBalance: number;
    currentBalance: number;
    isDefault: boolean;
    isActive: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class CashAccountService {
    private apiUrl = `${environment.apiUrl}/cashaccounts`;
    private http = inject(HttpClient);

    getAll(): Observable<CashAccountDto[]> {
        return this.http.get<CashAccountDto[]>(this.apiUrl);
    }

    getById(id: number): Observable<CashAccountDto> {
        return this.http.get<CashAccountDto>(`${this.apiUrl}/${id}`);
    }

    create(data: Partial<CashAccountDto>): Observable<CashAccountDto> {
        return this.http.post<CashAccountDto>(this.apiUrl, data);
    }

    update(id: number, data: Partial<CashAccountDto>): Observable<CashAccountDto> {
        return this.http.put<CashAccountDto>(`${this.apiUrl}/${id}`, data);
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}