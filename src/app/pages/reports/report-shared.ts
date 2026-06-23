import { FormBuilder, FormGroup } from '@angular/forms';
import { Brand } from '../../service/item/brand.service';
import { Product } from '../../service/item/product.service';
import { ExcelService } from '../../service/common/excel.service';
import { PdfColumn, PdfService } from '../../service/common/pdf.service';
import { ReportTableColumn } from './report-table/report-table';

export function createReportFilterForm(fb: FormBuilder): FormGroup {
  return fb.group({
    productId: [''],
    brandId: [''],
    customerId: [''],
    status: [''],
    fromDate: [''],
    toDate: [''],
    overdueOnly: [false]
  });
}

export function compactFilter(form: FormGroup, page: number, pageSize: number, sortBy: string, sortDirection: string): any {
  const raw = form.value;
  const filter: any = { page, pageSize, sortBy, sortDirection };
  Object.keys(raw).forEach((key) => {
    if (raw[key] !== null && raw[key] !== undefined && raw[key] !== '') {
      filter[key] = raw[key];
    }
  });
  return filter;
}

export function exportReport(
  excelService: ExcelService,
  pdfService: PdfService,
  rows: any[],
  columns: ReportTableColumn[],
  title: string,
  fileName: string,
  type: 'excel' | 'pdf'
): void {
  const exportRows = rows.map((row) => {
    const item: any = {};
    columns.forEach((column) => item[column.label] = column.key.split('.').reduce((value, part) => value?.[part], row) ?? '-');
    return item;
  });

  if (type === 'excel') {
    excelService.exportToExcel(exportRows, fileName);
    return;
  }

  const pdfColumns: PdfColumn[] = columns.map((column) => ({ header: column.label, field: column.label }));
  pdfService.downloadTablePdf(title, pdfColumns, exportRows, `${fileName}.pdf`);
}

export function getProductOptions(products: Product[], brandId: string | number | null | undefined): Product[] {
  const brand = Number(brandId);
  return brand ? products.filter((product) => product.brandId === brand) : products;
}

export type ReportOptionState = {
  products: Product[];
  brands: Brand[];
};
