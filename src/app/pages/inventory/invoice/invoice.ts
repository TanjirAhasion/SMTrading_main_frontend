import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CreateInvoiceRequest, InvoiceService } from '../../../service/inventory/invoice.service';
import { Customer, CustomerService } from '../../../service/contacts/customer.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../../service/item/product.service';
import { ProductSerialService } from '../../../service/item/product-serial.service';
import { CashAccountDto, CashAccountService } from '../../../service/cash-management/cash-account.service';

@Component({
  selector: 'app-invoice',
  imports: [CommonModule, FormsModule],
  templateUrl: './invoice.html',
  styleUrl: './invoice.css',
})
export class InvoiceComponent implements OnInit {

  // =========================
  // SERVICES
  // =========================
  private invoiceService = inject(InvoiceService);
  private customerService = inject(CustomerService);
  private productService = inject(ProductService);
  private productSerialService = inject(ProductSerialService);
  private cashAccountService = inject(CashAccountService);
  private cdr = inject(ChangeDetectorRef);
  // =========================
  // DATA
  // =========================
  customers: Customer[] = [];
  products: any[] = [];
  cashAccounts: CashAccountDto[] = [];
  selectedProduct: any = null;

  selectedCustomer: Customer | null = null;
  customerDueAmount: number = 0; // In a real app, fetch this from a 'CustomerBalance' API

  saleDate: string = new Date().toISOString().split('T')[0];
  showConfirmation = false;

  // =========================
  // MAIN REQUEST (UNCHANGED)
  // =========================
  request: CreateInvoiceRequest = {
    customerId: 0,
    subTotal: 0,
    discount: 0,
    totalAmount: 0,
    paidAmount: 0,
    cashAccountId: 0,
    paymentMethod: '',
    items: []
  };

  // =========================
  // SERIAL MODAL (NEW ADDITION)
  // =========================
  serialModalOpen = false;
  serials: any[] = [];
  selectedSerials: any[] = [];
  serialSearch: string = '';

  // =========================
  // INIT
  // =========================
  ngOnInit() {
    this.loadCustomers();
    this.loadCashAccounts();
    this.productService.getAll().subscribe(data => this.products = data);

    //this.addItem();
  }

  // =========================
  // CUSTOMER
  // =========================
  loadingCustomers = true;

  get activeCashAccounts(): CashAccountDto[] {
    return this.cashAccounts.filter((item) => item.isActive);
  }

  get selectedCashAccount(): CashAccountDto | undefined {
    return this.cashAccounts.find((account) => account.id === Number(this.request.cashAccountId));
  }

  onCashAccountChange() {
    this.request.paymentMethod = this.selectedCashAccount?.name || '';
  }

