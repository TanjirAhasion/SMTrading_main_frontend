import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService, Product } from '../../../service/item/product.service';
import { ProductSerialService, ProductSerialDto, ProductSerialStatus } from '../../../service/item/product-serial.service';
import { ProductSerialImage, ProductSerialImageService } from '../../../service/item/product-serial-image.service';
import { environmentImageUrl } from '../../../../environments/environment';

declare var $: any;

@Component({
  selector: 'app-product-serial',
  standalone: true, // Assuming Angular 17+
  imports: [CommonModule, FormsModule],
  providers: [ProductSerialService, ProductService],
  templateUrl: './product-serial.html',
  styleUrl: './product-serial.css',
})

export class ProductSerialComponent implements OnInit {
  page: number = 1;
  pageSize: number = 10;
  totalCount: number = 0;
  search: string = '';

  serials: ProductSerialDto[] = [];
  serialStatus: ProductSerialStatus[] = [];
  products: any[] = [];
  images: any[] = []; // Holds additional images

  loading = false;
  imageLoading = false;
  showForm = false;
  isEditMode = false;
  selectedId: number | null = null;
  selectedSerial: any = null;

  serial: any = this.resetSerialObject();

  constructor(
    private productService: ProductService, // Inject services
    private serialService: ProductSerialService,
    private productSerialImageService: ProductSerialImageService,
    private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.loadSerials();
    this.loadProducts();
    this.loadSerialStatus();
  }

  loadSerials() {
    this.loading = true;
    this.serialService.getSerials(this.page, this.pageSize, this.search).subscribe({
      next: (res) => {
        this.serials = res.items;
        this.totalCount = res.totalCount;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading serials', err);
        this.loading = false;
      }
    });
  }

  onPageChange(newPage: number) {
    this.page = newPage;
    this.loadSerials();
  }

  onSearch() {
    this.page = 1; // Reset to page 1 for search
    this.loadSerials();
  }

  loadGalleryImages(serialId: number) {
    this.imageLoading = true;
    this.images = [];

    this.productSerialImageService.getByProductSerialId(serialId).subscribe({
      next: (res: any[]) => {
        // 1. Determine linked machine image
        const linkedImageObj = res.find((img: any) => img.isLinked === true);
        if (linkedImageObj && this.selectedSerial) {
          this.selectedSerial.machineImageUrl = linkedImageObj.imageUrl;
        } else if (this.selectedSerial) {
          this.selectedSerial.machineImageUrl = null;
        }

        // 2. Filter additional images
        this.images = res.filter((img: any) => img.isLinked === false);
        this.imageLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.images = [];
        this.imageLoading = false;
      }
    });
  }

  openLinkModal(item: any) {
    this.removeLinkPreview()
    this.selectedSerial = item;
    this.productSerialId = item.id;
    this.newImage = { title: '' };
    this.selectedFile = null;
    this.selectedFileName = '';

    //this.loadGalleryImages(item.id);

    // Open Bootstrap modal
    $('#linkImageModal').modal('show');
  }

  openGalleryLinkModal(item: any) {
    this.selectedSerial = item;
    this.productSerialId = item.id;
    this.newImage = { title: '' };
    this.selectedFile = null;
    this.selectedFileName = '';

    this.loadGalleryImages(item.id);

    // Open Bootstrap modal
    $('#machineImageModal').modal('show');
  }
  openImageModal(productSerialId: number) {
    // Kept for backward compatibility with your existing grid button
    this.productSerialId = productSerialId;
    this.loadImages();

    setTimeout(() => {
      $('#machineImageModal').modal('show');
    });
  }

  loadImages() {
    this.images = [];
    this.imageLoading = true;
    this.productSerialImageService
      .getByProductSerialId(this.productSerialId)
      .subscribe({
        next: (res) => {
          this.images = Array.isArray(res) ? res : (res ? [res] : []);
          this.imageLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.images = [];
          this.imageLoading = false;
        }
      });
  }

  loadProducts() {
    this.productService.getAll().subscribe({
      next: (res) => this.products = res,
      error: (err) => console.error('Error loading products', err)
    });
  }

  loadSerialStatus() {
    this.serialService.productSerialStatuses().subscribe({
      next: (res) => this.serialStatus = res,
      error: (err) => console.error('Error loading statuses', err)
    });
  }

  openForm() {
    this.resetForm();
    this.showForm = true;
  }

  saveSerial() {
    if (!this.serial.productId) return;

    const request = (this.isEditMode && this.selectedId)
      ? this.serialService.update(this.selectedId, this.serial)
      : this.serialService.create(this.serial);

    request.subscribe({
      next: () => {
        this.closeForm();
        this.loadSerials();
      },
      error: (err) => console.error(err)
    });
  }

  edit(item: ProductSerialDto) {
    this.isEditMode = true;
    this.selectedId = item.id;
    this.serial = { ...item };
    this.showForm = true;
  }

