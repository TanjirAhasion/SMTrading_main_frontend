import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ProductSerialImage {
    id: number;
    title: string;
    productSerialId : number;
    imageUrl: string;
}

export interface ProductImageWithLinkedDto {
    id: number;
    title: string;
    productSerialId : number;
    imageUrl: string;
    isLinked: boolean; // Optional property to indicate if this image is linked to the product
}

@Injectable({
    providedIn: 'root'
})

export class ProductSerialImageService {
    private apiUrl = `${environment.apiUrl}/productImages`;
    private http = inject(HttpClient);

    // FIX: Pass the ID to the API
    getByProductSerialId(serialId: number): Observable<ProductImageWithLinkedDto[]> {
        // Option A: Use a query string: .../productImages?serialId=5
        // return this.http.get<ProductSerialImage[]>(`${this.apiUrl}?serialId=${serialId}`);
        
        // Option B: Use a specific route (Common in REST): .../productImages/serial/5
        return this.http.get<ProductImageWithLinkedDto[]>(`${this.apiUrl}/serial/${serialId}`);
    }

    upload(formData: FormData): Observable<ProductSerialImage> {
        // It's better to type the return as ProductSerialImage 
        // so you can push the result directly into your local array.
        return this.http.post<ProductSerialImage>(this.apiUrl, formData);
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}