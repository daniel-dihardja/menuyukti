import { Analytic, Order, OrderItemRaw } from "./sales.types";

export function groupOrderItems(raw: OrderItemRaw[]): Order[] {
  const map = new Map<string, Order>();

  for (const item of raw) {
    const key = item.billNumber;

    if (!map.has(key)) {
      map.set(key, {
        billNumber: item.billNumber,
        salesNumber: item.salesNumber,
        datetime: item.datetime, // take from the first item
        items: [],
      });
    }

    const order = map.get(key)!;

    // convert raw → final OrderItem
    order.items.push({
      menuCode: item.menuCode ?? null,
      menuName: item.menuName,
      category: item.category,
      subcategory: item.subcategory ?? null,
      price: item.price,
      qty: item.qty,
      netTotal: item.netTotal,
    });
  }

  return [...map.values()];
}

export function createAnalytic(orders: Order[], name = "Summary"): Analytic {
  const count = orders.length;

  if (count === 0) {
    return {
      name,
      ordersCount: 0,
      revenueTotal: 0,
      maxOrderItems: 0,
      avgOrderItems: 0,
      minOrderItems: 0,
      minOrderRevenue: 0,
      maxOrderRevenue: 0,
      avgOrderRevenue: 0,
    };
  }

  const itemsCount = orders.map((o) => o.items.length);
  const revenues = orders.map((o) =>
    o.items.reduce((sum, it) => sum + it.netTotal, 0)
  );

  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const avg = (arr: number[]) => sum(arr) / arr.length;

  return {
    name,
    ordersCount: count,
    revenueTotal: sum(revenues),

    maxOrderItems: Math.max(...itemsCount),
    minOrderItems: Math.min(...itemsCount),
    avgOrderItems: avg(itemsCount),

    maxOrderRevenue: Math.max(...revenues),
    minOrderRevenue: Math.min(...revenues),
    avgOrderRevenue: avg(revenues),
  };
}
