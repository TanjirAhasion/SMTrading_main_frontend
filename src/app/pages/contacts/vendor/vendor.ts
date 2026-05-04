import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Vendor, VendorService } from '../../../service/contacts/vendor.service'; // Adjust path as needed

@Component({
  selector: 'app-vendor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vendor.html',
  styleUrl: './vendor.css',
})

export class VendorComponent implements OnInit {
  //private vendorService = inject(VendorService);

  // State Management
  vendors: Vendor[] = [];
  vendor: Partial<Vendor> = {}; // The model for the form
  showForm = false;
  loading = false;
  isEditMode = false;
  selectedId: number | null = null;

   constructor(private vendorService: VendorService, private cdr: ChangeDetectorRef, private router: Router) { }

  ngOnInit(): void {
    this.loadVendors();
  }

  loadVendors(): void {
    this.loading = true;
    this.vendorService.getAll().subscribe({
      next: (data) => {
        console.log(data);
        this.vendors = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading vendors', err);
        this.loading = false;
      }
    });
  }

  toggleForm(editMode = false, vendorData: Vendor | null = null): void {
    this.isEditMode = editMode;
    this.showForm = !this.showForm;

    if (editMode && vendorData) {
      this.selectedId = vendorData.id;
      this.vendor = { ...vendorData }; // Clone to avoid direct mutation
    } else {
      this.selectedId = null;
      this.vendor = { isActive: true }; // Default values for new vendor
    }
  }

  saveVendor(): void {
    if (this.isEditMode && this.selectedId) {
      this.vendorService.update(this.selectedId, this.vendor).subscribe(() => {
        this.loadVendors();
        this.toggleForm();
      });
    } else {
      this.vendorService.create(this.vendor).subscribe(() => {
        this.loadVendors();
        this.toggleForm();
      });
    }
  }

  deleteVendor(id: number): void {
    if (confirm('Are you sure you want to delete this vendor?')) {
      this.vendorService.delete(id).subscribe(() => {
        this.loadVendors();
      });
    }
  }

  cancel(): void {
    this.showForm = false;
    this.vendor = {};
  }

  createPurchase(vendor: Vendor): void {
    // Navigate to purchase creation page with vendor ID as query parameter
    this.router.navigate(['/purchase/create'], { queryParams: { vendorId: vendor.id, vendorName: vendor.firstName + ' ' + vendor.lastName } });
  }
}