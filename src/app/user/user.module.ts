import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { tenantOnlyGuard } from './guards/tenant-only.guard';
import { UserListComponent } from './components/user-list/user-list.component';
import { UserRegisterComponent } from './components/user-register/user-register.component';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'list',
  },
  {
    path: 'list',
    component: UserListComponent,
    canActivate: [tenantOnlyGuard],
    title: 'Users',
  },
  {
    path: 'register',
    pathMatch: 'full',
    redirectTo: 'list',
  },
];

@NgModule({
  declarations: [UserListComponent, UserRegisterComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
  ],
})
export class UserModule {}
