import { describe, it, expect } from "vitest";
import {
  normalizeExcelRows,
  mapToOrderItem,
  normalizeAndMapSalesRows,
} from "@/lib/pos/esb/excel-normalizer";

/* -------------------------------------------------------
 * TEST: normalizeExcelRows
 * ----------------------------------------------------- */

describe("normalizeExcelRows()", () => {
  it("normalizes keys and trims string values", () => {
    const input: Record<string, string>[] = [
      {
        " First Name ": " Alice  ",
        "Last   Name": "  Smith",
        " Age ": " 30 ",
      },
    ];

    expect(normalizeExcelRows(input)).toEqual([
      {
        FirstName: "Alice",
        LastName: "Smith",
        Age: 30,
      },
    ]);
  });

  it("converts empty, space-only, dash, and 'null' values to null", () => {
    const input: Record<string, string>[] = [
      {
        City: "",
        Area: " ",
        Code: "-",
        Note: "null",
        NoteUpper: "NULL",
      },
    ];

    expect(normalizeExcelRows(input)).toEqual([
      {
        City: null,
        Area: null,
        Code: null,
        Note: null,
        NoteUpper: null,
      },
    ]);
  });

  it("preserves numeric strings with leading zeros", () => {
    const input: Record<string, string>[] = [
      {
        BillNumber: "000123",
        SalesNumber: "0456",
      },
    ];

    const [row] = normalizeExcelRows(input);

    expect(row?.BillNumber).toBe("000123");
    expect(row?.SalesNumber).toBe("0456");
  });

  it("parses numeric strings into numbers when appropriate", () => {
    const input: Record<string, string>[] = [
      {
        Qty: "10",
        Price: "25000",
        Discount: "0",
        FloatValue: "12.5",
      },
    ];

    expect(normalizeExcelRows(input)).toEqual([
      {
        Qty: 10,
        Price: 25000,
        Discount: 0,
        FloatValue: 12.5,
      },
    ]);
  });

  it("converts Excel serial dates into JS Date objects", () => {
    const input: Record<string, string>[] = [
      { OrderTime: "45659" }, // Excel serial (string)
    ];

    const [row] = normalizeExcelRows(input);

    expect(row?.OrderTime).toBeInstanceOf(Date);
    expect((row?.OrderTime as Date).getFullYear()).toBe(2025);
  });
});

/* -------------------------------------------------------
 * TEST: mapToOrderItem
 * ----------------------------------------------------- */

describe("mapToOrderItem()", () => {
  it("maps a normalized row into an OrderItem", () => {
    const row = {
      BillNumber: "B001",
      SalesNumber: "S001",
      Menu: "Cappuccino",
      MenuCategory: "Drink",
      MenuCategoryDetail: "Coffee",
      Qty: 2,
      Price: 30000,
      TotalAfterBillDiscount: 54000,
      Branch: "Jakarta",
      OrderTime: new Date("2025-01-02T08:00:00Z"),
    };

    const item = mapToOrderItem(row);

    expect(item).toMatchObject({
      billNumber: "B001",
      salesNumber: "S001",
      menuName: "Cappuccino",
      category: "Drink",
      subcategory: "Coffee",
      qty: 2,
      price: 30000,
      netTotal: 54000,
      branch: "Jakarta",
    });

    expect(item.datetime).toBeInstanceOf(Date);
  });

  it("throws when OrderTime is missing", () => {
    const row = {
      BillNumber: "B123",
      SalesNumber: "S123",
      Menu: "Latte",
      MenuCategory: "Drink",
      Qty: 1,
      Price: 20000,
      TotalAfterBillDiscount: 20000,
      Branch: "Bandung",
      OrderTime: null,
    };

    expect(() => mapToOrderItem(row)).toThrow(/Missing datetime/);
  });
});

/* -------------------------------------------------------
 * TEST: normalizeAndMapSalesRows
 * ----------------------------------------------------- */

describe("normalizeAndMapSalesRows()", () => {
  it("normalizes and maps valid rows end-to-end", () => {
    const input: Record<string, string>[] = [
      {
        "Bill Number": " B100 ",
        "Sales Number": " S100 ",
        Menu: " Americano ",
        "Menu Category": " Drink ",
        Qty: " 3 ",
        Price: " 20000 ",
        TotalAfterBillDiscount: " 54000 ",
        Branch: " Jakarta ",
        OrderTime: "45659",
      },
    ];

    const [item] = normalizeAndMapSalesRows(input);

    expect(item).toMatchObject({
      billNumber: "B100",
      salesNumber: "S100",
      menuName: "Americano",
      category: "Drink",
      qty: 3,
      price: 20000,
      netTotal: 54000,
      branch: "Jakarta",
    });

    expect(item?.datetime).toBeInstanceOf(Date);
  });

  it("skips rows where SalesNumber is empty", () => {
    const input: Record<string, string>[] = [
      { "Bill Number": "B1", "Sales Number": "", OrderTime: "" }, // still valid shape
      { "Bill Number": "B2", "Sales Number": "S2", OrderTime: "45659" },
    ];

    const rows = normalizeAndMapSalesRows(input);

    expect(rows.length).toBe(1);
    expect(rows[0]?.salesNumber).toBe("S2");
  });
});