  resetSerialObject() {
    return {
      serialNumber: '',
      productId: null,
      status: 'Available',
      purchaseCost: 0,
      sellingCost: 0,
      rentalCost: 0
    };
  }

  resetForm() {
    this.isEditMode = false;
    this.selectedId = null;
    this.serial = this.resetSerialObject();
  }

  closeForm() {
    this.showForm = false;
    this.serial = this.resetSerialObject();
    this.isEditMode = false;
    this.selectedId = null;
  }

  // --- IMAGE MANAGEMENT ---

  newImage = { title: '' };
  selectedFile: File | null = null;
  productSerialId!: number;
  imageBaseUrl = environmentImageUrl.apiUrl; // Set accordingly
  uploading = false;
  selectedFileName = '';
  imagePreview: string | ArrayBuffer | null = null;

  deleteImage(id: number) {
    if (!confirm('Delete this image?')) return;

    this.productSerialImageService.delete(id).subscribe(() => {
      this.loadGalleryImages(this.productSerialId);
    });
  }

  onFileSelected(event: any) {

    const file = event.target.files?.[0];
    if (!file) return;

    this.selectedFile = file;
    this.selectedFileName = file.name;

    const reader = new FileReader();
    reader.onload = () => {
      this.linkImagePreview = reader.result as string;
      this.cdr.detectChanges(); // 🔥 FORCE UI UPDATE
    };

    reader.readAsDataURL(file);
  }

  uploadImage(form?: any) {
    if (!this.selectedFile || this.uploading) return;

    this.uploading = true;
    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('title', this.newImage.title);
    formData.append('productSerialId', this.productSerialId.toString());

    this.productSerialImageService.upload(formData).subscribe({
      next: (res) => {
        this.images.push(res);
        this.resetUploadForm();
      
        if (form) {
          form.resetForm();
        }
        this.uploading = false;
        this.loadGalleryImages(this.productSerialId); // Reload to correctly align data
        this.cdr.detectChanges();
      },
      error: () => {
        this.uploading = false;
      }
    });
  }

  resetUploadForm() {
    this.selectedFile = null;
    this.selectedFileName = '';
    this.newImage.title = '';
  }

  removeLinkedImage(serialId: number) {
    this.serialService.unLinkedStatus(serialId).subscribe({
      next: () => {
        this.loadSerials();
        if (this.selectedSerial && this.selectedSerial.id === serialId) {
          this.selectedSerial.machineImageUrl = null;
        }
      },
      error: (err) => console.error('Error unlinking image', err)
    });
  }

  // Variables for the linkage modal
  selectedImageId: number | null = null;
  selectedLinkFile: File | null = null;
  selectedLinkFileName: string = '';
  newLinkTitle: string = '';
  linkImagePreview: string | ArrayBuffer | null = null;

  triggerLinkImageModal() {
    // 1. Hide the parent gallery modal
    $('#machineImageModal').modal('hide');

    // 2. Clear out any previous form state in the linkage modal
    this.selectedImageId = null;
    this.selectedLinkFile = null;
    this.selectedLinkFileName = '';
    this.newLinkTitle = '';

    // 3. Display the linkage modal
    $('#linkImageModal').modal('show');
  }

  onLinkFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedLinkFile = file;
      this.selectedLinkFileName = file.name;

      const reader = new FileReader();
      reader.onload = () => {
        this.linkImagePreview = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeLinkPreview() {
    this.linkImagePreview = null;
    this.selectedLinkFile = null;
    this.selectedLinkFileName = '';
    // Reset file input
    const fileInput = document.getElementById('linkFileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  saveImageLinkage() {
    if (this.selectedLinkFile) {

      const formData = new FormData();

      formData.append('id', this.selectedSerial.id.toString());
      formData.append('linkedUrl', this.selectedLinkFileName || '');

      if (this.selectedLinkFile) {
        formData.append('file', this.selectedLinkFile);
      }

      this.serialService
        .updateLinkedStatus(formData)
        .subscribe({
          next: () => {
            $('#linkImageModal').modal('hide');
            this.loadSerials();
          },
          error: err => {
            console.log('ERROR:', err.error);
          }
        });

    }
  }

  confirmLinkage(imageId: number) {

    const formData = new FormData();

    formData.append('id', this.selectedSerial.id.toString());
    formData.append('linkedUrl', this.selectedSerial.machineImageUrl || '');

    if (this.selectedLinkFile) {
      formData.append('file', this.selectedLinkFile);
    }

    this.serialService
      .updateLinkedStatus(formData)
      .subscribe({
        next: () => {
          $('#linkImageModal').modal('hide');
          this.loadGalleryImages(this.selectedSerial.id);
        },
        error: err => {
          console.log('ERROR:', err.error);
        }
      });
  }
}