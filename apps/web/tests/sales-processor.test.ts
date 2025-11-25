import { describe, it, expect } from "vitest";
import { groupOrderItems, createAnalytic } from "../lib/domain/sales-processor";
import type { OrderItemRaw, Order } from "../lib/domain/sales.types";

/* -------------------------------------------------------
 * groupOrderItems()
 * ----------------------------------------------------- */

describe("groupOrderItems()", () => {
  it("groups raw items by billNumber and converts them into Orders", () => {
    const raw: OrderItemRaw[] = [
      {
        billNumber: "B1",
        salesNumber: "S1",
        menuCode: "A001",
        menuName: "Americano",
        category: "DRINK",
        subcategory: "COFFEE",
        qty: 1,
        price: 20000,
        netTotal: 20000,
        datetime: new Date("2025-01-01T10:00:00Z"),
      },
      {
        billNumber: "B1",
        salesNumber: "S1",
        menuCode: "F001",
        menuName: "Croissant",
        category: "FOOD",
        subcategory: "BAKERY",
        qty: 1,
        price: 25000,
        netTotal: 25000,
        datetime: new Date("2025-01-01T10:00:00Z"),
      },
      {
        billNumber: "B2",
        salesNumber: "S2",
        menuCode: "A002",
        menuName: "Latte",
        category: "DRINK",
        subcategory: "COFFEE",
        qty: 1,
        price: 30000,
        netTotal: 30000,
        datetime: new Date("2025-01-01T11:00:00Z"),
      },
    ];

    const orders = groupOrderItems(raw);

    expect(orders.length).toBe(2);

    const order1 = orders.find((o) => o.billNumber === "B1")!;
    expect(order1.salesNumber).toBe("S1");
    expect(order1.items.length).toBe(2);
    expect(order1.datetime.toISOString()).toBe("2025-01-01T10:00:00.000Z");

    const order2 = orders.find((o) => o.billNumber === "B2")!;
    expect(order2.items.length).toBe(1);

    // OrderItem mapping check
    expect(order1.items[0]).toMatchObject({
      menuCode: "A001",
      menuName: "Americano",
      category: "DRINK",
      subcategory: "COFFEE",
      qty: 1,
      price: 20000,
      netTotal: 20000,
    });
  });

  it("converts undefined fields into null in final OrderItem", () => {
    const raw: OrderItemRaw[] = [
      {
        billNumber: "B1",
        salesNumber: "S1",
        menuName: "Cappuccino",
        category: "DRINK",
        qty: 1,
        price: 29000,
        netTotal: 29000,
        datetime: new Date(),
      },
    ];

    const [order] = groupOrderItems(raw);

    expect(order?.items[0]?.menuCode).toBe(null);
    expect(order?.items[0]?.subcategory).toBe(null);
  });
});

/* -------------------------------------------------------
 * createAnalytic()
 * ----------------------------------------------------- */

describe("createAnalytic()", () => {
  it("computes analytics from Orders correctly", () => {
    const orders: Order[] = [
      {
        billNumber: "B1",
        salesNumber: "S1",
        datetime: new Date(),
        items: [
          {
            menuCode: null,
            menuName: "A",
            category: "X",
            subcategory: null,
            qty: 1,
            price: 10000,
            netTotal: 10000,
          },
        ],
      },
      {
        billNumber: "B2",
        salesNumber: "S2",
        datetime: new Date(),
        items: [
          {
            menuCode: null,
            menuName: "B",
            category: "X",
            subcategory: null,
            qty: 1,
            price: 20000,
            netTotal: 20000,
          },
          {
            menuCode: null,
            menuName: "C",
            category: "Y",
            subcategory: null,
            qty: 1,
            price: 30000,
            netTotal: 30000,
          },
        ],
      },
    ];

    const analytic = createAnalytic(orders);

    expect(analytic).toMatchObject({
      name: "Summary",
      ordersCount: 2,
      revenueTotal: 60000,
      maxOrderItems: 2,
      minOrderItems: 1,
      avgOrderItems: 1.5,
      maxOrderRevenue: 50000,
      minOrderRevenue: 10000,
      avgOrderRevenue: 30000,
    });
  });

  it("returns zeroed analytic for empty orders array", () => {
    const analytic = createAnalytic([]);

    expect(analytic).toMatchObject({
      ordersCount: 0,
      revenueTotal: 0,
      maxOrderItems: 0,
      minOrderItems: 0,
      avgOrderItems: 0,
      maxOrderRevenue: 0,
      minOrderRevenue: 0,
      avgOrderRevenue: 0,
    });
  });
});
