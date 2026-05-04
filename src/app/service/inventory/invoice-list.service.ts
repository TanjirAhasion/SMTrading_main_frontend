import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date;
  customerName: string;
  status: 'Paid' | 'Pending' | 'Overdue';
  totalAmount: number;
}

@Injectable({ providedIn: 'root' })

export class InvoiceService {
  private apiUrl = 'https://api.yourdomain.com/api/invoices'; // Replace with your actual API endpoint

  constructor(private http: HttpClient) {}

  // Fetch paginated and filtered invoices from backend
  getInvoices(params: any): Observable<{ data: Invoice[]; totalCount: number }> {
    let httpParams = new HttpParams()
      .set('page', params.page || 1)
      .set('pageSize', params.pageSize || 10);

    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.startDate) httpParams = httpParams.set('startDate', params.startDate);
    if (params.endDate) httpParams = httpParams.set('endDate', params.endDate);
    if (params.customerName) httpParams = httpParams.set('customerName', params.customerName);
    if (params.status) httpParams = httpParams.set('status', params.status);

    // Example using HttpClient: return this.http.get<{ data: Invoice[]; totalCount: number }>(this.apiUrl, { params: httpParams });

    // Mock response for demonstration
    const dummyInvoices: Invoice[] = [
      { id: '101', invoiceNumber: 'INV-2026-001', invoiceDate: new Date('2026-04-22'), customerName: 'TechCorp Solutions', status: 'Paid', totalAmount: 1500.00 },
      { id: '102', invoiceNumber: 'INV-2026-002', invoiceDate: new Date('2026-04-25'), customerName: 'Logix Retail', status: 'Pending', totalAmount: 350.50 },
      { id: '103', invoiceNumber: 'INV-2026-003', invoiceDate: new Date('2026-04-28'), customerName: 'Alpha Builders', status: 'Overdue', totalAmount: 2800.00 },
    ];

    return of({
      data: dummyInvoices,
      totalCount: dummyInvoices.length
    });
  }

  deleteInvoice(id: string): Observable<any> {
    // return this.http.delete(`${this.apiUrl}/${id}`);
    return of({ success: true });
  }
}