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
  customerDueAmount: number = 0; // In a real app, fetch this from a 'CustomerBalance' API
  
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
    endDate: '',
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

    this.customerDueAmount = this.selectedCustomer ? 500 : 0;
  }

  // MODAL
  openSerialModal() {

    this.serialModalOpen = true;
  }

  closeSerialModal() {

    this.serialModalOpen = false;

    this.serialSearch = '';

    this.serials = [];
  }

  // SEARCH
  onSearchChange(value: string) {

    if (!value || value.length < 2) {

      this.serials = [];

      return;
    }

    this.productSerialService
      .getSerials(1, 20, value, 1)
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

    this.selectedSerials.push(serial);

    this.buildGroupedItems();

    this.serialSearch = '';

    this.serials = [];
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

          brand: serial.brand,

          model: serial.model,

          quantity: 1,

          rent: 0,

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

    this.rentalService
      .createRentalContract(this.request)
      .subscribe({
        next: () => {

          alert('Rental contract created');

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
      endDate: '',
      securityDeposit: 0,
      billingCycle: 1,
      note: '',
      cashAccountId: 0,
      paymentMethod: '',
      items: []
    };

    this.selectedSerials = [];

    this.selectedCustomer = null;

    this.showConfirmation = false;
  }
}
