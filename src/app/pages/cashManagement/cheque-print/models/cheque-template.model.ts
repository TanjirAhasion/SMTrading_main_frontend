export type ChequeFieldKey = 'date' | 'payeeName' | 'amount' | 'amountInWords';

export interface ChequeData {
  payeeName: string;
  amount: number;
  amountInWords: string;
  chequeDate: string;
}

export interface ChequeFieldPosition {
  top: number;
  left: number;
  width: number;
  fontSize: number;
  fontWeight?: number;
  align?: 'left' | 'center' | 'right';
  lineHeight?: number;
}

export interface ChequeTemplate {
  id: string;
  bankName: string;
  accountName: string;
  chequeWidth: number;
  chequeHeight: number;
  backgroundImage: string;
  printOnA4: boolean;
  a4Top: number;
  a4Left: number;
  calibration: {
    xOffset: number;
    yOffset: number;
  };
  fields: Record<ChequeFieldKey, ChequeFieldPosition>;
}

export interface ChequeTemplateExport {
  version: 1;
  exportedAt: string;
  template: ChequeTemplate;
}
