import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PdfColumn {
  header: string;
  field: string;
}

@Injectable({
  providedIn: 'root'
})
export class PdfService {

  downloadTablePdf(
    title: string,
    columns: PdfColumn[],
    data: any[],
    fileName: string = 'report.pdf'
  ) {

    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.text(title, 14, 15);

    // Convert columns
    const head = [columns.map(c => c.header)];

    // Convert rows
    const body = data.map(row =>
      columns.map(col => row[col.field])
    );

    // Table
    autoTable(doc, {
      head,
      body,
      startY: 25,
      styles: {
        fontSize: 10
      },
      headStyles: {
        fillColor: [41, 128, 185]
      }
    });

    // Download
    doc.save(fileName);
  }
}

