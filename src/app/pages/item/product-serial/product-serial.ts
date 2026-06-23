import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService, Product } from '../../../service/item/product.service';
import { ProductSerialService, ProductSerialDto, ProductSerialStatus, ProductSerialStatusEnum } from '../../../service/item/product-serial.service';
import { ProductSerialImage, ProductSerialImageService } from '../../../service/item/product-serial-image.service';
import { environmentImageUrl } from '../../../../environments/environment';
import { QRCodeComponent } from 'angularx-qrcode';
import { PdfService } from '../../../service/common/pdf.service';
import { ExcelService } from '../../../service/common/excel.service';
import { PrintService } from '../../../service/common/print.service';
import { createEmptyToast, ToastController, ToastState, ToastType } from '../../../service/common/toast-helper';

declare var $: any;

@Component({
  selector: 'app-product-serial',
  standalone: true, // Assuming Angular 17+
  imports: [CommonModule, FormsModule],
  providers: [ProductSerialService, ProductService],
  templateUrl: './product-serial.html',
  styleUrl: './product-serial.css',
})

export class ProductSerialComponent implements OnInit, OnDestroy {
  page: number = 1;
  pageSize: number = 10;
  totalCount: number = 0;
  search: string = '';
  selectedStatusId = '';
  selectedLinkStatus = '';
  selectedActiveStatus = '';
  appliedSearch = '';
  appliedStatusId = '';
  appliedLinkStatus = '';
  appliedActiveStatus = '';
  toast: ToastState = createEmptyToast();

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
  selectedSerialDetail: ProductSerialDto | null = null;

  serial: any = this.resetSerialObject();
  private readonly toastController = new ToastController();

  constructor(
    private productService: ProductService, // Inject services
    private serialService: ProductSerialService,
    private productSerialImageService: ProductSerialImageService,
    private pdfService: PdfService,
    private excelService: ExcelService,
    private printService: PrintService,
    private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.loadSerials();
    this.loadProducts();
    this.loadSerialStatus();
  }

  ngOnDestroy(): void {
    this.toastController.destroy();
  }

