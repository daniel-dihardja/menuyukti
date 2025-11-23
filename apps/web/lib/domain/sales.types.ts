export type Analytic = {
  name: string;
  ordersCount: number;
  revenueTotal: number;
  maxOrderItems: number;
  avgOrderItems: number;
  minOrderItems: number;
  minOrderRevenue: number;
  maxOrderRevenue: number;
  avgOrderRevenue: number;
};

export type Order = {
  billNumber: string;
  salesNumber: string;
  items: OrderItem[];
  datetime: Date;
};

export type OrderItem = {
  billNumber: string;
  salesNumber: string;
  menuCode?: string;
  menuName: string;
  category: string;
  subcategory?: string;
  qty: number;
  price: number;
  discount?: number;
  revenue: number;
  datetime: Date;
  branch: string;
};
