import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { ProductService, Product } from '../../../service/item/product.service';
import { BrandService } from '../../../service/item/brand.service';
import { PdfService } from '../../../service/common/pdf.service';
import { ExcelService } from '../../../service/common/excel.service';
import { PrintService } from '../../../service/common/print.service';
import { createEmptyToast, ToastController, ToastState, ToastType } from '../../../service/common/toast-helper';

@Component({
  selector: 'app-product',
  standalone: true, // Assuming Angular 17+
  imports: [CommonModule, FormsModule],
  templateUrl: './product.html',
  styleUrl: './product.css',
})

export class ProductComponent implements OnInit, OnDestroy { // Renamed to ProductComponent to avoid conflict with interface
  page: number = 1;
  pageSize: number = 10;
  totalCount: number = 0;
  toast: ToastState = createEmptyToast();

  products: Product[] = [];
  brands: any[] = [];
  showForm = false;
  loading = false;
  isEditMode = false;
  selectedId: number | null = null;
  search = '';
  selectedBrandId = '';
  selectedActiveStatus = '';
  appliedActiveStatus = '';
  selectedProductDetail: Product | null = null;
  showQuickBrandForm = false;
  savingQuickBrand = false;
  quickBrandName = '';

  // Initializing with correct types
  product: Partial<Product> = this.getEmptyProduct();
  private readonly toastController = new ToastController();

  constructor(
    private productService: ProductService,
    private brandService: BrandService,
    private pdfService: PdfService,
    private excelService: ExcelService,
    private printService: PrintService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadProducts();
    this.loadBrands(); 
  }

  ngOnDestroy(): void {
    this.toastController.destroy();
  }

  loadBrands() {
    this.brandService.getAll().subscribe({
      next: (res) => {
        this.brands = res;
      },
      error: (err) => console.error('Error loading brands', err)
    });
  }

  getEmptyProduct(): Partial<Product> {
    return {
      name: '',
      model: '',
      description: '',
      brandName: '',
      defaultSalePrice: 0,
      defaultRentPrice: 0,
      lowStockThreshold: 0,
      isActive: true
    };
  }

