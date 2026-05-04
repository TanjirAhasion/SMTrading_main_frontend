import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Customer, CustomerService } from '../../../service/contacts/customer.service'; // Adjust path as needed

@Component({
  selector: 'app-customer',
  imports: [CommonModule, FormsModule],
  templateUrl: './customer.html',
  styleUrl: './customer.css',
})
export class CustomerComponent implements OnInit {

  // State Management
  customers: Customer[] = [];
  customer: Partial<Customer> = {}; // The model for the form
  showForm = false;
  loading = false;
  isEditMode = false;
  selectedId: number | null = null;

   constructor(private customerService: CustomerService, private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.loading = true;
    this.customerService.getAll().subscribe({
      next: (data) => {
        console.log(data);
        this.customers = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading customers', err);
        this.loading = false;
      }
    });
  }

  toggleForm(editMode = false, customerData: Customer | null = null): void {
    this.isEditMode = editMode;
    this.showForm = !this.showForm;

    if (editMode && customerData) {
      this.selectedId = customerData.id;
      this.customer = { ...customerData }; // Clone to avoid direct mutation
    } else {
      this.selectedId = null;
      this.customer = { isActive: true }; // Default values for new customer
    }
  }

  saveCustomer(): void {
    if (this.isEditMode && this.selectedId) {
      this.customerService.update(this.selectedId, this.customer).subscribe(() => {
        this.loadCustomers();
        this.toggleForm();
      });
    } else {
      this.customerService.create(this.customer).subscribe(() => {
        this.loadCustomers();
        this.toggleForm();
      });
    }
  }

  deleteCustomer(id: number): void {
    if (confirm('Are you sure you want to delete this customer?')) {
      this.customerService.delete(id).subscribe(() => {
        this.loadCustomers();
      });
    }
  }

  cancel(): void {
    this.showForm = false;
    this.customer = {};
  }
}
