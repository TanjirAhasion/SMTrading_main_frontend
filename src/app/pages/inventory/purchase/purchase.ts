import { Component, inject, OnInit } from '@angular/core';
import { CreatePurchaseRequest, PurchaseService } from '../../../service/inventory/purchase.service';
import { Vendor, VendorService } from '../../../service/contacts/vendor.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductComponent } from '../../item/product/product';
import { ProductService } from '../../../service/item/product.service';

@Component({
  selector: 'app-purchase',
  imports: [CommonModule, FormsModule],
  templateUrl: './purchase.html',
  styleUrl: './purchase.css',
})
export class PurchaseComponent implements OnInit {
  private purchaseService = inject(PurchaseService);
  private vendorService = inject(VendorService);
  private productService = inject(ProductService);

  vendors: Vendor[] = [];
  products: any[] = []; // Load your products here
  selectedVendor: Vendor | null = null;
  vendorDueAmount: number = 0; // In a real app, fetch this from a 'VendorBalance' API
  purchaseDate: string = new Date().toISOString().split('T')[0]; // Default to today  
  showConfirmation = false;

  paymentMethods = [
  { id: 'Cash', name: 'Cash', icon: 'fa-money-bill-wave' },
  { id: 'Bank', name: 'Bank/Transfer', icon: 'fa-university' }
];

  // Main Request Object
  request: CreatePurchaseRequest = {
    vendorId: 0,
    subTotal: 0,
    discount: 0,
    totalAmount: 0,
    paidAmount: 0,
    paymentMethod: 'Cash', // Default payment method
    items: []
  };

  ngOnInit() {
    this.vendorService.getAll().subscribe(data => this.vendors = data);
    this.productService.getAll().subscribe(data => this.products = data);
    this.addItem(); // Start with one empty row
  }

  onVendorChange() {
    this.selectedVendor = this.vendors.find(v => v.id == this.request.vendorId) || null;

    if (this.selectedVendor) {
      // Logic to fetch due amount from backend would go here
      // Example: this.vendorService.getBalance(this.selectedVendor.id).subscribe(...)
      this.vendorDueAmount = 1500.50; // Dummy data
    }
  }

  addItem() {
    this.request.items.push({
      productId: 0,
      quantity: 1,
      unitCost: 0,
      discount: 0,
      productSerialNumber: []
    });
  }

  removeItem(index: number) {
    this.request.items.splice(index, 1);
    this.calculateTotals();
  }

  calculateTotals() {
    let sub = 0;
    this.request.items.forEach(item => {
      sub += (item.quantity * item.unitCost);
    });

    this.request.subTotal = sub;
    this.request.totalAmount = this.request.subTotal - this.request.discount;
  }

  // Triggered by the main button
  openConfirmation() {
    this.showConfirmation = true;
  }

  getProductName(productId: number): string {
    const product = this.products.find(p => p.id == productId);
    return product ? product.name : 'Unknown Product';
}
  // Triggered by the "Yes" button in the modal
  submitPurchase() {
    this.showConfirmation = false;
    //this.loading = true;

    this.purchaseService.createPurchase(this.request).subscribe({
      next: (id) => {
        alert(`Purchase Order #${id} created successfully!`);
        this.resetForm();
      },
      error: (err) => {
        console.error(err);
        //this.loading = false;
      }
    });
  }

  resetForm(): void {
    // 1. Reset the main request object to initial state
    this.request = {
      vendorId: 0,
      subTotal: 0,
      discount: 0,
      totalAmount: 0,
      paidAmount: 0,
      paymentMethod: 'Cash', // Reset to default
      items: []
    };

    // 2. Clear local helper properties
    this.selectedVendor = null;
    this.vendorDueAmount = 0;
    this.showConfirmation = false;

    // 3. Reset the date to today
    this.purchaseDate = new Date().toISOString().split('T')[0];

    // 4. Start with one fresh empty row for the user
    this.addItem();

    // 5. If you are using Angular's NgForm in the template, 
    // you might want to reset the validation states as well.
    // Example: this.myNgForm.resetForm();
  }
}
