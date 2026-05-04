import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BrandService } from '../../../service/item/brand.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-brand',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './brand.html',
  styleUrl: './brand.css'
})

export class Brand {

  brands: any[] = [];
  showForm = false;
  loading = false;

  isEditMode = false;
  selectedId: number | null = null;

  brand = {
    name: '',
    description: '',
    logoUrl: '',
    isActive: true
  };

  constructor(private brandService: BrandService, private cdr: ChangeDetectorRef) {

  }

  ngOnInit(): void {
    this.loadBrands();
  }

  loadBrands() {
    this.loading = true;
    this.brandService.getAll().subscribe({
      next: (res) => {

        this.brands = [...res];
        this.loading = false;

        this.cdr.detectChanges(); // 🔥 FORCE UI REFRESH
      },
      error: (err) => {
        console.log('ERROR:', err);
        this.loading = false;
      }
    });
  }

  openForm() {
    this.resetForm();
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
  }

  edit(item: any) {
    this.isEditMode = true;
    this.selectedId = item.id;

    this.brand = {
      name: item.name,
      description: item.description,
      logoUrl: item.logoUrl,
      isActive: item.isActive
    };

    this.showForm = true;
  }

  saveBrand() {

    if (!this.brand.name || this.brand.name.trim() === '') {
      // If using SweetAlert2 (Standard in AdminLTE)
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Brand Name is required!',
      });

      // Or if using standard alert:
      // alert('Brand Name is required!');

      return; // Stop the function here
    }

    if (this.isEditMode && this.selectedId) {

      // UPDATE
      this.brandService.update(this.selectedId, this.brand).subscribe({
        next: () => {
          this.afterSave();

        },
        error: err => console.log(err)
      });

    }
    else {

      // CREATE
      this.brandService.create(this.brand).subscribe({
        next: () => {
          this.afterSave();
        },
        error: err => console.log(err)
      });
    }
  }

  delete(id: number) {
    if (confirm('Delete this brand?')) {
      this.brandService.delete(id).subscribe(() => {
        this.loadBrands();
      });
    }
  }

  afterSave() {
    this.loadBrands();
    this.resetForm();
    this.showForm = false;
  }

  resetForm() {
    this.isEditMode = false;
    this.selectedId = null;

    this.brand = {
      name: '',
      description: '',
      logoUrl: '',
      isActive: true
    };
  }
}