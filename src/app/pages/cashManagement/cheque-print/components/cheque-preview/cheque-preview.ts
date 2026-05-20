import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  ChequeData,
  ChequeFieldKey,
  ChequeFieldPosition,
  ChequeTemplate
} from '../../models/cheque-template.model';

@Component({
  selector: 'app-cheque-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cheque-preview.html',
  styleUrl: './cheque-preview.scss'
})
export class ChequePreview {
  @Input({ required: true }) cheque!: ChequeData;
  @Input({ required: true }) template!: ChequeTemplate;
  @Input() selectedField: ChequeFieldKey = 'payeeName';
  @Input() formattedDate = '';
  @Input() formattedAmount = '';

  @Output() selectedFieldChange = new EventEmitter<ChequeFieldKey>();
  @Output() fieldMoved = new EventEmitter<{ field: ChequeFieldKey; top: number; left: number }>();

  private dragState?: {
    field: ChequeFieldKey;
    startX: number;
    startY: number;
    startTop: number;
    startLeft: number;
    mmPerPxX: number;
    mmPerPxY: number;
  };

  get printableStyle(): Record<string, string> {
    return {
      '--cheque-width': `${this.template.chequeWidth}mm`,
      '--cheque-height': `${this.template.chequeHeight}mm`,
      '--a4-top': `${this.template.a4Top}mm`,
      '--a4-left': `${this.template.a4Left}mm`,
      '--x-offset': `${this.template.calibration.xOffset}mm`,
      '--y-offset': `${this.template.calibration.yOffset}mm`,
      'width': `${this.template.chequeWidth}mm`,
      'height': `${this.template.chequeHeight}mm`,
      'background-image': `url("${this.template.backgroundImage}")`
    };
  }

  valueFor(field: ChequeFieldKey): string {
    const values: Record<ChequeFieldKey, string> = {
      date: this.formattedDate || 'DD/MM/YYYY',
      payeeName: this.cheque.payeeName || 'Payee Name',
      amount: `**${this.formattedAmount || '0.00'}**`,
      amountInWords: this.cheque.amountInWords || 'Amount in words only'
    };

    return values[field];
  }

  fieldStyle(field: ChequeFieldKey): Record<string, string> {
    const config = this.template.fields[field];
    return {
      top: `${config.top}mm`,
      left: `${config.left}mm`,
      width: `${config.width}mm`,
      fontSize: `${config.fontSize}mm`,
      fontWeight: String(config.fontWeight || 600),
      textAlign: config.align || 'left',
      lineHeight: String(config.lineHeight || 1.2)
    };
  }

  startDrag(event: PointerEvent, field: ChequeFieldKey, sheet: HTMLElement): void {
    event.preventDefault();
    const rect = sheet.getBoundingClientRect();
    const position = this.template.fields[field];

    this.selectedFieldChange.emit(field);
    this.dragState = {
      field,
      startX: event.clientX,
      startY: event.clientY,
      startTop: position.top,
      startLeft: position.left,
      mmPerPxX: this.template.chequeWidth / rect.width,
      mmPerPxY: this.template.chequeHeight / rect.height
    };

    sheet.setPointerCapture(event.pointerId);
  }

  drag(event: PointerEvent): void {
    if (!this.dragState) return;

    const left = this.roundHalf(this.dragState.startLeft + ((event.clientX - this.dragState.startX) * this.dragState.mmPerPxX));
    const top = this.roundHalf(this.dragState.startTop + ((event.clientY - this.dragState.startY) * this.dragState.mmPerPxY));

    this.fieldMoved.emit({ field: this.dragState.field, top: Math.max(0, top), left: Math.max(0, left) });
  }

  endDrag(): void {
    this.dragState = undefined;
  }

  trackField(field: ChequeFieldKey): ChequeFieldKey {
    return field;
  }

  get fields(): ChequeFieldKey[] {
    return Object.keys(this.template.fields) as ChequeFieldKey[];
  }

  private roundHalf(value: number): number {
    return Math.round(value * 2) / 2;
  }
}
