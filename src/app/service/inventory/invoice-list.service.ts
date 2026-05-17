import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SalesInvoiceItemDto {
    id: number;
    productName: string;
    model: string;
    brandName: string;
    quantity: number;
    unitPrice: number;
    serialNumbers: string[];
}

export interface SalesInvoiceDto {
    id: string | number;
    invoiceNumber: string;
    saleDate: Date | string; // Dates often arrive as ISO strings from JSON
    subTotal: number;
    discount: number;
    isPaid: boolean;
    customerFullName: string;
    companyName: string;
    paidAmount: number;
    paymentMethod: string;
    invoiceItems: SalesInvoiceItemDto[];
}

export interface SaleItem {
    id: string | number;
    invoiceNumber: string;
    saleDate: Date | string;
    subTotal: number;
    discount: number;
    isPaid: boolean;
    customerId: number;
    firstName: string;
    lastName: string;
    companyName: string;
    paidAmount: number;
    paymentMethod: string;
    status: string;
    totalAmount?: number;
    invoiceItems?: SalesInvoiceItemDto[];
    customerFullName?: string;
}

export interface SearchSalesDto {
    searchText?: string;
    startDate?: string;
    endDate?: string;
    companyName?: string;
    customerId?: string;
    pageNumber: number;
    pageSize: number;
}

export interface PagedResult<T> {
    items: T[];
    totalCount: number;
}

@Injectable({ providedIn: 'root' })

export class InvoiceService {
    private apiUrl = `${environment.apiUrl}/sales`;
    private http = inject(HttpClient);

    GetAllBySearchWithPagination(
        searchDto: SearchSalesDto
    ): Observable<PagedResult<SaleItem>> {

        let params = new HttpParams();

        if (searchDto.searchText) {
            params = params.set('searchText', searchDto.searchText);
        }
        if (searchDto.startDate) {
            params = params.set('startDate', searchDto.startDate);
        }
        if (searchDto.endDate) {
            params = params.set('endDate', searchDto.endDate);
        }
        if (searchDto.companyName) {
            params = params.set('companyName', searchDto.companyName);
        }
        if (searchDto.customerId) {
            params = params.set('customerId', searchDto.customerId);
        }

        params = params.set('pageNumber', searchDto.pageNumber.toString());
        params = params.set('pageSize', searchDto.pageSize.toString());

        return this.http.get<PagedResult<SaleItem>>(
            `${this.apiUrl}/GetAllBySearchWithPagination`,
            { params }
        );
    }

    getById(id: string | number): Observable<SalesInvoiceDto> {
        return this.http.get<SalesInvoiceDto>(`${this.apiUrl}/${id}`);
    }
}
