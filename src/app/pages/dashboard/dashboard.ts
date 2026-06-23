import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { CashAccountDto, CashAccountService } from '../../service/cash-management/cash-account.service';
import { ExpenseDto, ExpenseService } from '../../service/cash-management/expense.service';
import { Product, ProductService } from '../../service/item/product.service';
import { InvoiceService, PagedResult as SalesPagedResult, SaleItem } from '../../service/inventory/invoice-list.service';
import { PagedResult as RentalPagedResult, RentalContractStatus, RentalItem, RentalListService } from '../../service/inventory/rental-list.service';
import { PagedResult as PurchasePagedResult, PurchaseItem, PurchaseListService } from '../../service/inventory/purchase-list.service';

interface DashboardMetric {
  title: string;
  value: string;
  note: string;
  icon: string;
  tone: string;
  route: string;
}

interface DailyCashFlowItem {
  label: string;
  details: string;
  type: 'balance' | 'in' | 'out';
  amount: number;
}

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private invoiceService = inject(InvoiceService);
  private expenseService = inject(ExpenseService);
  private productService = inject(ProductService);
  private rentalService = inject(RentalListService);
  private purchaseService = inject(PurchaseListService);
  private cashAccountService = inject(CashAccountService);
  private cdr = inject(ChangeDetectorRef);

  loading = false;
  loadError = '';
  todayLabel = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  todaySales: SaleItem[] = [];
  recentSales: SaleItem[] = [];
  expenses: ExpenseDto[] = [];
  products: Product[] = [];
  rentals: RentalItem[] = [];
  todayPurchases: PurchaseItem[] = [];
  cashAccounts: CashAccountDto[] = [];

  ngOnInit(): void {
    this.loadDashboard();
  }

  get metrics(): DashboardMetric[] {
    return [
      {
        title: 'Today Sales',
        value: this.currency(this.todaySalesAmount),
        note: `${this.todaySales.length} invoice${this.todaySales.length === 1 ? '' : 's'} today`,
        icon: 'fas fa-shopping-cart',
        tone: 'info',
        route: '/inventory/invoicelist'
      },
      {
        title: 'Today Expense',
        value: this.currency(this.todayExpenseAmount),
        note: `${this.todayExpenseCount} expense entr${this.todayExpenseCount === 1 ? 'y' : 'ies'}`,
        icon: 'fas fa-receipt',
        tone: 'danger',
        route: '/cash-management/expense'
      },
      {
        title: 'Customer Due',
        value: this.currency(this.customerDueAmount),
        note: `${this.customerDueInvoices.length} unpaid sale invoice${this.customerDueInvoices.length === 1 ? '' : 's'}`,
        icon: 'fas fa-hand-holding-usd',
        tone: 'warning',
        route: '/inventory/invoicelist'
      },
      {
        title: 'Rental Due',
        value: this.currency(this.rentalDueAmount),
        note: `${this.dueRentals.length} rental${this.dueRentals.length === 1 ? '' : 's'} due for billing`,
        icon: 'fas fa-file-invoice-dollar',
        tone: 'primary',
        route: '/inventory/rentallist'
      }
    ];
  }

  get todaySalesAmount(): number {
    return this.todaySales.reduce((sum, item) => sum + this.getSaleTotal(item), 0);
  }

  get todayCollectionAmount(): number {
    return this.todaySales.reduce((sum, item) => sum + this.toNumber(item.paidAmount), 0);
  }

  get todayExpenseAmount(): number {
    return this.expenses
      .filter((item) => this.isSameDay(item.expenseDate, new Date()))
      .reduce((sum, item) => sum + this.toNumber(item.amount), 0);
  }

  get todayExpenseCount(): number {
    return this.expenses.filter((item) => this.isSameDay(item.expenseDate, new Date())).length;
  }

  get todayPurchasePaymentAmount(): number {
    return this.todayPurchases.reduce((sum, item) => sum + this.getPurchasePaid(item), 0);
  }

  get todayRentalContracts(): RentalItem[] {
    return this.rentals.filter((item) => this.isSameDay(item.startDate, new Date()));
  }

  get todayRentCollectionAmount(): number {
    return this.todayRentalContracts.reduce((sum, item) => sum + this.toNumber(item.totalRent), 0);
  }

  get todaySecurityDepositAmount(): number {
    return this.todayRentalContracts.reduce((sum, item) => sum + this.toNumber(item.securityDeposit), 0);
  }

  get todayCashInAmount(): number {
    return this.todayCollectionAmount + this.todayRentCollectionAmount + this.todaySecurityDepositAmount;
  }

  get todayCashOutAmount(): number {
    return this.todayPurchasePaymentAmount + this.todayExpenseAmount;
  }

  get previousDayCashBalance(): number {
    return this.cashBalance - this.todayCashInAmount + this.todayCashOutAmount;
  }

  get dailyCashFlow(): DailyCashFlowItem[] {
    return [
      {
        label: 'Opening Cash',
        details: 'Cash from last day',
        type: 'balance',
        amount: this.previousDayCashBalance
      },
      {
        label: 'Sales Collection',
        details: `${this.todaySales.length} sale invoice${this.todaySales.length === 1 ? '' : 's'}`,
        type: 'in',
        amount: this.todayCollectionAmount
      },
      {
        label: 'Rental Money',
        details: `${this.todayRentalContracts.length} rental contract${this.todayRentalContracts.length === 1 ? '' : 's'}`,
        type: 'in',
        amount: this.todayRentCollectionAmount
      },
      {
        label: 'Security Deposit',
        details: 'Rental deposit received today',
        type: 'in',
        amount: this.todaySecurityDepositAmount
      },
      {
        label: 'Purchase Payment',
        details: `${this.todayPurchases.length} purchase invoice${this.todayPurchases.length === 1 ? '' : 's'}`,
        type: 'out',
        amount: this.todayPurchasePaymentAmount
      },
      {
        label: 'Expense',
        details: `${this.todayExpenseCount} expense entr${this.todayExpenseCount === 1 ? 'y' : 'ies'}`,
        type: 'out',
        amount: this.todayExpenseAmount
      },
      {
        label: 'Current Cash',
        details: `${this.cashAccounts.filter((item) => item.isActive).length} active cash account${this.cashAccounts.filter((item) => item.isActive).length === 1 ? '' : 's'}`,
        type: 'balance',
        amount: this.cashBalance
      }
    ];
  }

  get netTodayAmount(): number {
    return this.todayCashInAmount - this.todayCashOutAmount;
  }

  get customerDueInvoices(): SaleItem[] {
    return this.recentSales
      .filter((item) => this.getSaleDue(item) > 0)
      .sort((a, b) => this.getSaleDue(b) - this.getSaleDue(a));
  }

  get customerDueAmount(): number {
    return this.customerDueInvoices.reduce((sum, item) => sum + this.getSaleDue(item), 0);
  }

  get lowStockProducts(): Product[] {
    return this.products
      .filter((item) => this.toNumber(item.inStock) <= this.toNumber(item.lowStockThreshold))
      .sort((a, b) => this.toNumber(a.inStock) - this.toNumber(b.inStock));
  }

  get stockSummary(): { totalStock: number; totalRent: number; activeProducts: number } {
    return {
      totalStock: this.products.reduce((sum, item) => sum + this.toNumber(item.inStock), 0),
      totalRent: this.products.reduce((sum, item) => sum + this.toNumber(item.inRent), 0),
      activeProducts: this.products.filter((item) => item.isActive).length
    };
  }

  get dueRentals(): RentalItem[] {
    const today = this.startOfDay(new Date()).getTime();

    return this.rentals
      .filter((item) => this.isRentalActive(item))
      .filter((item) => item.nextBillingDate && this.startOfDay(item.nextBillingDate).getTime() <= today)
      .sort((a, b) => this.startOfDay(a.nextBillingDate).getTime() - this.startOfDay(b.nextBillingDate).getTime());
  }

  get rentalDueAmount(): number {
    return this.dueRentals.reduce((sum, item) => sum + this.getRentalAmount(item), 0);
  }

  get activeRentalsCount(): number {
    return this.rentals.filter((item) => this.isRentalActive(item)).length;
  }

  get cashBalance(): number {
    return this.cashAccounts
      .filter((item) => item.isActive)
      .reduce((sum, item) => sum + this.toNumber(item.currentBalance), 0);
  }

  get latestSales(): SaleItem[] {
    return [...this.recentSales]
      .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime())
      .slice(0, 5);
  }

  loadDashboard(): void {
    this.loading = true;
    this.loadError = '';

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    forkJoin({
      todaySales: this.invoiceService.GetAllBySearchWithPagination({
        startDate: this.toDateInputValue(today),
        endDate: this.toDateInputValue(tomorrow),
        pageNumber: 1,
        pageSize: 500
      }).pipe(catchError(() => of({ items: [], totalCount: 0 } as SalesPagedResult<SaleItem>))),
      recentSales: this.invoiceService.GetAllBySearchWithPagination({
        pageNumber: 1,
        pageSize: 500
      }).pipe(catchError(() => of({ items: [], totalCount: 0 } as SalesPagedResult<SaleItem>))),
      expenses: this.expenseService.getAll().pipe(catchError(() => of([] as ExpenseDto[]))),
      todayPurchases: this.purchaseService.GetAllBySearchWithPagination({
        startDate: this.toDateInputValue(today),
        endDate: this.toDateInputValue(tomorrow),
        pageNumber: 1,
        pageSize: 500
      }).pipe(catchError(() => of({ items: [], totalCount: 0 } as PurchasePagedResult<PurchaseItem>))),
      products: this.productService.getWithStock(1, 500).pipe(catchError(() => of({ items: [], totalCount: 0 }))),
      rentals: this.rentalService.GetAllBySearchWithPagination({
        pageNumber: 1,
        pageSize: 500
      }).pipe(catchError(() => of({ items: [], totalCount: 0 } as RentalPagedResult<RentalItem>))),
      cashAccounts: this.cashAccountService.getAll().pipe(catchError(() => of([] as CashAccountDto[])))
    }).subscribe({
      next: ({ todaySales, recentSales, expenses, todayPurchases, products, rentals, cashAccounts }) => {
        this.todaySales = todaySales.items || [];
        this.recentSales = recentSales.items || [];
        this.expenses = expenses || [];
        this.todayPurchases = todayPurchases.items || [];
        this.products = products.items || [];
        this.rentals = rentals.items || [];
        this.cashAccounts = cashAccounts || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Dashboard load failed', err);
        this.loading = false;
        this.loadError = 'Unable to load dashboard data.';
        this.cdr.detectChanges();
      }
    });
  }

  getSaleCustomerName(item: SaleItem): string {
    if (item.customerFullName) {
      return item.companyName ? `${item.customerFullName} (${item.companyName})` : item.customerFullName;
    }

    const name = `${item.firstName || ''} ${item.lastName || ''}`.trim();
    return item.companyName ? `${name} (${item.companyName})` : name || '-';
  }

  getRentalCustomerName(item: RentalItem): string {
    if (item.customerFullName) {
      return item.companyName ? `${item.customerFullName} (${item.companyName})` : item.customerFullName;
    }

    const name = `${item.firstName || ''} ${item.lastName || ''}`.trim();
    return item.companyName ? `${name} (${item.companyName})` : name || '-';
  }

  getRentalNumber(item: RentalItem): string {
    return item.contractNumber || item.rentalNumber || `RC-${item.id}`;
  }

  getSaleTotal(item: SaleItem): number {
    const totalAmount = this.toNumber(item.totalAmount);
    if (totalAmount > 0) return totalAmount;

    return Math.max(this.toNumber(item.subTotal) - this.toNumber(item.discount), 0);
  }

  getSaleDue(item: SaleItem): number {
    return Math.max(this.getSaleTotal(item) - this.toNumber(item.paidAmount), 0);
  }

  getRentalAmount(item: RentalItem): number {
    return this.toNumber(item.totalAmount) || this.toNumber(item.totalRent);
  }

  getPurchasePaid(item: PurchaseItem): number {
    return this.toNumber(item.paidAmount ?? item.amount);
  }

  getFlowAmountClass(item: DailyCashFlowItem): string {
    if (item.type === 'in') return 'text-success';
    if (item.type === 'out') return 'text-danger';
    return item.amount >= 0 ? 'text-dark' : 'text-danger';
  }

  getFlowSignedAmount(item: DailyCashFlowItem): string {
    if (item.type === 'in') return `+${this.currency(item.amount)}`;
    if (item.type === 'out') return `-${this.currency(item.amount)}`;

    return this.currency(item.amount);
  }

  getStockPercent(item: Product): number {
    const threshold = Math.max(this.toNumber(item.lowStockThreshold), 1);
    const stock = this.toNumber(item.inStock);
    return Math.max(0, Math.min(100, Math.round((stock / threshold) * 100)));
  }

  getDateText(value: string | Date | undefined | null): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';

    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  currency(value: number): string {
    return `${this.toNumber(value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} Tk`;
  }

  private isRentalActive(item: RentalItem): boolean {
    if (typeof item.status === 'number') return item.status === RentalContractStatus.Active;
    if (typeof item.status === 'string') return item.status.toLowerCase() === 'active';

    return item.isActive;
  }

  private isSameDay(value: string | Date, date: Date): boolean {
    return this.toDateInputValue(value) === this.toDateInputValue(date);
  }

  private startOfDay(value: string | Date | undefined | null): Date {
    const date = value ? new Date(value) : new Date();
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private toDateInputValue(value: string | Date): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private toNumber(value: unknown): number {
    return Number(value) || 0;
  }
}
