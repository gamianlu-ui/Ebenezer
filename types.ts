
export enum TransactionType {
  ENTRY = 'ENTRADA',
  EXIT = 'SAIDA'
}

export interface Transaction {
  id: string;
  day: string;
  description: string;
  value: number;
  type: TransactionType;
  linkedId?: string; // ID da transação vinculada (ex: Oferta Ceia <-> Repasse SEMIDI)
  showInChurch?: boolean; // Se deve aparecer/ser contabilizado no resumo da igreja
}

export interface ReportHeader {
  month: string;
  year: string;
  previousBalance: number;
}

export const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export const isCoreChurchTransaction = (t: Transaction): boolean => {
  const desc = (t.description || '').toUpperCase();
  if (desc.includes("OFERTA DO CULTO DE CEIA")) return true;
  if (desc.includes("REPASSE SEMIDI")) return true;
  if (desc.includes("GRATIFICA")) return true;
  if (desc.includes("OBREIRO")) return true;
  return false;
};

export const shouldShowInChurch = (t: Transaction): boolean => {
  if (t.showInChurch === true) return true;
  if (t.showInChurch === false) return false;
  return isCoreChurchTransaction(t);
};
