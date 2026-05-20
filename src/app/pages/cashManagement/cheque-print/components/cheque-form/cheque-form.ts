import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChequeData, ChequeFieldKey, ChequeTemplate } from '../../models/cheque-template.model';

@Component({
  selector: 'app-cheque-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cheque-form.html',
  styleUrl: './cheque-form.scss'
})
export class ChequeForm {
  @Input({ required: true }) cheque!: ChequeData;
  @Input({ required: true }) templates: ChequeTemplate[] = [];
  @Input({ required: true }) selectedTemplate!: ChequeTemplate;
  @Input() selectedField: ChequeFieldKey = 'payeeName';

  @Output() chequeChange = new EventEmitter<ChequeData>();
  @Output() templateChange = new EventEmitter<string>();
  @Output() selectedFieldChange = new EventEmitter<ChequeFieldKey>();
  @Output() amountChanged = new EventEmitter<void>();
  @Output() positionChange = new EventEmitter<void>();
  @Output() print = new EventEmitter<void>();
  @Output() exportPdf = new EventEmitter<void>();
  @Output() saveTemplate = new EventEmitter<void>();
  @Output() downloadTemplate = new EventEmitter<void>();
  @Output() loadTemplate = new EventEmitter<File>();
  @Output() reset = new EventEmitter<void>();

  readonly fieldKeys: ChequeFieldKey[] = ['date', 'payeeName', 'amount', 'amountInWords'];

  updateCheque(): void {
    this.chequeChange.emit({ ...this.cheque });
  }

  updateAmount(): void {
    this.updateCheque();
    this.amountChanged.emit();
  }

  onTemplateChange(id: string): void {
    this.templateChange.emit(id);
  }

  onTemplateFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      this.loadTemplate.emit(file);
      input.value = '';
    }
  }

  get fieldLabel(): string {
    return this.toLabel(this.selectedField);
  }

  toLabel(field: ChequeFieldKey): string {
    const labels: Record<ChequeFieldKey, string> = {
      date: 'Date',
      payeeName: 'Payee Name',
      amount: 'Amount',
      amountInWords: 'Amount In Words'
    };

    return labels[field];
  }
}
