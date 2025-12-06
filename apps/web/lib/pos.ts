export interface POSConfig {
  name: string;
  excelName: string;
}

export const posList: POSConfig[] = [
  {
    name: "ESB",
    excelName: "Sales Recapitulation Detail Report",
  },
];

export function detectPOS(excelTitle: string): POSConfig | null {
  return posList.find((pos) => pos.excelName === excelTitle) || null;
}
