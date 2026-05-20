import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { Dashboard } from './pages/dashboard/dashboard';
import { Layout } from './pages/shared/layout/layout';
import { Brand } from './pages/item/brand/brand';
import { ProductComponent } from './pages/item/product/product';
import { ProductSerialComponent } from './pages/item/product-serial/product-serial';
import { VendorComponent } from './pages/contacts/vendor/vendor';
import { CustomerComponent } from './pages/contacts/customer/customer';
import { PurchaseComponent } from './pages/inventory/purchase/purchase';
import { InvoiceComponent } from './pages/inventory/invoice/invoice';
import { PurchaseListComponent } from './pages/inventory/purchase-list/purchase-list';
import { InvoiceListComponent } from './pages/inventory/invoce-list/invoce-list';
import { Rental } from './pages/inventory/rental/rental';
import { RentalContractComponent } from './pages/inventory/rental-contract/rental-contract';
import { RentalList } from './pages/inventory/rental-list/rental-list';
import { CashAccount } from './pages/cashManagement/cash-account/cash-account';
import { ExpenseCategory } from './pages/cashManagement/expense-category/expense-category';
import { Expense } from './pages/cashManagement/expense/expense';
import { ChequePrint } from './pages/cashManagement/cheque-print/cheque-print';

export const routes: Routes = [

  // 🔓 Public route
  {
    path: 'login',
    component: LoginComponent
  },

  // 🔁 Default redirect
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },

  // 🔒 Protected layout routes
  {
    path: '',
    component: Layout,
    children: [
      {
        path: 'dashboard',
        component: Dashboard,
        title: 'SM Treading Dashboard'
      },
      {
        path: 'item/brand',
        component: Brand,
        title: 'Machine Brand'
      },
      {
        path: 'item/product',
        component: ProductComponent,
        title: 'Machine'
      },
      {
        path: 'item/productSerial',
        component: ProductSerialComponent,
        title: 'Machine Serial'
      },
      {
        path: 'contact/vendor',
        component: VendorComponent,
        title: 'Vendor'
      },
      {
        path: 'contact/customer',
        component: CustomerComponent,
        title: 'Customer'
      },
      {
        path: 'inventory/purchase',
        component: PurchaseComponent,
        title: 'Purchase'
      },
      {
        path: 'inventory/purchaselist',
        component: PurchaseListComponent,
        title: 'Purchase List'
      },
      {
        path: 'inventory/sales',
        component: InvoiceComponent,
        title: 'Sales'
      },
      {
        path: 'inventory/invoicelist',
        component: InvoiceListComponent,
        title: 'Invoice List'
      },
      {
        path: 'inventory/rentalcontract',
        component: RentalContractComponent,
        title: 'Rental Contract'
      },
      {
        path: 'inventory/rentallist',
        component: RentalList,
        title: 'Rental List'
      },
      {
        path: 'cash-management/cash-account',
        component: CashAccount,
        title: 'Cash Account'
      },
      {
        path: 'cash-management/expense-category',
        component: ExpenseCategory,
        title: 'Expense Category'
      },
      {
        path: 'cash-management/expense',
        component: Expense,
        title: 'Expense'
      },
      {
        path: 'cash-management/cheque-print',
        component: ChequePrint,
        title: 'Cheque Print'
      },
      {
        path: 'user',
        loadChildren: () => import('./user/user.module').then((m) => m.UserModule)
      }
    ]
  }
];