  loadSerials() {
    this.loading = true;
    const selectedStatus = this.appliedStatusId ? Number(this.appliedStatusId) : undefined;
    const isLinkedPhoto = this.appliedLinkStatus
      ? this.appliedLinkStatus === 'linked'
      : undefined;

    this.serialService.getSerials(
      this.page,
      this.pageSize,
      this.appliedSearch,
      selectedStatus,
      isLinkedPhoto,
      this.getSelectedIsActive(this.appliedActiveStatus)
    ).subscribe({
      next: (res) => {
        this.serials = res.items;
        this.totalCount = res.totalCount;
        this.selectedSerialDetail = null;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => this.handleSerialLoadError(err)
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
          <div class="qr-box">
            <img src="${qrImage}" alt="QR ${item.serialNumber}" />
          </div>
          <div class="serial">${item.serialNumber}</div>
          <div class="meta">${item.productName || 'Machine Unit'}</div>
          <div class="sub-meta">${item.brandName || ''}${item.model ? ' | ' + item.model : ''}</div>
        </div>
      `;
    }

    const printWindow = window.open('', '_blank', 'width=1000,height=800');

    const html = `
    <html>

      <head>

        <title>Print All QR Codes</title>

        <style>

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            background: #fff;
            color: #111827;
            font-family: Arial, Helvetica, sans-serif;
          }

          .sheet {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10mm;
            padding: 12mm;
          }

          .label {
            min-height: 58mm;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            padding: 6mm 5mm;
            text-align: center;
            break-inside: avoid;
            page-break-inside: avoid;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }

          .qr-box {
            width: 34mm;
            height: 34mm;
            padding: 2mm;
            border: 1px solid #e5e7eb;
            border-radius: 3px;
            background: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .qr-box img {
            width: 100%;
            height: 100%;
            display: block;
          }

          .serial {
            width: 100%;
            margin-top: 4mm;
            font-size: 12px;
            line-height: 1.25;
            font-weight: 700;
            letter-spacing: 0;
            word-break: break-word;
          }

          .meta {
            width: 100%;
            margin-top: 1.5mm;
            font-size: 10px;
            line-height: 1.2;
            color: #374151;
            font-weight: 600;
            word-break: break-word;
          }

          .sub-meta {
            width: 100%;
            margin-top: 1mm;
            font-size: 9px;
            line-height: 1.2;
            color: #6b7280;
            word-break: break-word;
          }

          @media print {
            @page {
              size: A4;
              margin: 0;
            }

            .sheet {
              padding: 10mm;
              gap: 8mm;
            }
          }

        </style>

      </head>

      <body>

        <div class="sheet">
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

  downloadExcel() {
    this.getReportSerials((items) => {
      const rows = items.map((item, index) => ({
        SL: index + 1,
        Serial: item.serialNumber,
        Product: item.productName || '-',
        Brand: item.brandName || '-',
        Model: item.model || '-',
        Status: item.status?.replace('In', 'In ') || '-',
        LinkedPhoto: item.isSerialNumberLinkToProduct ? 'Linked' : 'Not Linked',
        PurchaseCost: this.formatNumber(item.purchaseCost),
        SellingCost: this.formatNumber(item.sellingCost),
        RentalCost: this.formatNumber(item.rentalCost)
      }));

      this.excelService.exportToExcel(rows, 'machine-serial-report');
    });
  }

  downloadPdf() {
    this.getReportSerials((items) => {
      const columns = [
        { header: 'SL', field: 'sl' },
        { header: 'Serial', field: 'serial' },
        { header: 'Product', field: 'product' },
        { header: 'Brand', field: 'brand' },
        { header: 'Model', field: 'model' },
        { header: 'Status', field: 'status' },
        { header: 'Photo', field: 'photo' }
      ];

      const rows = items.map((item, index) => ({
        sl: index + 1,
        serial: item.serialNumber,
        product: item.productName || '-',
        brand: item.brandName || '-',
        model: item.model || '-',
        status: item.status?.replace('In', 'In ') || '-',
        photo: item.isSerialNumberLinkToProduct ? 'Linked' : 'Not Linked'
      }));

      this.pdfService.downloadTablePdf('Machine Serial Report', columns, rows, 'machine-serials.pdf');
    });
  }

  printReport() {
    this.getReportSerials((items) => {
      this.printService.printReport({
        title: 'Machine Serial Report',
        data: items,
        columns: [
          { header: 'SL', value: (_item, index) => String(index + 1), align: 'center' },
          { header: 'Serial', value: item => item.serialNumber || '-' },
          { header: 'Product', value: item => item.productName || '-' },
          { header: 'Brand', value: item => item.brandName || '-' },
          { header: 'Model', value: item => item.model || '-' },
          { header: 'Status', value: item => item.status?.replace('In', 'In ') || '-', align: 'center' },
          { header: 'Photo', value: item => item.isSerialNumberLinkToProduct ? 'Linked' : 'Not Linked', align: 'center' },
          { header: 'Purchase', value: item => this.formatNumber(item.purchaseCost), align: 'right' },
          { header: 'Selling', value: item => this.formatNumber(item.sellingCost), align: 'right' },
          { header: 'Rental', value: item => this.formatNumber(item.rentalCost), align: 'right' }
        ]
      });
    });
  }

  private getReportSerials(callback: (items: ProductSerialDto[]) => void) {
    if (this.totalCount <= this.serials.length) {
      callback(this.serials);
      return;
    }

    const selectedStatus = this.appliedStatusId ? Number(this.appliedStatusId) : undefined;
    const isLinkedPhoto = this.appliedLinkStatus
      ? this.appliedLinkStatus === 'linked'
      : undefined;

    this.serialService.getSerials(
      1,
      this.totalCount,
      this.appliedSearch,
      selectedStatus,
      isLinkedPhoto,
      this.getSelectedIsActive(this.appliedActiveStatus)
    ).subscribe({
      next: (res) => callback(res.items || []),
      error: (err) => {
        console.error('Report export failed:', err);
        callback(this.serials);
      }
    });
  }

  private formatNumber(value: number | string | null | undefined): string {
    return (Number(value) || 0).toFixed(2);
  }

  onSearch() {
    this.appliedSearch = this.search;
    this.appliedStatusId = this.selectedStatusId;
    this.appliedLinkStatus = this.selectedLinkStatus;
    this.appliedActiveStatus = this.selectedActiveStatus;
    this.page = 1; // Reset to page 1 for search
    this.loadSerials();
  }

  onPageSizeChange() {
    this.page = 1;
    this.loadSerials();
  }

  resetFilters() {
    this.search = '';
    this.selectedStatusId = '';
    this.selectedLinkStatus = '';
    this.selectedActiveStatus = '';
    this.appliedSearch = '';
    this.appliedStatusId = '';
    this.appliedLinkStatus = '';
    this.appliedActiveStatus = '';
    this.page = 1;
    this.selectedSerialDetail = null;
    this.loadSerials();
  }

  private getSelectedIsActive(value: string): boolean | undefined {
    if (value === 'active') return true;
    if (value === 'inactive') return false;
    return undefined;
  }

  private handleSerialLoadError(err: unknown) {
    console.error('Error loading serials', err);
    this.loading = false;
    this.showToast('danger', 'Load Failed', 'Unable to load serial inventory.');
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

    const payload = {
      ...this.serial,
      status: this.isEditMode ? this.getStatusName(this.serial.status) : Number(this.serial.status)
    };

    const request = (this.isEditMode && this.selectedId)
      ? this.serialService.update(this.selectedId, payload)
      : this.serialService.create(payload);
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
    this.serial = {
      ...item,
      status: this.getStatusId(item.status) ?? ProductSerialStatusEnum.InStock
    };
    this.showForm = true;
  }

  showSerialDetail(item: ProductSerialDto) {
    this.selectedSerialDetail = item;
  }

  closeSerialDetail() {
    this.selectedSerialDetail = null;
  }

  private getStatusId(status: string | number | null | undefined): number | null {
    if (typeof status === 'number') {
      return status;
    }

    if (!status) {
      return null;
    }

    const numericStatus = Number(status);
    if (!Number.isNaN(numericStatus)) {
      return numericStatus;
    }

    return this.serialStatus.find((item) => item.name === status)?.id ?? null;
  }

  private getStatusName(status: string | number | null | undefined): string {
    if (typeof status === 'string' && Number.isNaN(Number(status))) {
      return status;
    }

    const statusId = this.getStatusId(status);
    return this.serialStatus.find((item) => item.id === statusId)?.name
      ?? ProductSerialStatusEnum[statusId as ProductSerialStatusEnum]
      ?? ProductSerialStatusEnum[ProductSerialStatusEnum.InStock];
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
      status: ProductSerialStatusEnum.InStock,
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
    this.toastController.show(
      type,
      title,
      message,
      (toast) => this.toast = toast,
      () => this.closeToast()
    );
  }

  closeToast() {
    this.toastController.close((toast) => this.toast = toast);
  }
}
