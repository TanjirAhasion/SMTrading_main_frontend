import { Injectable } from '@angular/core';
import {
  ChequeData,
  ChequeFieldKey,
  ChequeTemplate,
  ChequeTemplateExport
} from '../../pages/cashManagement/cheque-print/models/cheque-template.model';

const STORAGE_KEY = 'smt-cheque-templates';

export const DEFAULT_CHEQUE_TEMPLATES: ChequeTemplate[] = [
  {
    id: 'standard-erp',
    bankName: 'Standard ERP Bank',
    accountName: 'SM Trading Current Account',
    chequeWidth: 203,
    chequeHeight: 89,
    backgroundImage: '/assets/cheques/sample-cheque-template.svg',
    printOnA4: true,
    a4Top: 20,
    a4Left: 4,
    calibration: { xOffset: 0, yOffset: 0 },
    fields: {
      date: { top: 17, left: 155, width: 38, fontSize: 4.2, fontWeight: 700, align: 'center' },
      payeeName: { top: 35, left: 26, width: 119, fontSize: 5, fontWeight: 700 },
      amount: { top: 35, left: 160, width: 31, fontSize: 4.8, fontWeight: 800, align: 'right' },
      amountInWords: { top: 48, left: 20, width: 174, fontSize: 4.3, fontWeight: 700, lineHeight: 1.35 }
    }
  },
  {
    id: 'city-layout',
    bankName: 'City Layout Bank',
    accountName: 'SM Trading Operations',
    chequeWidth: 203,
    chequeHeight: 89,
    backgroundImage: '/assets/cheques/sample-cheque-template.svg',
    printOnA4: true,
    a4Top: 24,
    a4Left: 4,
    calibration: { xOffset: 0, yOffset: 0 },
    fields: {
      date: { top: 15, left: 151, width: 42, fontSize: 4.2, fontWeight: 700, align: 'center' },
      payeeName: { top: 33, left: 23, width: 124, fontSize: 4.9, fontWeight: 700 },
      amount: { top: 39, left: 158, width: 34, fontSize: 4.8, fontWeight: 800, align: 'right' },
      amountInWords: { top: 51, left: 18, width: 176, fontSize: 4.2, fontWeight: 700, lineHeight: 1.35 }
    }
  }
];

@Injectable({ providedIn: 'root' })
export class ChequePrintService {
  getTemplates(): ChequeTemplate[] {
    const stored = this.readStoredTemplates();
    const merged = [...DEFAULT_CHEQUE_TEMPLATES];

    for (const template of stored) {
      const index = merged.findIndex((item) => item.id === template.id);
      if (index >= 0) {
        merged[index] = template;
      } else {
        merged.push(template);
      }
    }

    return merged;
  }

