import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  PurchaseItem,
  PurchaseListService,
  SearchPurchaseDto
} from '../../../service/inventory/purchase-list.service';

@Component({
  selector: 'app-purchase-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './purchase-list.html',
  styleUrls: ['./purchase-list.css'],
})
export class PurchaseListComponent implements OnInit {

  private purchaseService = inject(PurchaseListService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  public Math = Math;

  purchases: PurchaseItem[] = [];

  // Filters
  searchQuery: string = '';
  selectedStartDate: string = '';
  selectedEndDate: string = '';
  selectedVendorId: string = '';
  selectedCompanyName: string = '';

  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalItems: number = 0;

  // Calculated values (optimized)
  totalAmountSum: number = 0;
  uniqueVendorsCount: number = 0;

  // Mock dropdowns (replace with API later)
  vendors: string[] = ['Vendor A', 'Vendor B', 'Vendor C'];

  ngOnInit(): void {
    this.loadPurchases();
  }

  private buildSearchDto(): SearchPurchaseDto {
    return {
      searchText: this.searchQuery || undefined,
      startDate: this.selectedStartDate
        ? new Date(this.selectedStartDate).toISOString()
        : undefined,
      endDate: this.selectedEndDate
        ? new Date(this.selectedEndDate).toISOString()
        : undefined,
      vendorId: this.selectedVendorId || undefined,
      companyName: this.selectedCompanyName || undefined,
      pageNumber: this.currentPage,
      pageSize: this.itemsPerPage
    };
  }

  loadPurchases(): void {
    const searchDto = this.buildSearchDto();

    this.purchaseService.GetAllBySearchWithPagination(searchDto).subscribe({
      next: (result) => {
        this.purchases = result.items;
        this.totalItems = result.totalCount;

        // Fix pagination overflow
        const totalPages = this.totalPages;
        if (this.currentPage > totalPages && totalPages > 0) {
          this.currentPage = 1;
          this.loadPurchases();
          return;
        }

        // Optimized calculations
        this.totalAmountSum = this.purchases.reduce(
          (sum, item) => sum + item.totalAmount,
          0
        );

        this.uniqueVendorsCount = new Set(
          this.purchases.map(p => p.firstName + ' ' + p.lastName)
        ).size;
        
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading purchases', err);
      }
    });
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadPurchases();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedStartDate = '';
    this.selectedEndDate = '';
    this.selectedVendorId = '';
    this.selectedCompanyName = '';
    this.currentPage = 1;
    this.loadPurchases();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadPurchases();
  }

  onPageSizeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.itemsPerPage = Number(target.value);
    this.currentPage = 1;
    this.loadPurchases();
  }

  createNewPurchase(): void {
    this.router.navigate(['/inventory/purchase']);
  }

  editPurchase(item: PurchaseItem): void {
    this.router.navigate(['/purchase/edit', item.id]);
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  get currentRecordMax(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
  }

  getTotalAmount(): number {
    return this.purchases.reduce((sum, item) => sum + item.totalAmount, 0);
  }
  getUniqueVendorsCount(): number {
    return new Set(this.purchases.map(p => `${p.firstName} ${p.lastName}`)).size;

  }
}