  loadCustomers() {
  this.loadingCustomers = true;

  this.customerService.getAll().subscribe({
    next: (data) => {
      this.customers = data;
      this.loadingCustomers = false;
       this.cdr.detectChanges();
    },
    error: () => {
      this.loadingCustomers = false;
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

onCustomerChange(customerId: any) {
  const id = Number(customerId);

  this.request.customerId = id;

  this.selectedCustomer =
    this.customers.find(c => c.id === id) || null;

  this.customerDueAmount = this.selectedCustomer ? 500 : 0;
}

  // =========================
  // EXISTING ITEM SYSTEM (KEPT)
  // =========================
  addItem() {
    this.request.items.push({
      productId: 0,
      productName: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      serialNumbers: []
    });
  }

  removeItem(index: number) {

    const removedItem = this.request.items[index];

    // remove item
    this.request.items.splice(index, 1);

    // 🔥 also remove from selectedSerials
    this.selectedSerials = this.selectedSerials.filter(s =>
      s.productId !== removedItem.productId
    );

    this.calculateTotals();
  }

  // =========================
  // SERIAL MODAL (NEW)
  // =========================


  openSerialModal() {
    this.serialModalOpen = true;
    this.loadSerials();
    this.buildSelectedSerialsFromRequest();
  }

  closeSerialModal() {
    this.serialModalOpen = false;
    this.selectedSerials = [];
  }

  buildSelectedSerialsFromRequest() {
    this.selectedSerials = [];

    this.request.items.forEach(item => {
      if (item.serialNumbers && item.serialNumbers.length > 0) {
        item.serialNumbers.forEach((serialNo: string) => {
          this.selectedProduct = this.products.find(p => p.id === item.productId);
          this.selectedSerials.push({
            serialNumber: serialNo,
            productId: item.productId,
            productName: this.selectedProduct ? this.selectedProduct.name : 'Unknown',
            brand: this.selectedProduct ? this.selectedProduct.brand : 'Unknown',
            model: this.selectedProduct ? this.selectedProduct.model : 'Unknown',
            sellingCost: item.unitPrice
          });

        });
      }
    });
  }

  loadSerials() {
    if (!this.serialSearch || this.serialSearch.length < 3) {
      this.serials = []; // optional: clear list
      return;
    }
    this.productSerialService.getSerials(1, 50, this.serialSearch)
      .subscribe({
        next: (res) => {
          this.serials = res.items || [];
          this.cdr.detectChanges();
        },
        error: (err) => console.error(err)
      });
  }

  onSearchChange(value: string) {
    this.serialSearch = value;

    if (!value || value.length < 3) {
      this.serials = [];
      return;
    }

    this.productSerialService.getSerials(1, 20, value)
      .subscribe(res => {
        this.serials = res.items || [];
        this.cdr.detectChanges();

      });
  }

  toggleSerial(serial: any) {
    const index = this.selectedSerials.findIndex(x => x.id === serial.id);

    if (index > -1) {
      this.selectedSerials.splice(index, 1);
    } else {
      this.selectedSerials.push(serial);
    }
  }

  isSelected(serial: any): boolean {
    return this.selectedSerials.some(x => x.id === serial.id);
  }

  // =========================
  // APPLY SERIALS → AUTO BUILD ITEMS (CORE LOGIC)
  // =========================
  addSerial(serial: any) {

    const exists = this.selectedSerials
      .some(s => s.serialNumber === serial.serialNumber);

    if (exists) return; // 🚫 already added

    this.selectedSerials.push(serial);

    this.serialSearch = '';
    this.serials = [];
  }

  removeSerial(serial: any) {
    this.selectedSerials =
      this.selectedSerials.filter(s => s.id !== serial.id);
  }

  applySerials() {

    // 🔥 reset items first
    this.request.items = [];

    this.selectedSerials.forEach(serial => {
          this.selectedProduct = this.products.find(p => p.id === serial.productId);

      let item = this.request.items
        .find(i => i.productId === serial.productId);

      if (item) {
        item.quantity += 1;
        item.serialNumbers.push(serial.serialNumber);
      } else {
        this.request.items.push({

          productId: serial.productId,
          productName: this.selectedProduct ? this.selectedProduct.name : 'Unknown',
          brand: this.selectedProduct ? this.selectedProduct.brand : 'Unknown',
          model: this.selectedProduct ? this.selectedProduct.model : 'Unknown',
          quantity: 1,
          unitPrice: serial.sellingCost || serial.purchaseCost,
          discount: 0,
          serialNumbers: [serial.serialNumber]
        });
      }

    });

    this.calculateTotals();
    this.closeSerialModal();
  }
  // =========================
  // CALCULATIONS (KEPT)
  // =========================
  calculateTotals() {
    let sub = 0;

    this.request.items.forEach(item => {
      sub += (item.quantity * item.unitPrice);
    });

    this.request.subTotal = sub;
    this.request.totalAmount = this.request.subTotal - this.request.discount;
  }

  // =========================
  // CONFIRMATION
  // =========================
  openConfirmation() {
    if (!this.request.cashAccountId) {
      alert('Please select a cash account.');
      return;
    }

      for (let item of this.request.items) {
      if ((item.serialNumbers?.length || 0) !== item.quantity) {
        alert(`Serial mismatch in ${this.getProductName(item.productId)}`);
        return;
      }
    }

    this.showConfirmation = true
  }

  submitSale() {
    this.showConfirmation = false;
    this.onCashAccountChange();

    this.invoiceService.createInvoice(this.request).subscribe({
      next: (id) => {
        alert(`Invoice #${id} created successfully!`);
        this.resetForm();
      },
      error: (err) => console.error(err)
    });
  }

  // =========================
  // RESET (KEPT + SAFE)
  // =========================
  resetForm(): void {

    this.request = {
      customerId: 0,
      subTotal: 0,
      discount: 0,
      totalAmount: 0,
      paidAmount: 0,
      cashAccountId: 0,
      paymentMethod: '',
      items: []
    };

    this.selectedCustomer = null;
    this.customerDueAmount = 0;
    this.showConfirmation = false;
    this.saleDate = new Date().toISOString().split('T')[0];

    this.selectedSerials = [];
    this.serialModalOpen = false;

    this.addItem();
  }

  // =========================
  // UTIL
  // =========================


  getProductName(productId: number): string {
    const product = this.products.find(p => p.id == productId);
    return product ? product.name : 'Unknown Product';
  }

  
}
