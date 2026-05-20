import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChequePrintService } from '../../../service/cash-management/cheque-print.service';
import { ChequeData, ChequeFieldKey, ChequeTemplate } from './models/cheque-template.model';
import { ChequeForm } from './components/cheque-form/cheque-form';
import { ChequePreview } from './components/cheque-preview/cheque-preview';

type ToastType = 'success' | 'danger' | 'warning' | 'info';

@Component({
  selector: 'app-cheque-print',
  standalone: true,
  imports: [CommonModule, RouterLink, ChequeForm, ChequePreview],
  templateUrl: './cheque-print.html',
  styleUrl: './cheque-print.scss'
})
export class ChequePrint {
  templates: ChequeTemplate[] = [];
  selectedTemplate!: ChequeTemplate;
  selectedField: ChequeFieldKey = 'payeeName';
  cheque!: ChequeData;
  toast: { show: boolean; type: ToastType; title: string; message: string; icon: string } = {
    show: false,
    type: 'success',
    title: '',
    message: '',
    icon: 'fas fa-check-circle'
  };

  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private chequePrintService: ChequePrintService) {
    this.templates = this.chequePrintService.getTemplates();
    this.selectedTemplate = this.cloneTemplate(this.templates[0]);
    this.cheque = this.getEmptyCheque();
  }

  get formattedDate(): string {
    return this.chequePrintService.formatDate(this.cheque.chequeDate);
  }

  get formattedAmount(): string {
    return this.chequePrintService.formatAmount(this.cheque.amount);
  }

  updateCheque(value: ChequeData): void {
    this.cheque = { ...value };
  }

  updateAmountInWords(): void {
    this.cheque = {
      ...this.cheque,
      amountInWords: this.chequePrintService.amountToWords(this.cheque.amount)
    };
  }

  changeTemplate(templateId: string): void {
    const template = this.templates.find((item) => item.id === templateId);
    if (!template) return;

    this.selectedTemplate = this.cloneTemplate(template);
  }

  moveField(event: { field: ChequeFieldKey; top: number; left: number }): void {
    this.selectedField = event.field;
    this.selectedTemplate.fields[event.field] = {
      ...this.selectedTemplate.fields[event.field],
      top: event.top,
      left: event.left
    };
  }

  printCheque(): void {
    if (!this.isChequeValid()) return;
    this.chequePrintService.print();
  }

  async exportPdf(): Promise<void> {
    if (!this.isChequeValid()) return;

    try {
      await this.chequePrintService.exportChequePdf(this.selectedTemplate, this.cheque);
      this.showToast('success', 'PDF Exported', 'Cheque PDF has been generated.');
    } catch {
      this.showToast('danger', 'PDF Failed', 'Unable to export cheque PDF.');
    }
  }

  saveTemplate(): void {
    this.templates = this.chequePrintService.saveTemplate(this.selectedTemplate);
    this.showToast('success', 'Template Saved', 'Cheque alignment template saved in this browser.');
  }

  downloadTemplate(): void {
    this.chequePrintService.exportTemplateJson(this.selectedTemplate);
  }

  loadTemplate(file: File): void {
    this.chequePrintService.parseTemplateJson(file)
      .then((template) => {
        this.selectedTemplate = this.cloneTemplate(template);
        this.templates = this.chequePrintService.saveTemplate(template);
        this.showToast('success', 'Template Loaded', 'Template JSON loaded and saved.');
      })
      .catch(() => this.showToast('danger', 'Invalid Template', 'Please select a valid cheque template JSON file.'));
  }

  resetForm(): void {
    this.cheque = this.getEmptyCheque();
    this.selectedField = 'payeeName';
    this.changeTemplate(this.templates[0].id);
  }

  closeToast(): void {
    this.toast.show = false;
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
  }

  private isChequeValid(): boolean {
    if (!this.cheque.payeeName.trim()) {
      this.showToast('warning', 'Payee Required', 'Please enter the payee name.');
      return false;
    }

    if ((Number(this.cheque.amount) || 0) <= 0) {
      this.showToast('warning', 'Amount Required', 'Please enter an amount greater than zero.');
      return false;
    }

    if (!this.cheque.amountInWords.trim()) {
      this.showToast('warning', 'Words Required', 'Please enter amount in words.');
      return false;
    }

    if (!this.cheque.chequeDate) {
      this.showToast('warning', 'Date Required', 'Please select cheque date.');
      return false;
    }

    return true;
  }

  private getEmptyCheque(): ChequeData {
    const amount = 0;

    return {
      payeeName: '',
      amount,
      amountInWords: this.chequePrintService.amountToWords(amount),
      chequeDate: this.toDateInputValue(new Date())
    };
  }

  private toDateInputValue(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private showToast(type: ToastType, title: string, message: string): void {
    const icons: Record<ToastType, string> = {
      success: 'fas fa-check-circle',
      danger: 'fas fa-times-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle'
    };

    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }

    this.toast = { show: true, type, title, message, icon: icons[type] };
    this.toastTimer = setTimeout(() => this.closeToast(), 3500);
  }

  private cloneTemplate(template: ChequeTemplate): ChequeTemplate {
    return JSON.parse(JSON.stringify(template)) as ChequeTemplate;
  }
}
