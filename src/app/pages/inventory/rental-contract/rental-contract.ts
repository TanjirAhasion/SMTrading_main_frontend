import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  CreateRentalContractRequest,
  RentalContractService
} from '../../../service/inventory/rental-contract.service';

import {
  Customer,
  CustomerService
} from '../../../service/contacts/customer.service';

import { ProductService } from '../../../service/item/product.service';
import { ProductSerialService } from '../../../service/item/product-serial.service';
import { CashAccountDto, CashAccountService } from '../../../service/cash-management/cash-account.service';

@Component({
  selector: 'app-rental-contract',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rental-contract.html',
  styleUrl: './rental-contract.css'
})

export class RentalContractComponent implements OnInit {

  // SERVICES
  private rentalService = inject(RentalContractService);
  private customerService = inject(CustomerService);
  private productService = inject(ProductService);
  private productSerialService = inject(ProductSerialService);
  private cashAccountService = inject(CashAccountService);
  private cdr = inject(ChangeDetectorRef);

  // DATA
  customers: Customer[] = [];
  products: any[] = [];
  cashAccounts: CashAccountDto[] = [];

  selectedCustomer: Customer | null = null;
  customerDueAmount: number = 0;
  
  loadingCustomers = false;

  contractDate =
    new Date().toISOString().split('T')[0];

  // MODAL
  serialModalOpen = false;

  serialSearch = '';

  serials: any[] = [];

  selectedSerials: any[] = [];

  // CONFIRM
  showConfirmation = false;

  // BILLING
  billingCycles = [
    { id: 1, name: 'Monthly' },
    { id: 2, name: 'Yearly' }
  ];

  // REQUEST
  request: CreateRentalContractRequest = {
    customerId: 0,
    startDate: '',
    endDate: null,
    securityDeposit: 0,
    billingCycle: 1,
    note: '',
    cashAccountId: 0,
    paymentMethod: '',
    items: []
  };

  // INIT
  ngOnInit(): void {

    this.request.startDate =
      new Date().toISOString().split('T')[0];

    this.loadCustomers();
    this.loadCashAccounts();

    this.productService
      .getAll()
      .subscribe(res => {

        this.products = res;

      });
  }

  get activeCashAccounts(): CashAccountDto[] {
    return this.cashAccounts.filter((item) => item.isActive);
  }

  get selectedCashAccount(): CashAccountDto | undefined {
    return this.cashAccounts.find((account) => account.id === Number(this.request.cashAccountId));
  }

  get totalDueWithCurrentRent(): number {
    return Math.max(0, Number(this.customerDueAmount) + Number(this.totalRent));
  }

  get availableSerials(): any[] {
    return this.serials.filter(serial =>
      !this.selectedSerials.some(selected => selected.serialNumber === serial.serialNumber));
  }

  onCashAccountChange() {
    this.request.paymentMethod = this.selectedCashAccount?.name || '';
  }

  // CUSTOMER
  loadCustomers() {

    this.loadingCustomers = true;

    this.customerService
      .getAll()
      .subscribe({
        next: (res) => {

          this.customers = res;

          this.loadingCustomers = false;

          this.cdr.detectChanges();
        },
        error: () => {

          this.loadingCustomers = false;
        }
      });
  }

  loadCashAccounts() {

    this.cashAccountService
      .getAll()
      .subscribe({
        next: (res) => {

          this.cashAccounts = Array.isArray(res) ? res : [];

          this.cdr.detectChanges();
        },
        error: (err) => {

          console.error('Error loading cash accounts', err);

          this.cashAccounts = [];

          this.cdr.detectChanges();
        }
      });
  }

  onCustomerChange(customerId: number) {

    this.request.customerId = Number(customerId);

    this.selectedCustomer =
      this.customers.find(x =>
        x.id === this.request.customerId) || null;

    this.customerDueAmount = Number(this.selectedCustomer?.dueAmount) || 0;

    if (this.selectedCustomer) {
      this.customerService.getById(this.selectedCustomer.id).subscribe({
        next: (customer) => {
          this.selectedCustomer = customer;
          this.customerDueAmount = Number(customer?.dueAmount) || 0;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error loading customer balance', err);
        }
      });
    }
  }

  // MODAL
  openSerialModal() {

    this.serialModalOpen = true;
    this.loadSerials();
  }

  closeSerialModal() {

    this.serialModalOpen = false;

    this.serialSearch = '';

    this.serials = [];
  }

  // SEARCH
  loadSerials() {
    const search = this.serialSearch.trim();
    if (search.length > 0 && search.length < 3) {
      this.serials = [];
      return;
    }

    this.productSerialService
      .getSerials(1, 10, search, 1)
      .subscribe((res: any) => {
        this.serials = res.items || [];
        this.cdr.detectChanges();
      });
  }

