export interface NormalizedSaleItem {
  billNumber: string;
  salesNumber: string;
  menuCode?: string;
  menuName: string;
  category: string;
  subcategory?: string;
  qty: number;
  price: number;
  revenue: number;
  datetime: Date;
  branch: string;
}