  get filteredProducts(): Product[] {
    return this.products;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  get pagedProducts(): Product[] {
    return this.products;
  }

  get pageStart(): number {
    return this.totalCount === 0 ? 0 : ((Math.min(this.page, this.totalPages) - 1) * this.pageSize) + 1;
  }

  get pageEnd(): number {
    return Math.min(Math.min(this.page, this.totalPages) * this.pageSize, this.totalCount);
  }

  get activeCount(): number {
    return this.products.filter((item) => item.isActive).length;
  }

  get lowStockCount(): number {
    return this.products.filter((item) => item.inStock <= item.lowStockThreshold).length;
  }

  get stockCount(): number {
    return this.products.reduce((total, item) => total + (Number(item.inStock) || 0), 0);
  }

  loadProducts() {
    this.loading = true;
    this.productService.getWithStock(
      this.page,
      this.pageSize,
      this.search,
      this.selectedBrandId ? Number(this.selectedBrandId) : undefined,
      this.getSelectedIsActive(this.appliedActiveStatus)
    ).subscribe({
      next: (res) => {
        // res already contains the brandName from our .NET DTO
        this.products = res.items;
        this.totalCount = res.totalCount;
        this.selectedProductDetail = null;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Fetch error:', err);
        this.loading = false;
      }
    });
  }

  onSearch() {
    this.appliedActiveStatus = this.selectedActiveStatus;
    this.page = 1;
    this.loadProducts();
  }

  onPageSizeChange() {
    this.page = 1;
    this.loadProducts();
  }

  resetFilters() {
    this.search = '';
    this.selectedBrandId = '';
    this.selectedActiveStatus = '';
    this.appliedActiveStatus = '';
    this.page = 1;
    this.selectedProductDetail = null;
    this.loadProducts();
  }

  onPageChange(newPage: number) {
    if (newPage < 1 || newPage > this.totalPages) return;

    this.page = newPage;
    this.loadProducts();
  }

  downloadExcel() {
    this.getReportProducts((items) => {
      const rows = items.map((x, index) => ({
        SL: index + 1,
        Name: x.name,
        Model: x.model,
        Brand: x.brandName || '-',
        SalePrice: this.formatNumber(x.defaultSalePrice),
        RentPrice: this.formatNumber(x.defaultRentPrice),
        LowStock: x.lowStockThreshold ?? 0,
        Stock: x.inStock ?? 0,
        Rented: x.inRent ?? 0,
        Status: x.isActive ? 'Active' : 'Inactive'
      }));

      this.excelService.exportToExcel(rows, 'machine-report');
    });
  }

  downloadPdf() {
    this.getReportProducts((items) => {
      const columns = [
        { header: 'SL', field: 'sl' },
        { header: 'Name', field: 'name' },
        { header: 'Model', field: 'model' },
        { header: 'Brand', field: 'brand' },
        { header: 'Sale Price', field: 'salePrice' },
        { header: 'Rent Price', field: 'rentPrice' },
        { header: 'Low Stock', field: 'lowStock' },
        { header: 'Stock', field: 'stock' },
        { header: 'Rented', field: 'rented' },
        { header: 'Status', field: 'status' }
      ];

      const rows = items.map((x, index) => ({
        sl: index + 1,
        name: x.name,
        model: x.model,
        brand: x.brandName || '-',
        salePrice: this.formatNumber(x.defaultSalePrice),
        rentPrice: this.formatNumber(x.defaultRentPrice),
        lowStock: x.lowStockThreshold ?? 0,
        stock: x.inStock ?? 0,
        rented: x.inRent ?? 0,
        status: x.isActive ? 'Active' : 'Inactive'
      }));

      this.pdfService.downloadTablePdf('Machine Report', columns, rows, 'machines.pdf');
    });
  }

  printReport() {
    this.getReportProducts((items) => {
      this.printService.printReport({
        title: 'Machine Report',
        data: items,
        columns: [
          { header: 'SL', value: (_x, index) => String(index + 1), align: 'center' },
          { header: 'Name', value: x => x.name || '-' },
          { header: 'Model', value: x => x.model || '-' },
          { header: 'Brand', value: x => x.brandName || '-' },
          { header: 'Sale Price', value: x => this.formatNumber(x.defaultSalePrice), align: 'right' },
          { header: 'Rent Price', value: x => this.formatNumber(x.defaultRentPrice), align: 'right' },
          { header: 'Low Stock', value: x => String(x.lowStockThreshold ?? 0), align: 'center' },
          { header: 'Stock', value: x => String(x.inStock ?? 0), align: 'center' },
          { header: 'Rented', value: x => String(x.inRent ?? 0), align: 'center' },
          { header: 'Status', value: x => x.isActive ? 'Active' : 'Inactive', align: 'center' }
        ]
      });
    });
  }

  private getReportProducts(callback: (items: Product[]) => void) {
    if (this.totalCount <= this.products.length) {
      callback(this.products);
      return;
    }

    this.productService.getWithStock(1, this.totalCount, this.search, this.selectedBrandId ? Number(this.selectedBrandId) : undefined, this.getSelectedIsActive(this.appliedActiveStatus)).subscribe({
      next: (res) => callback(res.items || []),
      error: (err) => {
        console.error('Report export failed:', err);
        callback(this.products);
      }
    });
  }

  private formatNumber(value: number | undefined): string {
    return (Number(value) || 0).toFixed(2);
  }

  private getSelectedIsActive(value: string): boolean | undefined {
    if (value === 'active') return true;
    if (value === 'inactive') return false;
    return undefined;
  }

  openForm() {
    this.resetForm();
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.closeQuickBrandForm();
  }

  edit(item: Product) {
    this.isEditMode = true;
    this.selectedId = item.id;
    // Spread operator is a cleaner way to copy values
    this.product = { ...item };
    this.showForm = true;
  }

  showProductDetail(item: Product) {
    this.selectedProductDetail = item;
  }

  closeProductDetail() {
    this.selectedProductDetail = null;
  }

  openQuickBrandForm() {
    this.quickBrandName = '';
    this.showQuickBrandForm = true;
  }

  closeQuickBrandForm() {
    this.showQuickBrandForm = false;
    this.savingQuickBrand = false;
    this.quickBrandName = '';
  }

  saveQuickBrand() {
    const name = this.quickBrandName.trim();

    if (!name) {
      this.showToast('warning', 'Validation Error', 'Brand name is required.');
      return;
    }

    this.savingQuickBrand = true;
    this.brandService.create({
      name,
      description: '',
      logoUrl: '',
      isActive: true
    }).subscribe({
      next: (id: any) => {
        this.brandService.getAll().subscribe({
          next: (brands) => {
            this.brands = brands;
            const newBrandId = Number(id);
            const createdBrand = brands.find((brand: any) => Number(brand.id) === newBrandId)
              || brands.find((brand: any) => brand.name?.trim().toLowerCase() === name.toLowerCase());

            if (createdBrand) {
              this.product.brandId = Number(createdBrand.id);
            }

            this.closeQuickBrandForm();
            this.showToast('success', 'Success', 'Brand added successfully.');
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Brand reload failed:', err);
            this.savingQuickBrand = false;
            this.showToast('danger', 'Save Failed', 'Brand added, but unable to refresh brand list.');
          }
        });
      },
      error: (err) => {
        console.error('Brand save failed:', err);
        this.savingQuickBrand = false;
        this.showToast('danger', 'Save Failed', this.getErrorMessage(err, 'Unable to add the brand. Please try again.'));
      }
    });
  }

 saveProduct() {
    // 1. Basic Validation Logic
    const isNameInvalid = !this.product.name || this.product.name.trim() === '';
    const isModelInvalid = !this.product.model || this.product.model.trim() === '';
    const isBrandInvalid = !this.product.brandId; // Ensure a brand is selected

    if (isNameInvalid || isModelInvalid || isBrandInvalid) {
        // If you want to force the red spans to show up even if the user didn't touch the fields:
        // You would pass the #productForm from HTML and call form.control.markAllAsTouched();
        console.warn("Validation failed: Please fill in all required fields.");
        this.showToast('warning', 'Validation Error', 'Please fill in all required machine fields.');
        return; 
    }

    // 2. Prepare Data (Ensuring numbers are actually numbers)
    const payload = {
        ...this.product,
        defaultSalePrice: Number(this.product.defaultSalePrice) || 0,
        defaultRentPrice: Number(this.product.defaultRentPrice) || 0,
        lowStockThreshold: Number(this.product.lowStockThreshold) || 0
    };

    // 3. Execution Logic
    const request = (this.isEditMode && this.selectedId)
      ? this.productService.update(this.selectedId, payload)
      : this.productService.create(payload);
    const message = this.isEditMode ? 'Machine updated successfully.' : 'Machine added successfully.';

    this.loading = true; // Show a spinner if you have one
    request.subscribe({
      next: () => {
        this.afterSave(message);
      },
      error: (err) => {
        console.error('Save failed:', err);
        this.loading = false;
        this.showToast('danger', 'Save Failed', 'Unable to save the machine. Please try again.');
      }
    });
}

  delete(id: number) {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.productService.delete(id).subscribe({
          next: () => {
            this.loadProducts();
            this.showToast('success', 'Deleted', 'Machine deleted successfully.');
            Swal.fire('Deleted!', 'The product has been removed.', 'success');
          },
          error: (err) => {
            console.error('Delete failed:', err);
            this.showToast('danger', 'Delete Failed', 'Unable to delete the machine. Please try again.');
          }
        });
      }
    });
  }

  afterSave(message: string) {
    this.loadProducts();
    this.resetForm();
    this.showForm = false;
    this.showToast('success', 'Success', message);
  }

  resetForm() {
    this.isEditMode = false;
    this.selectedId = null;
    this.product = this.getEmptyProduct();
    this.closeQuickBrandForm();
  }

  showToast(type: ToastType, title: string, message: string) {
    this.toastController.show(type, title, message, (toast) => this.toast = toast, () => this.closeToast());
  }

  closeToast() {
    this.toastController.close((toast) => this.toast = toast);
  }

  private getErrorMessage(error: any, fallback: string): string {
    if (typeof error?.error === 'string' && error.error.trim()) {
      return error.error;
    }

    if (typeof error?.error?.message === 'string' && error.error.message.trim()) {
      return error.error.message;
    }

    return fallback;
  }
}
