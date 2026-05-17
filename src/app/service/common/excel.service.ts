import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx-js-style';
import { saveAs } from 'file-saver';

@Injectable({
  providedIn: 'root'
})
export class ExcelService {

  exportToExcel(data: any[], fileName: string): void {

    const worksheet: XLSX.WorkSheet =
      XLSX.utils.json_to_sheet(data);

    // Get range
    const range = XLSX.utils.decode_range(worksheet['!ref'] || '');

    // Apply border to all cells
    for (let row = range.s.r; row <= range.e.r; row++) {

      for (let col = range.s.c; col <= range.e.c; col++) {

        const cellAddress = XLSX.utils.encode_cell({
          r: row,
          c: col
        });

        if (!worksheet[cellAddress]) continue;

        worksheet[cellAddress].s = {

          border: {
            top: {
              style: 'thin',
              color: { rgb: '000000' }
            },
            bottom: {
              style: 'thin',
              color: { rgb: '000000' }
            },
            left: {
              style: 'thin',
              color: { rgb: '000000' }
            },
            right: {
              style: 'thin',
              color: { rgb: '000000' }
            }
          }

        };
      }
    }

    // Header Style
    const headers = Object.keys(data[0]);

    headers.forEach((_, index) => {

      const cellAddress =
        XLSX.utils.encode_cell({
          r: 0,
          c: index
        });

      if (worksheet[cellAddress]) {

        worksheet[cellAddress].s = {

          font: {
            bold: true
          },

          fill: {
            fgColor: { rgb: 'D9EAD3' }
          },

          alignment: {
            horizontal: 'center'
          },

          border: {
            top: {
              style: 'thin',
              color: { rgb: '000000' }
            },
            bottom: {
              style: 'thin',
              color: { rgb: '000000' }
            },
            left: {
              style: 'thin',
              color: { rgb: '000000' }
            },
            right: {
              style: 'thin',
              color: { rgb: '000000' }
            }
          }
        };
      }
    });

    // Column Width
    worksheet['!cols'] = [
      { wch: 10 },
      { wch: 30 },
      { wch: 20 },
      { wch: 15 }
    ];

    const workbook: XLSX.WorkBook = {
      Sheets: {
        data: worksheet
      },
      SheetNames: ['data']
    };

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    const blob = new Blob(
      [excelBuffer],
      {
        type:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
      }
    );

    saveAs(blob, `${fileName}.xlsx`);
  }
}