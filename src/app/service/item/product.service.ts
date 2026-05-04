import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Standardized naming to 'Product'
export interface Product {
  id: number;
  name: string;
  model: string;
  brandId:number;
  brandName: string;
  defaultSalePrice: number; // Decimal in .NET
  defaultRentPrice: number; // Decimal in .NET
  lowStockThreshold: number;
  description: string;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})

export class ProductService {
  // Assuming the backend endpoint is also /products
  private apiUrl = `${environment.apiUrl}/products`;
  private http = inject(HttpClient); // Modern Angular style using inject()

  getAll(): Observable<Product[]> {
    return this.http.get<Product[]>(this.apiUrl);
  }

  getById(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }

  create(data: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, data);
  }

  update(id: number, data: Partial<Product>): Observable<Product> {
    return this.http.put<Product>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}