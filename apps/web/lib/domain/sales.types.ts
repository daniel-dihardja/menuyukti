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
  orders: Order[];
};

/**
 * Final Order domain model
 * — groups multiple raw items
 * — contains a single datetime
 */
export type Order = {
  billNumber: string;
  salesNumber: string;
  datetime: Date;
  items: OrderItem[];
};

/**
 * Final, clean domain item inside an Order
 * — no billNumber
 * — no salesNumber
 * — no datetime
 * — all normalization done
 */
export type OrderItem = {
  menuCode: string | null;
  menuName: string;
  category: string;
  subcategory: string | null;
  price: number;
  qty: number;
  netTotal: number;
};

/**
 * Raw item from Excel normalization
 * — contains redundant metadata
 * — includes datetime per item
 */
export type OrderItemRaw = {
  billNumber: string;
  salesNumber: string;
  menuCode?: string;
  menuName: string;
  category: string;
  subcategory?: string;
  price: number;
  qty: number;
  netTotal: number;
  datetime: Date;
};