  onSearchChange(value: string) {
    this.serialSearch = value;
    const search = value.trim();

    if (!search) {
      this.loadSerials();
      return;
    }

    if (search.length < 3) {

      this.serials = [];

      return;
    }

    this.productSerialService
      .getSerials(1, 10, search, 1)
      .subscribe((res: any) => {

        this.serials = res.items || [];

      });
  }

  // ADD SERIAL
  addSerial(serial: any) {

    const exists =
      this.selectedSerials.some(x =>
        x.serialNumber === serial.serialNumber);

    if (exists) {
      return;
    }

    this.selectedSerials.push(this.normalizeSerial(serial));

    this.buildGroupedItems();

    this.serialSearch = '';

    this.loadSerials();
  }

  // REMOVE SERIAL
  removeSerial(serial: any) {

    this.selectedSerials =
      this.selectedSerials.filter(x =>
        x.serialNumber !== serial.serialNumber);

    this.buildGroupedItems();
  }

  // GROUP PRODUCTS
  buildGroupedItems() {

    const grouped: any[] = [];

    this.selectedSerials.forEach(serial => {

      let existing =
        grouped.find(x =>
          x.productId === serial.productId);

      if (existing) {

        existing.quantity++;

        existing.serialNumbers.push(
          serial.serialNumber);

      }
      else {

        grouped.push({

          productId: serial.productId,

          productName: serial.productName,

          brand: serial.brandName || serial.brand,

          model: serial.model,

          quantity: 1,

          rent: Number(serial.rentalCost) || 0,

          serialNumbers: [
            serial.serialNumber
          ]
        });
      }
    });

    // PRESERVE RENT
    grouped.forEach(g => {

      const old =
        this.request.items.find(x =>
          x.productId === g.productId);

      if (old) {
        g.rent = old.rent;
      }

    });

    this.request.items = grouped;
  }

  private normalizeSerial(serial: any): any {
    return {
      ...serial,
      productName: serial.productName || this.getProductName(serial.productId),
      brandName: serial.brandName || serial.brand || '',
      model: serial.model || '',
      rentalCost: Number(serial.rentalCost) || 0
    };
  }

  private getProductName(productId: number): string {
    const product = this.products.find(item => Number(item.id) === Number(productId));
    return product?.name || 'Unknown Product';
  }

  // TOTAL RENT
  get totalRent(): number {

    let total = 0;

    this.request.items.forEach(x => {

      total +=
        (Number(x.rent) || 0)
        *
        (Number(x.quantity) || 0);

    });

    return total;
  }

  // REMOVE PRODUCT
  removeItem(index: number) {

    const item = this.request.items[index];

    this.selectedSerials =
      this.selectedSerials.filter(x =>
        x.productId !== item.productId);

    this.buildGroupedItems();
  }

  // CONFIRM
  openConfirmation() {

    if (this.request.items.length === 0) {
      alert('No rental machine selected');
      return;
    }

    if (!this.request.cashAccountId) {
      alert('Please select a cash account.');
      return;
    }

    this.showConfirmation = true;
  }

  // SUBMIT
  submitContract() {
    this.onCashAccountChange();

    const payload: CreateRentalContractRequest = {
      ...this.request,
      customerId: Number(this.request.customerId),
      startDate: this.request.startDate,
      endDate: this.request.endDate || null,
      billingCycle: Number(this.request.billingCycle),
      securityDeposit: Number(this.request.securityDeposit) || 0,
      cashAccountId: Number(this.request.cashAccountId),
      items: this.request.items.map((item) => ({
        productId: Number(item.productId),
        productName: item.productName,
        quantity: Number(item.quantity) || 0,
        rent: Number(item.rent) || 0,
        serialNumbers: item.serialNumbers
          .map((serial) => String(serial).trim())
          .filter(Boolean)
      }))
    };

    this.rentalService
      .createRentalContract(payload)
      .subscribe({
        next: () => {

          alert('Rental contract created');

          this.loadCustomers();
          this.loadCashAccounts();
          this.resetForm();
        },
        error: (err) => {

          console.error(err);

          alert(
            err.error?.message ||
            'Failed to create contract'
          );
        }
      });
  }

  // RESET
  resetForm() {

    this.request = {
      customerId: 0,
      startDate: new Date().toISOString().split('T')[0],
      endDate: null,
      securityDeposit: 0,
      billingCycle: 1,
      note: '',
      cashAccountId: 0,
      paymentMethod: '',
      items: []
    };

    this.selectedSerials = [];

    this.selectedCustomer = null;
    this.customerDueAmount = 0;

    this.showConfirmation = false;
  }
}
