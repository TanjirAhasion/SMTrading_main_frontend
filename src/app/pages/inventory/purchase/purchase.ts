import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CreatePurchaseRequest, PurchaseService } from '../../../service/inventory/purchase.service';
import { Vendor, VendorService } from '../../../service/contacts/vendor.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../../service/item/product.service';
import { ActivatedRoute } from '@angular/router';
import { CashAccountDto, CashAccountService } from '../../../service/cash-management/cash-account.service';

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
  private cashAccountService = inject(CashAccountService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  vendors: Vendor[] = [];
  products: any[] = []; // Load your products here
  cashAccounts: CashAccountDto[] = [];
  vendorsLoading = false;
  vendorsLoadError = '';
  selectedVendor: Vendor | null = null;
  vendorDueAmount: number = 0; // In a real app, fetch this from a 'VendorBalance' API
  purchaseDate: string = new Date().toISOString().split('T')[0]; // Default to today  
  showConfirmation = false;

  // Main Request Object
  request: CreatePurchaseRequest = {
    vendorId: 0,
    subTotal: 0,
    discount: 0,
    totalAmount: 0,
    paidAmount: 0,
    cashAccountId: 0,
    paymentMethod: '',
    items: []
  };

  ngOnInit() {
    this.loadVendors();
    this.loadProducts();
    this.loadCashAccounts();
    this.addItem(); // Start with one empty row
  }

  get activeCashAccounts(): CashAccountDto[] {
    return this.cashAccounts.filter((item) => item.isActive);
  }

  get selectedCashAccount(): CashAccountDto | undefined {
    return this.cashAccounts.find((account) => account.id === Number(this.request.cashAccountId));
  }

  get selectedCashAccountBalance(): number {
    return Number(this.selectedCashAccount?.currentBalance) || 0;
  }

  get isPaidAmountOverCurrentBalance(): boolean {
    if (!this.request.cashAccountId || !this.request.paidAmount) return false;

    return Number(this.request.paidAmount) > this.selectedCashAccountBalance;
  }

  onCashAccountChange() {
    this.request.paymentMethod = this.selectedCashAccount?.name || '';
  }

  loadVendors() {
    this.vendorsLoading = true;
    this.vendorsLoadError = '';

    this.vendorService.getAll().subscribe({
      next: (data) => {
        this.vendors = Array.isArray(data) ? data : [];
        this.applyVendorFromQueryParam();
        this.vendorsLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading vendors', err);
        this.vendors = [];
        this.vendorsLoading = false;
        this.vendorsLoadError = 'Unable to load vendors.';
        this.cdr.detectChanges();
      }
    });
  }

  loadProducts() {
    this.productService.getAll().subscribe({
      next: (data) => {
        this.products = Array.isArray(data) ? data : [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading products', err);
        this.products = [];
        this.cdr.detectChanges();
      }
    });
  }

  loadCashAccounts() {
    this.cashAccountService.getAll().subscribe({
      next: (data) => {
        this.cashAccounts = Array.isArray(data) ? data : [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading cash accounts', err);
        this.cashAccounts = [];
        this.cdr.detectChanges();
      }
    });
  }

  onVendorChange() {
    this.selectedVendor = this.vendors.find(v => v.id == this.request.vendorId) || null;

    if (this.selectedVendor) {
      // Logic to fetch due amount from backend would go here
      // Example: this.vendorService.getBalance(this.selectedVendor.id).subscribe(...)
      this.vendorDueAmount = 1500.50; // Dummy data
    }
  }

  private applyVendorFromQueryParam() {
    const vendorId = Number(this.route.snapshot.queryParamMap.get('vendorId'));

    if (!vendorId) return;

    this.request.vendorId = vendorId;
    this.onVendorChange();
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

  onProductChange(index: number) {
    const selectedProductId = Number(this.request.items[index].productId);

    if (!selectedProductId) return;

    const duplicateIndex = this.request.items.findIndex((item, itemIndex) =>
      itemIndex !== index && Number(item.productId) === selectedProductId
    );

    if (duplicateIndex !== -1) {
      alert('This product is already added. Please update the quantity in the existing row.');
      this.request.items[index].productId = 0;
    }
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
    if (!this.isPurchaseValid()) {
      alert('Please select a vendor, cash account, and add products with quantity and unit cost greater than 0. Duplicate products are not allowed.');
      return;
    }

    if (this.isPaidAmountOverCurrentBalance) {
      alert(`Paid amount cannot be more than current balance ${this.selectedCashAccountBalance.toFixed(2)}.`);
      return;
    }

    this.showConfirmation = true;
  }

  getProductName(productId: number): string {
    const product = this.products.find(p => p.id == productId);
    return product ? product.name : 'Unknown Product';
  }
  // Triggered by the "Yes" button in the modal
  submitPurchase() {
    if (!this.isPurchaseValid()) {
      this.showConfirmation = false;
      alert('Purchase cannot be finalized with duplicate products, empty products, zero quantity, zero price, or missing cash account.');
      return;
    }

    if (this.isPaidAmountOverCurrentBalance) {
      this.showConfirmation = false;
      alert(`Paid amount cannot be more than current balance ${this.selectedCashAccountBalance.toFixed(2)}.`);
      return;
    }

    this.showConfirmation = false;
    this.onCashAccountChange();
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
      cashAccountId: 0,
      paymentMethod: '',
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

  isPurchaseValid(): boolean {
    if (!this.request.vendorId || !this.request.cashAccountId || this.request.items.length === 0) {
      return false;
    }

    if (this.isPaidAmountOverCurrentBalance) {
      return false;
    }

    const selectedProductIds = this.request.items.map((item) => Number(item.productId));
    const hasDuplicateProducts = selectedProductIds.some((productId, index) =>
      productId > 0 && selectedProductIds.indexOf(productId) !== index
    );

    if (hasDuplicateProducts) {
      return false;
    }

    return this.request.items.every((item) =>
      Number(item.productId) > 0
      && Number(item.quantity) > 0
      && Number(item.unitCost) > 0
    );
  }
}
