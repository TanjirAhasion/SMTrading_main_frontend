import { inject, Injectable } from "@angular/core";
import { environment } from "../../../environments/environment.prod";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface ExpenseCategoryDto {
  id: number;
  name: string;
  isActive: boolean;
}

@Injectable({
    providedIn: 'root'
})

export class ExpenseCategoryService {
    private apiUrl = `${environment.apiUrl}/expenseCategory`
    private http = inject(HttpClient);

    getAll(): Observable<ExpenseCategoryDto[]> {
        return this.http.get<ExpenseCategoryDto[]>(this.apiUrl);
    }

    getById(id: number): Observable<ExpenseCategoryDto> {
        return this.http.get<ExpenseCategoryDto>(`${this.apiUrl}/${id}`);
    }

    create(data: Partial<ExpenseCategoryDto>): Observable<ExpenseCategoryDto> {
        return this.http.post<ExpenseCategoryDto>(this.apiUrl, data);
    }

    update(id: number, data: Partial<ExpenseCategoryDto>): Observable<ExpenseCategoryDto> {
        return this.http.put<ExpenseCategoryDto>(`${this.apiUrl}/${id}`, data);
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}