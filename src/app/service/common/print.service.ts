import { Injectable } from '@angular/core';

export interface ReportColumn<T> {
  header: string;
  value: (item: T, index: number) => string;
  align?: 'left' | 'center' | 'right';
}

export interface ReportConfig<T> {
  title: string;
  columns: ReportColumn<T>[];
  data: T[];
}

@Injectable({
  providedIn: 'root'
})
export class PrintService {

  printReport<T>(config: ReportConfig<T>): void {

    const win = window.open('', '_blank', 'width=1100,height=800');
    if (!win) return;

    const table = this.buildTable(config.columns, config.data);

    const html = `
      <html>
        <head>
          <title>${config.title}</title>

          <style>
            body { font-family: Arial; padding: 24px; }
            h1 { margin-bottom: 10px; }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }

            th, td {
              border: 1px solid #ddd;
              padding: 8px;
            }

            th {
              background: #f4f6f9;
            }

            .center { text-align: center; }

            @media print {
              @page { size: A4 landscape; margin: 12mm; }
            }
          </style>
        </head>

        <body>
          <h1>${config.title}</h1>
          ${table}
        </body>
      </html>
    `;

    win.document.open();
    win.document.write(html);
    win.document.close();

    win.focus();

    setTimeout(() => win.print(), 500);
  }

  private buildTable<T>(
    columns: ReportColumn<T>[],
    data: T[]
  ): string {

    const headers = columns.map(c => `
      <th class="${c.align ?? 'left'}">${c.header}</th>
    `).join('');

    const rows = data.map((item, index) => `
      <tr>
        ${columns.map(col => `
          <td class="${col.align ?? 'left'}">
            ${col.value(item, index)}
          </td>
        `).join('')}
      </tr>
    `).join('');

    return `
      <table>
        <thead>
          <tr>${headers}</tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="${columns.length}">No data</td></tr>`}
        </tbody>
      </table>
    `;
  }
}