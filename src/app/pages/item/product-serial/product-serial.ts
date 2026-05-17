import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService, Product } from '../../../service/item/product.service';
import { ProductSerialService, ProductSerialDto, ProductSerialStatus } from '../../../service/item/product-serial.service';
import { ProductSerialImage, ProductSerialImageService } from '../../../service/item/product-serial-image.service';
import { environmentImageUrl } from '../../../../environments/environment';
import { QRCodeComponent } from 'angularx-qrcode';

declare var $: any;

type ToastType = 'success' | 'danger' | 'warning' | 'info';

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
  selectedStatusId = '';
  toast: { show: boolean; type: ToastType; title: string; message: string; icon: string } = {
    show: false,
    type: 'success',
    title: '',
    message: '',
    icon: 'fas fa-check-circle'
  };

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
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

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
    this.serialService.getSerials(
      this.page,
      this.pageSize,
      this.search,
      this.selectedStatusId ? Number(this.selectedStatusId) : undefined
    ).subscribe({
      next: (res) => {
        this.serials = res.items;
        this.totalCount = res.totalCount;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading serials', err);
        this.loading = false;
        this.showToast('danger', 'Load Failed', 'Unable to load serial inventory.');
      }
    });
  }

  onPageChange(newPage: number) {
    if (newPage < 1 || newPage > this.totalPages) return;

    this.page = newPage;
    this.loadSerials();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  get pageStart(): number {
    return this.totalCount === 0 ? 0 : ((Math.min(this.page, this.totalPages) - 1) * this.pageSize) + 1;
  }

  get pageEnd(): number {
    return Math.min(Math.min(this.page, this.totalPages) * this.pageSize, this.totalCount);
  }

  get linkedCount(): number {
    return this.serials.filter((item) => item.isSerialNumberLinkToProduct).length;
  }

  get unlinkedCount(): number {
    return this.serials.filter((item) => !item.isSerialNumberLinkToProduct).length;
  }

  get inRentCount(): number {
    return this.serials.filter((item) => item.status === 'InRent').length;
  }

  selectedItem: any = null;

  printQr(item: any) {

    const printContents = `
    <html>
      <head>
        <title>Print QR</title>

        <style>

          body{
            text-align:center;
            font-family:Arial;
            padding-top:20px;
          }

          .serial{
            margin-top:10px;
            font-size:16px;
            font-weight:bold;
          }

        </style>
      </head>

      <body>

        <img
          src="${this.getQrImage(item.serialNumber)}"
          width="200"
        />

        <div class="serial">
          ${item.serialNumber}
        </div>

      </body>
    </html>
  `;

    const popupWin = window.open('', '_blank', 'width=600,height=600');

    popupWin?.document.open();
    popupWin?.document.write(printContents);
    popupWin?.document.close();

    popupWin?.focus();

    setTimeout(() => {

      popupWin?.print();
      popupWin?.close();

    }, 500);

  }

  printAllQr() {
    if (this.serials.length === 0) {
      this.showToast('info', 'No QR Codes', 'There are no serials on this page to print.');
      return;
    }

    let labelsHtml = '';

    for (const item of this.serials) {
      const qrImage = this.getQrImage(item.serialNumber);

      labelsHtml += `
      <div class="label">

          <img src="${qrImage}" width="120" />

          <div class="serial">
              ${item.serialNumber}
          </div>

      </div>
    `;
    }

    const printWindow = window.open('', '_blank', 'width=1000,height=800');

    const html = `
    <html>

      <head>

        <title>Print All QR Codes</title>

        <style>

          body{
            font-family: Arial;
            padding:20px;
          }

          .container{
            display:flex;
            flex-wrap:wrap;
          }

          .label{
            width:220px;
            height:220px;

            border:1px solid #ddd;

            margin:10px;
            padding:10px;

            text-align:center;

            page-break-inside:avoid;
          }

          .serial{
            margin-top:10px;
            font-size:14px;
            font-weight:bold;

            word-break:break-all;
          }

        </style>

      </head>

      <body>

        <div class="container">
          ${labelsHtml}
        </div>

        <script>
          const images = Array.from(document.images);

          Promise.all(images.map((image) => {
            if (image.complete && image.naturalWidth > 0) {
              return Promise.resolve();
            }

            if (image.decode) {
              return image.decode().catch(() => undefined);
            }

            return new Promise((resolve) => {
              image.onload = resolve;
              image.onerror = resolve;
            });
          })).then(() => {
            window.focus();
            window.print();
            window.close();
          });
        </script>

      </body>

    </html>
  `;

    printWindow?.document.open();
    printWindow?.document.write(html);
    printWindow?.document.close();

  }
  getQrImage(serial: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(serial)}`;
  }

  onSearch() {
    this.page = 1; // Reset to page 1 for search
    this.loadSerials();
  }

  resetFilters() {
    this.search = '';
    this.selectedStatusId = '';
    this.page = 1;
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
    this.imagePreview = null;

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
    if (!this.serial.productId) {
      this.showToast('warning', 'Validation Error', 'Please select a target product.');
      return;
    }

    if (this.serial.isOpeningStock && !this.serial.legacySerial?.trim()) {
      this.showToast('warning', 'Validation Error', 'Legacy serial number is required for opening stock.');
      return;
    }

    const request = (this.isEditMode && this.selectedId)
      ? this.serialService.update(this.selectedId, this.serial)
      : this.serialService.create(this.serial);
    const message = this.isEditMode ? 'Machine unit updated successfully.' : 'Machine unit generated successfully.';

    request.subscribe({
      next: () => {
        this.closeForm();
        this.loadSerials();
        this.showToast('success', 'Success', message);
      },
      error: (err) => {
        console.error(err);
        this.showToast('danger', 'Save Failed', 'Unable to save the serial unit. Please try again.');
      }
    });
  }

  edit(item: ProductSerialDto) {
    this.isEditMode = true;
    this.selectedId = item.id;
    this.serial = { ...item };
    this.showForm = true;
  }

  onOpeningStockChange(isOpeningStock: boolean) {
    if (!isOpeningStock) {
      this.serial.legacySerial = '';
    }
  }

  resetSerialObject() {
    return {
      serialNumber: '',
      productId: null,
      status: 'Available',
      purchaseCost: 0,
      sellingCost: 0,
      rentalCost: 0,
      legacySerial: '',
      isOpeningStock: false,
      note: ''
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
  imagePreview: string | null = null;

  deleteImage(id: number) {
    if (!confirm('Delete this image?')) return;

    this.productSerialImageService.delete(id).subscribe({
      next: () => {
        this.loadGalleryImages(this.productSerialId);
        this.showToast('success', 'Deleted', 'Gallery image deleted successfully.');
      },
      error: (err) => {
        console.error('Error deleting image', err);
        this.showToast('danger', 'Delete Failed', 'Unable to delete the image.');
      }
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.selectedFile = file;
    this.selectedFileName = file.name;

    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = reader.result as string;
      this.cdr.detectChanges();
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
        this.showToast('success', 'Uploaded', 'Gallery image uploaded successfully.');
      },
      error: () => {
        this.uploading = false;
        this.showToast('danger', 'Upload Failed', 'Unable to upload the image.');
      }
    });
  }

  resetUploadForm() {
    this.selectedFile = null;
    this.selectedFileName = '';
    this.newImage.title = '';
    this.imagePreview = null;

    const fileInput = document.getElementById('galleryFileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  removeLinkedImage(serialId: number) {
    this.serialService.unLinkedStatus(serialId).subscribe({
      next: () => {
        this.loadSerials();
        if (this.selectedSerial && this.selectedSerial.id === serialId) {
          this.selectedSerial.machineImageUrl = null;
        }
        this.showToast('success', 'Unlinked', 'Primary machine photo removed.');
      },
      error: (err) => {
        console.error('Error unlinking image', err);
        this.showToast('danger', 'Unlink Failed', 'Unable to remove the linked photo.');
      }
    });
  }

  // Variables for the linkage modal
  selectedImageId: number | null = null;
  selectedLinkFile: File | null = null;
  selectedLinkFileName: string = '';
  newLinkTitle: string = '';
  linkImagePreview: string | null = null;

  triggerLinkImageModal() {
    // 1. Hide the parent gallery modal
    $('#machineImageModal').modal('hide');

    // 2. Clear out any previous form state in the linkage modal
    this.selectedImageId = null;
    this.selectedLinkFile = null;
    this.selectedLinkFileName = '';
    this.newLinkTitle = '';
    this.linkImagePreview = null;

    // 3. Display the linkage modal
    $('#linkImageModal').modal('show');
  }

  onLinkFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.selectedLinkFile = file;
    this.selectedLinkFileName = file.name;

    const reader = new FileReader();
    reader.onload = () => {
      this.linkImagePreview = reader.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
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
            this.showToast('success', 'Linked', 'Machine photo linked successfully.');
          },
          error: err => {
            console.log('ERROR:', err.error);
            this.showToast('danger', 'Link Failed', 'Unable to link the machine photo.');
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
          this.showToast('success', 'Linked', 'Machine photo linked successfully.');
        },
        error: err => {
          console.log('ERROR:', err.error);
          this.showToast('danger', 'Link Failed', 'Unable to link the machine photo.');
        }
      });
  }

  showToast(type: ToastType, title: string, message: string) {
    const icons: Record<ToastType, string> = {
      success: 'fas fa-check-circle',
      danger: 'fas fa-times-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle'
    };

    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }

    this.toast = {
      show: true,
      type,
      title,
      message,
      icon: icons[type]
    };

    this.toastTimer = setTimeout(() => {
      this.closeToast();
    }, 3500);
  }

  closeToast() {
    this.toast.show = false;
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
  }
}