  saveTemplate(template: ChequeTemplate): ChequeTemplate[] {
    const templates = this.getTemplates();
    const index = templates.findIndex((item) => item.id === template.id);
    const nextTemplate = this.cloneTemplate(template);

    if (index >= 0) {
      templates[index] = nextTemplate;
    } else {
      templates.push(nextTemplate);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    return templates;
  }

  exportTemplateJson(template: ChequeTemplate): void {
    const payload: ChequeTemplateExport = {
      version: 1,
      exportedAt: new Date().toISOString(),
      template: this.cloneTemplate(template)
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `${template.id}-cheque-template.json`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }

  parseTemplateJson(file: File): Promise<ChequeTemplate> {
    return file.text().then((text) => {
      const parsed = JSON.parse(text) as Partial<ChequeTemplateExport> | ChequeTemplate;
      const template = 'template' in parsed ? parsed.template : parsed;

      if (!this.isTemplate(template)) {
        throw new Error('Invalid cheque template JSON file.');
      }

      return template;
    });
  }

  print(): void {
    window.print();
  }

  async exportChequePdf(template: ChequeTemplate, data: ChequeData): Promise<void> {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    const top = template.printOnA4 ? template.a4Top + template.calibration.yOffset : template.calibration.yOffset;
    const left = template.printOnA4 ? template.a4Left + template.calibration.xOffset : template.calibration.xOffset;

    try {
      const background = await this.loadImageAsDataUrl(template.backgroundImage, template.chequeWidth, template.chequeHeight);
      doc.addImage(background, 'PNG', left, top, template.chequeWidth, template.chequeHeight);
    } catch {
      doc.setDrawColor(180);
      doc.rect(left, top, template.chequeWidth, template.chequeHeight);
    }

    this.drawPdfText(doc, template, data, left, top);
    doc.save(`cheque-${data.chequeDate || 'draft'}.pdf`);
  }

  formatDate(value: string): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatAmount(value: number): string {
    return (Number(value) || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  amountToWords(value: number): string {
    const amount = Math.max(0, Number(value) || 0);
    const taka = Math.floor(amount);
    const paisa = Math.round((amount - taka) * 100);
    const takaText = taka > 0 ? `${this.numberToWords(taka)} Taka` : 'Zero Taka';
    const paisaText = paisa > 0 ? ` and ${this.numberToWords(paisa)} Paisa` : '';

    return `${takaText}${paisaText} Only`;
  }

  private drawPdfText(doc: InstanceType<typeof import('jspdf').jsPDF>, template: ChequeTemplate, data: ChequeData, baseLeft: number, baseTop: number): void {
    const values: Record<ChequeFieldKey, string> = {
      date: this.formatDate(data.chequeDate),
      payeeName: data.payeeName,
      amount: `**${this.formatAmount(data.amount)}**`,
      amountInWords: data.amountInWords
    };

    (Object.keys(template.fields) as ChequeFieldKey[]).forEach((key) => {
      const field = template.fields[key];
      doc.setFont('helvetica', field.fontWeight && field.fontWeight >= 700 ? 'bold' : 'normal');
      doc.setFontSize(field.fontSize * 2.8);
      doc.text(values[key], baseLeft + field.left, baseTop + field.top, {
        align: field.align || 'left',
        maxWidth: field.width
      });
    });
  }

  private loadImageAsDataUrl(src: string, widthMm: number, heightMm: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(widthMm * 8);
        canvas.height = Math.round(heightMm * 8);
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Canvas is unavailable.'));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      };
      image.onerror = () => reject(new Error('Unable to load cheque background.'));
      image.src = src;
    });
  }

  private readStoredTemplates(): ChequeTemplate[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((item) => this.isTemplate(item)) : [];
    } catch {
      return [];
    }
  }

  private isTemplate(value: unknown): value is ChequeTemplate {
    const template = value as ChequeTemplate;

    return !!template
      && typeof template.id === 'string'
      && typeof template.bankName === 'string'
      && typeof template.chequeWidth === 'number'
      && typeof template.chequeHeight === 'number'
      && !!template.fields?.payeeName
      && !!template.fields?.amount
      && !!template.fields?.amountInWords
      && !!template.fields?.date;
  }

  private cloneTemplate(template: ChequeTemplate): ChequeTemplate {
    return JSON.parse(JSON.stringify(template)) as ChequeTemplate;
  }

  private numberToWords(value: number): string {
    if (value === 0) return 'Zero';

    const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const belowHundred = (num: number) => num < 20 ? units[num] : `${tens[Math.floor(num / 10)]}${num % 10 ? ` ${units[num % 10]}` : ''}`;
    const belowThousand = (num: number) => num < 100 ? belowHundred(num) : `${units[Math.floor(num / 100)]} Hundred${num % 100 ? ` ${belowHundred(num % 100)}` : ''}`;
    const parts: string[] = [];
    let remaining = Math.floor(value);
    const crore = Math.floor(remaining / 10000000);
    remaining %= 10000000;
    const lakh = Math.floor(remaining / 100000);
    remaining %= 100000;
    const thousand = Math.floor(remaining / 1000);
    remaining %= 1000;

    if (crore) parts.push(`${belowThousand(crore)} Crore`);
    if (lakh) parts.push(`${belowThousand(lakh)} Lakh`);
    if (thousand) parts.push(`${belowThousand(thousand)} Thousand`);
    if (remaining) parts.push(belowThousand(remaining));

    return parts.join(' ');
  }
}
