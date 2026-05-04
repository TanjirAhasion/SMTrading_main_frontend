import { inject, Injectable } from "@angular/core";
import { environment } from "../../../environments/environment";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface Customer {
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
}

@Injectable({
    providedIn: 'root'
})


export class CustomerService {

    private apiUrl = `${environment.apiUrl}/customers`;
    private http = inject(HttpClient); // Modern Angular style using inject()

    getAll(): Observable<Customer[]> {
        return this.http.get<Customer[]>(this.apiUrl);
    }

    getById(id: number): Observable<Customer> {
        return this.http.get<Customer>(`${this.apiUrl}/${id}`);
    }

    create(data: Partial<Customer>): Observable<Customer> {
        return this.http.post<Customer>(this.apiUrl, data);
    }

    update(id: number, data: Partial<Customer>): Observable<Customer> {
        return this.http.put<Customer>(`${this.apiUrl}/${id}`, data);
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}