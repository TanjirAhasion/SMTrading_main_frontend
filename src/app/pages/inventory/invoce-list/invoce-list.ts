import { Component, OnInit } from '@angular/core';
import { Invoice, InvoiceService } from '../../../service/inventory/invoice-list.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-invoce-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './invoce-list.html',
  styleUrl: './invoce-list.css',
})

export class InvoiceListComponent implements OnInit {

  // Main data arrays
  invoices: Invoice[] = [];
  filteredInvoices: Invoice[] = [];

  // Filter properties matching template bindings
  searchQuery: string = '';
  selectedStartDate: string = '';
  selectedEndDate: string = '';
  selectedCustomer: string = '';
  selectedStatus: string = '';

  // Dropdown lists
  customers: string[] = ['TechCorp Solutions', 'Logix Retail', 'Alpha Builders'];

  // Pagination parameters
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalItems: number = 0;
  loading: boolean = false;

  constructor(
    private invoiceService: InvoiceService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadInvoices();
  }

  loadInvoices(): void {
    this.loading = true;
    const params = {
      page: this.currentPage,
      pageSize: this.itemsPerPage,
      search: this.searchQuery,
      startDate: this.selectedStartDate,
      endDate: this.selectedEndDate,
      customerName: this.selectedCustomer,
      status: this.selectedStatus
    };

    this.invoiceService.getInvoices(params).subscribe({
      next: (response) => {
        this.invoices = response.data;
        this.filteredInvoices = [...this.invoices]; // Initialize with full array
        this.totalItems = response.totalCount;
        this.loading = false;
        this.applyFilters();
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    this.filteredInvoices = this.invoices.filter(item => {
      const matchesSearch = item.invoiceNumber.toLowerCase().includes(this.searchQuery.toLowerCase()) || 
                            item.customerName.toLowerCase().includes(this.searchQuery.toLowerCase());
      
      const itemDate = new Date(item.invoiceDate);
      const isAfterStart = !this.selectedStartDate || itemDate >= new Date(this.selectedStartDate);
      const isBeforeEnd = !this.selectedEndDate || itemDate <= new Date(this.selectedEndDate);
      const matchesDate = isAfterStart && isBeforeEnd;

      const matchesCustomer = !this.selectedCustomer || item.customerName === this.selectedCustomer;
      const matchesStatus = !this.selectedStatus || item.status === this.selectedStatus;

      return matchesSearch && matchesDate && matchesCustomer && matchesStatus;
    });

    this.totalItems = this.filteredInvoices.length;
    this.currentPage = 1; // Reset to page 1 on filter
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedStartDate = '';
    this.selectedEndDate = '';
    this.selectedCustomer = '';
    this.selectedStatus = '';
    this.applyFilters();
  }

  get pagedInvoices(): Invoice[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredInvoices.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get currentRecordMaxRecord(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
  }

  onPageChange(pageNumber: number): void {
    this.currentPage = pageNumber;
  }

  getTotalAmount(): number {
    return this.filteredInvoices.reduce((sum, item) => sum + item.totalAmount, 0);
  }

  getUniqueCustomersCount(): number {
    return new Set(this.filteredInvoices.map(i => i.customerName)).size;
  }

  createNewInvoice(): void {
    this.router.navigate(['/invoice/create']);
  }

  editInvoice(invoice: Invoice): void {
    this.router.navigate([`/invoice/edit`, invoice.id]);
  }

  deleteInvoice(invoice: Invoice): void {
    if (confirm(`Are you sure you want to delete invoice ${invoice.invoiceNumber}?`)) {
      this.invoiceService.deleteInvoice(invoice.id).subscribe({
        next: () => {
          this.loadInvoices();
        }
      });
    }
  }
}
