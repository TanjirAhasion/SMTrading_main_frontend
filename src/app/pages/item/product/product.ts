import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { ProductService, Product } from '../../../service/item/product.service';
import { BrandService } from '../../../service/item/brand.service';

@Component({
  selector: 'app-product',
  standalone: true, // Assuming Angular 17+
  imports: [CommonModule, FormsModule],
  templateUrl: './product.html',
  styleUrl: './product.css',
})

export class ProductComponent implements OnInit { // Renamed to ProductComponent to avoid conflict with interface
  products: Product[] = [];
  brands: any[] = [];
  showForm = false;
  loading = false;
  isEditMode = false;
  selectedId: number | null = null;

  // Initializing with correct types
  product: Partial<Product> = this.getEmptyProduct();

  constructor(private productService: ProductService, private brandService: BrandService, private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.loadProducts();
    this.loadBrands(); 
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

  loadProducts() {
    this.loading = true;
    this.productService.getAll().subscribe({
      next: (res) => {
        // res already contains the brandName from our .NET DTO
        this.products = res;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Fetch error:', err);
        this.loading = false;
      }
    });
  }

  openForm() {
    this.resetForm();
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
  }

  edit(item: Product) {
    this.isEditMode = true;
    this.selectedId = item.id;
    // Spread operator is a cleaner way to copy values
    this.product = { ...item };
    this.showForm = true;
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

    this.loading = true; // Show a spinner if you have one
    request.subscribe({
      next: () => {
        this.afterSave();
        // Optional: toast notification
      },
      error: (err) => {
        console.error('Save failed:', err);
        this.loading = false;
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
        this.productService.delete(id).subscribe(() => {
          this.loadProducts();
          Swal.fire('Deleted!', 'The product has been removed.', 'success');
        });
      }
    });
  }

  afterSave() {
    this.loadProducts();
    this.resetForm();
    this.showForm = false;
  }

  resetForm() {
    this.isEditMode = false;
    this.selectedId = null;
    this.product = this.getEmptyProduct();
  }
}