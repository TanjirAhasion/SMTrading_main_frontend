import { inject, Injectable } from "@angular/core";
import { environment } from "../../../environments/environment.prod";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";


export interface ExpenseDto {
  id: number;
  expenseCategoryId: number;
  expenseCategoryName?: string | null;
  amount: number;
  expenseDate: string | Date; // Can be string (JSON ISO format) or a JavaScript Date object
  cashAccountId: number;
  cashAccountName?: string | null;
  note?: string | null;
}

@Injectable({
    providedIn: 'root'
})

export class ExpenseService {
    private apiUrl = `${environment.apiUrl}/expense`
    private http = inject(HttpClient);  
    
    getAll(): Observable<ExpenseDto[]> {
        return this.http.get<ExpenseDto[]>(this.apiUrl);
    }

    getById(id: number): Observable<ExpenseDto> {
        return this.http.get<ExpenseDto>(`${this.apiUrl}/${id}`);
    }   

    create(data: Partial<ExpenseDto>): Observable<ExpenseDto> {
        return this.http.post<ExpenseDto>(this.apiUrl, data);
    }

    update(id: number, data: Partial<ExpenseDto>): Observable<ExpenseDto> {
        return this.http.put<ExpenseDto>(`${this.apiUrl}/${id}`, data);
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}
