import { inject, Injectable } from "@angular/core";
import { environment } from "../../../environments/environment";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";

export interface PurchaseInvoiceItemDto {
    id: number;
    productName: string;
    model: string;
    brandName: string;
    quantity: number;
    unitCost: number;
    productSerialNumber: string[];
}

export interface PurchaseInvoiceDto {
    id: string | number;
    purchaseNumber: string;
    purchaseDate: Date | string; // Use string if the API returns an ISO date string
    subTotal: number;
    discount: number;
    isPaid: boolean;
    vendorFullName: string;
    companyName: string;
    paidAmount: number;
    paymentMethod: string;
    invoiceItems: PurchaseInvoiceItemDto[];
}

export interface PurchaseItem {
    id: string | number;
    purchaseNumber: string;
    purchaseDate: Date | string;
    subTotal: number;
    discount: number;
    isPaid: boolean;
    vendorId: number;
    firstName: string;
    lastName: string;
    companyName: string;
    amount?: number;
    paidAmount?: number;
    paymentMethod: string;
    status: string;
    totalAmount?: number;
    items?: PurchaseDetailItem[];
    purchaseItems?: PurchaseDetailItem[];
    invoiceItems?: PurchaseInvoiceItemDto[];
    vendorFullName?: string;
}

export interface PurchaseDetailItem {
    id?: number;
    productName?: string;
    name?: string;
    model?: string;
    brandName?: string;
    quantity: number;
    unitCost: number;
    totalAmount?: number;
    subTotal?: number;
    productSerialNumber?: string[];
}

export interface SearchPurchaseDto {
    searchText?: string;
    startDate?: string;
    endDate?: string;
    companyName?: string;
    vendorId?: string;
    pageNumber: number;
    pageSize: number;
}

export interface PagedResult<T> {
    items: T[];
    totalCount: number;
}

@Injectable({
    providedIn: 'root'
})
export class PurchaseListService {

    private apiUrl = `${environment.apiUrl}/purchase`;
    private http = inject(HttpClient);

    GetAllBySearchWithPagination(
        searchDto: SearchPurchaseDto
    ): Observable<PagedResult<PurchaseItem>> {

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
        if (searchDto.vendorId) {
            params = params.set('vendorId', searchDto.vendorId);
        }

        params = params.set('pageNumber', searchDto.pageNumber.toString());
        params = params.set('pageSize', searchDto.pageSize.toString());

        return this.http.get<PagedResult<PurchaseItem>>(
            `${this.apiUrl}/GetAllBySearchWithPagination`,
            { params }
        );
    }

    getById(id: string | number): Observable<PurchaseInvoiceDto> {
        return this.http.get<PurchaseInvoiceDto>(`${this.apiUrl}/${id}`);
    }
}
