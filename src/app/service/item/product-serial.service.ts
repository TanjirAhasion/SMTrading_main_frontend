import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ProductSerialDto {
  id: number;
  serialNumber: string;
  productId: number;
  productName: string;
  model: string;
  brandName: string;
  status: string;
  purchaseCost: number;
  sellingCost: number;
  rentalCost: number;
  isSerialNumberLinkToProduct: boolean; // Optional property to indicate if the serial number is linked to a product
  linkedProductSerialNumberImageUrl?: string; // Optional property for the image URL of the linked product serial number
}

export interface CreateProductSerialDto {
  serialNumber: string;
  productId: number;
  purchaseCost: number;
  sellingCost: number;
  rentalCost: number;
  status: ProductSerialStatusEnum;
  legacySerial?: string; 
  isOpeningStock: boolean;
  note?: string;
}

export interface UpdateProductSerialDto {
  id: number;
  serialNumber: string;
  productId: number;
  status: string | ProductSerialStatusEnum;
  purchaseCost: number;
  sellingCost: number;
  rentalCost: number;
  legacySerial?: string; 
  isOpeningStock: boolean; // Optional property to indicate if the serial number is part of the opening stock
  note?: string; // Optional property for any additional notes about the product serial number
}

export interface UpdateProductSerialLinkedDto {
  id: number;
  isSerialNumberLinkToProduct: boolean; // Optional property to indicate if the serial number is linked to a product
  linkedUrl: string; // Optional property for the URL of the linked product serial number
}

export interface ProductSerialStatus {
  id: number;
  name: string;
}

export enum ProductSerialStatusEnum {
  InStock = 1,
  Sold = 2,
  InRent = 3,
  InService = 4,
  Damaged = 5,
  Lost = 6,
  Scrapped = 7
}

@Injectable({
  providedIn: 'root'
})

export class ProductSerialService {
  private apiUrl = `${environment.apiUrl}/productserials`;
  private http = inject(HttpClient);

  getAll(): Observable<ProductSerialDto[]> {
    return this.http.get<ProductSerialDto[]>(this.apiUrl);
  }

  getById(id: number): Observable<ProductSerialDto> {
    return this.http.get<ProductSerialDto>(`${this.apiUrl}/${id}`);
  }

  create(data: CreateProductSerialDto): Observable<ProductSerialDto> {
    return this.http.post<ProductSerialDto>(this.apiUrl, data);
  }

  update(id: number, data: UpdateProductSerialDto): Observable<ProductSerialDto> {
    return this.http.put<ProductSerialDto>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  updateLinkedStatus(formData: FormData): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/updateLinkedStatus`,
      formData
    );
  }

  unLinkedStatus(id: number): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/unLinkedStatus/${id}`,
      {}
    );
  }

  productSerialStatuses(): Observable<ProductSerialStatus[]> {
    return this.http.get<ProductSerialStatus[]>(`${this.apiUrl}/productSerialStatuses`);
  }

  getSerials(page: number, size: number, search: string = '', status?: number, isLinkedPhoto?: boolean, isActive?: boolean) {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (search) {
      params = params.set('search', search);
    }
    
    if (status !== undefined) {
      params = params.set('status', status.toString());
    }

    if (isLinkedPhoto !== undefined) {
      params = params.set('isLinkedPhoto', isLinkedPhoto.toString());
    }

    if (isActive !== undefined) {
      params = params.set('isActive', isActive.toString());
    }

    return this.http.get<any>(`${this.apiUrl}/GetAllBySearchWithPagination`, { params });
  }
}
