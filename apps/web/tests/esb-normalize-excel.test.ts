import { describe, it, expect } from "vitest";
import {
  normalizeExcelRows,
  mapToOrderItem,
  normalizeAndMapSalesRows,
} from "@/lib/pos/esb/excel-normalizer";

describe("normalizeExcelRows", () => {
  it("normalizes keys and trims string values", () => {
    const input = [
      {
        " First Name ": " Alice  ",
        "Last   Name": "  Smith",
        " Age ": " 30 ",
      },
    ];

    const result = normalizeExcelRows(input);

    expect(result).toEqual([
      {
        FirstName: "Alice",
        LastName: "Smith",
        Age: 30,
      },
    ]);
  });

  it("converts empty, space-only, dash, and 'null' values to null", () => {
    const input = [
      {
        City: "",
        Area: " ",
        Code: "-",
        Note: "null",
        NoteUpper: "NULL",
      },
    ];

    const result = normalizeExcelRows(input);

    expect(result).toEqual([
      {
        City: null,
        Area: null,
        Code: null,
        Note: null,
        NoteUpper: null,
      },
    ]);
  });

  it("parses basic numeric values including floats and zero", () => {
    const input = [
      {
        Qty: "10",
        Price: "25000",
        Discount: "0",
        FloatValue: "12.34",
      },
    ];

    const result = normalizeExcelRows(input);

    expect(result).toEqual([
      {
        Qty: 10,
        Price: 25000,
        Discount: 0,
        FloatValue: 12.34,
      },
    ]);
  });

  it("preserves numeric strings with leading zeros", () => {
    const input = [
      {
        BillNumber: "000123",
        SalesNumber: "0456",
      },
    ];

    const result = normalizeExcelRows(input);

    expect(result[0]?.BillNumber).toBe("000123");
    expect(result[0]?.SalesNumber).toBe("0456");
  });

  it("converts Excel serial dates into JavaScript Date objects", () => {
    const input = [
      {
        SalesDate: "45659",
        SalesDateIn: "45659.5",
      },
    ];

    const result = normalizeExcelRows(input);
    const row = result[0];

    expect(row?.SalesDate).toBeInstanceOf(Date);
    expect(row?.SalesDateIn).toBeInstanceOf(Date);

    if (row?.SalesDate instanceof Date) {
      expect(row.SalesDate.getFullYear()).toBe(2025);
    }
  });

  it("keeps numeric values outside Excel serial range as numbers", () => {
    const input = [
      {
        SmallNumber: "123",
        LargeNumber: "90000",
      },
    ];

    const result = normalizeExcelRows(input);

    expect(result).toEqual([
      {
        SmallNumber: 123,
        LargeNumber: 90000,
      },
    ]);
  });

  it("handles mixed valid, null-like, numeric, string, and date values", () => {
    const input = [
      {
        Menu: "Latte",
        MenuCode: "",
        MenuNotes: " - ",
        Qty: "1",
        OrderTime: "45659.351331019",
      },
    ];

    const result = normalizeExcelRows(input);

    expect(result[0]?.Menu).toBe("Latte");
    expect(result[0]?.MenuCode).toBeNull();
    expect(result[0]?.MenuNotes).toBeNull();
    expect(result[0]?.Qty).toBe(1);
    expect(result[0]?.OrderTime).toBeInstanceOf(Date);
  });

  it("handles rows where some keys produce null and some produce values", () => {
    const input = [
      {
        A: "123",
        B: "null",
        C: "Hello",
        D: "-",
        E: "45659",
      },
    ];

    const result = normalizeExcelRows(input);

    expect(result[0]?.A).toBe(123);
    expect(result[0]?.B).toBeNull();
    expect(result[0]?.C).toBe("Hello");
    expect(result[0]?.D).toBeNull();
    expect(result[0]?.E).toBeInstanceOf(Date);
  });

  it("supports multiple rows and preserves order", () => {
    const input = [
      { A: "1", B: "2" },
      { A: "3", B: "4" },
    ];

    const result = normalizeExcelRows(input);

    expect(result).toEqual([
      { A: 1, B: 2 },
      { A: 3, B: 4 },
    ]);
  });

  it("does not mutate the original input row", () => {
    const input = [{ Name: " John " }];
    const cloned = structuredClone(input);

    normalizeExcelRows(input);

    expect(input).toEqual(cloned);
  });
});

/**
 * -------------------------------------------------------
 * TESTS FOR: mapToOrderItem
 * -------------------------------------------------------
 */

describe("mapToOrderItem", () => {
  it("maps a normalized row into an OrderItem", () => {
    const row = {
      BillNumber: "B001",
      SalesNumber: "S001",
      MenuCode: "M123",
      Menu: "Cappuccino",
      MenuCategory: "Drink",
      MenuCategoryDetail: "Coffee",
      Qty: 2,
      Price: 30000,
      Total: 60000,
      Discount: 0,
      SalesDateIn: new Date("2025-01-02T08:00:00Z"),
      Branch: "Jakarta",
    };

    const item = mapToOrderItem(row);

    expect(item).toEqual({
      billNumber: "B001",
      salesNumber: "S001",
      menuCode: "M123",
      menuName: "Cappuccino",
      category: "Drink",
      subcategory: "Coffee",
      qty: 2,
      price: 30000,
      revenue: 60000,
      discount: 0,
      datetime: new Date("2025-01-02T08:00:00Z"),
      branch: "Jakarta",
    });
  });

  it("handles missing optional fields", () => {
    const row = {
      BillNumber: "B002",
      SalesNumber: "S002",
      Menu: "Latte",
      MenuCategory: "Drink",
      Qty: 1,
      Price: 25000,
      Subtotal: 25000,
      SalesDate: new Date("2025-01-01T00:00:00Z"),
      Branch: "Bandung",
    };

    const item = mapToOrderItem(row);

    expect(item.menuCode).toBeUndefined();
    expect(item.subcategory).toBeUndefined();
    expect(item.revenue).toBe(25000);
    expect(item.datetime).toEqual(new Date("2025-01-01T00:00:00Z"));
  });
});

/**
 * -------------------------------------------------------
 * TESTS FOR: normalizeAndMapSalesRows
 * -------------------------------------------------------
 */

describe("normalizeAndMapSalesRows", () => {
  it("normalizes and maps rows end-to-end", () => {
    const input = [
      {
        " Bill Number ": " B100 ",
        " Sales Number ": " S100 ",
        Menu: " Americano ",
        MenuCode: " A01 ",
        MenuCategory: " Drink ",
        MenuCategoryDetail: " Coffee ",
        Qty: " 3 ",
        Price: " 20000 ",
        Total: " 60000 ",
        Discount: "0",
        SalesDateIn: "45659",
        Branch: " Jakarta ",
      },
    ];

    const [item] = normalizeAndMapSalesRows(input);

    expect(item?.billNumber).toBe("B100");
    expect(item?.salesNumber).toBe("S100");
    expect(item?.menuName).toBe("Americano");
    expect(item?.qty).toBe(3);
    expect(item?.revenue).toBe(60000);
    expect(item?.discount).toBe(0);
    expect(item?.datetime).toBeInstanceOf(Date);
    expect(item?.branch).toBe("Jakarta");
  });
});
