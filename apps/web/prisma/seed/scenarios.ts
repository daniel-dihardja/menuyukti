/**
 * Seed Scenarios for Menuyukti
 *
 * These scenarios simulate complete data as if:
 * 1. User uploaded a sales report Excel
 * 2. Set COGS values for menu items
 * 3. Saved the data
 *
 * Each scenario represents a real-world business situation
 */

export type SeedScenario = {
  id: string;
  name: string;
  description: string;
  location: {
    name: string;
    slug: string;
  };
  analytics: {
    sourceFile: string;
    periodStart: Date;
    periodEnd: Date;
    menuItems: Array<{
      menuName: string;
      quantity: number;
      totalRevenue: number;
      cogs: number;
      menuCategory?: string;
    }>;
  };
};

export const SEED_SCENARIOS: Record<string, SeedScenario> = {
  "thriving-cafe": {
    id: "thriving-cafe",
    name: "Thriving Downtown Cafe",
    description: "High-performing cafe with good margins and diverse menu",
    location: {
      name: "Downtown Cafe",
      slug: "downtown-cafe",
    },
    analytics: {
      sourceFile: "sales_report_q1_2025.xlsx",
      periodStart: new Date("2025-01-01"),
      periodEnd: new Date("2025-03-31"),
      menuItems: [
        // Beverages - High volume, good margin
        {
          menuName: "Signature Latte",
          quantity: 450,
          totalRevenue: 4500,
          cogs: 1350,
          menuCategory: "Beverages",
        },
        {
          menuName: "Cappuccino",
          quantity: 380,
          totalRevenue: 3420,
          cogs: 1140,
          menuCategory: "Beverages",
        },
        {
          menuName: "Americano",
          quantity: 320,
          totalRevenue: 2880,
          cogs: 800,
          menuCategory: "Beverages",
        },
        {
          menuName: "Cold Brew",
          quantity: 280,
          totalRevenue: 3360,
          cogs: 1120,
          menuCategory: "Beverages",
        },
        {
          menuName: "Matcha Latte",
          quantity: 190,
          totalRevenue: 2470,
          cogs: 950,
          menuCategory: "Beverages",
        },

        // Food - Mixed performance
        {
          menuName: "Croissant",
          quantity: 340,
          totalRevenue: 2380,
          cogs: 1020,
          menuCategory: "Pastries",
        },
        {
          menuName: "Avocado Toast",
          quantity: 220,
          totalRevenue: 2860,
          cogs: 1100,
          menuCategory: "Food",
        },
        {
          menuName: "Breakfast Sandwich",
          quantity: 180,
          totalRevenue: 2340,
          cogs: 1080,
          menuCategory: "Food",
        },
        {
          menuName: "Caesar Salad",
          quantity: 150,
          totalRevenue: 2250,
          cogs: 900,
          menuCategory: "Food",
        },
        {
          menuName: "Club Sandwich",
          quantity: 140,
          totalRevenue: 2100,
          cogs: 980,
          menuCategory: "Food",
        },

        // Desserts - High margin
        {
          menuName: "Tiramisu",
          quantity: 95,
          totalRevenue: 1425,
          cogs: 475,
          menuCategory: "Desserts",
        },
        {
          menuName: "Cheesecake",
          quantity: 88,
          totalRevenue: 1320,
          cogs: 440,
          menuCategory: "Desserts",
        },
        {
          menuName: "Brownie",
          quantity: 120,
          totalRevenue: 960,
          cogs: 360,
          menuCategory: "Desserts",
        },
      ],
    },
  },

  "struggling-restaurant": {
    id: "struggling-restaurant",
    name: "Struggling Family Restaurant",
    description: "Restaurant with low margins and underperforming items",
    location: {
      name: "Family Kitchen",
      slug: "family-kitchen",
    },
    analytics: {
      sourceFile: "sales_report_q1_2025.xlsx",
      periodStart: new Date("2025-01-01"),
      periodEnd: new Date("2025-03-31"),
      menuItems: [
        // Low performers
        {
          menuName: "Basic Burger",
          quantity: 45,
          totalRevenue: 540,
          cogs: 360,
          menuCategory: "Mains",
        },
        {
          menuName: "Chicken Wings",
          quantity: 38,
          totalRevenue: 456,
          cogs: 304,
          menuCategory: "Appetizers",
        },
        {
          menuName: "French Fries",
          quantity: 62,
          totalRevenue: 372,
          cogs: 186,
          menuCategory: "Sides",
        },
        {
          menuName: "House Pasta",
          quantity: 28,
          totalRevenue: 420,
          cogs: 252,
          menuCategory: "Mains",
        },
        {
          menuName: "Veggie Burger",
          quantity: 15,
          totalRevenue: 225,
          cogs: 150,
          menuCategory: "Mains",
        },
        {
          menuName: "Onion Rings",
          quantity: 22,
          totalRevenue: 220,
          cogs: 132,
          menuCategory: "Sides",
        },
        {
          menuName: "Garden Salad",
          quantity: 18,
          totalRevenue: 216,
          cogs: 108,
          menuCategory: "Salads",
        },
        {
          menuName: "Soup of the Day",
          quantity: 12,
          totalRevenue: 144,
          cogs: 96,
          menuCategory: "Soups",
        },
      ],
    },
  },

  "premium-steakhouse": {
    id: "premium-steakhouse",
    name: "Premium Steakhouse",
    description: "High-end restaurant with expensive items and high margins",
    location: {
      name: "The Steakhouse",
      slug: "the-steakhouse",
    },
    analytics: {
      sourceFile: "sales_report_q1_2025.xlsx",
      periodStart: new Date("2025-01-01"),
      periodEnd: new Date("2025-03-31"),
      menuItems: [
        // Premium mains
        {
          menuName: "Wagyu Ribeye",
          quantity: 85,
          totalRevenue: 12750,
          cogs: 5950,
          menuCategory: "Steaks",
        },
        {
          menuName: "Prime NY Strip",
          quantity: 120,
          totalRevenue: 14400,
          cogs: 6720,
          menuCategory: "Steaks",
        },
        {
          menuName: "Filet Mignon",
          quantity: 95,
          totalRevenue: 12350,
          cogs: 5700,
          menuCategory: "Steaks",
        },
        {
          menuName: "Grilled Lobster",
          quantity: 48,
          totalRevenue: 8640,
          cogs: 4320,
          menuCategory: "Seafood",
        },
        {
          menuName: "Pan-Seared Salmon",
          quantity: 78,
          totalRevenue: 3900,
          cogs: 1950,
          menuCategory: "Seafood",
        },

        // Sides - High margin
        {
          menuName: "Truffle Mashed Potatoes",
          quantity: 145,
          totalRevenue: 2175,
          cogs: 580,
          menuCategory: "Sides",
        },
        {
          menuName: "Grilled Asparagus",
          quantity: 132,
          totalRevenue: 1980,
          cogs: 528,
          menuCategory: "Sides",
        },
        {
          menuName: "Mac & Cheese",
          quantity: 98,
          totalRevenue: 1470,
          cogs: 490,
          menuCategory: "Sides",
        },

        // Appetizers
        {
          menuName: "Beef Carpaccio",
          quantity: 65,
          totalRevenue: 1625,
          cogs: 650,
          menuCategory: "Appetizers",
        },
        {
          menuName: "Caesar Salad",
          quantity: 88,
          totalRevenue: 1320,
          cogs: 440,
          menuCategory: "Salads",
        },

        // Desserts
        {
          menuName: "Chocolate Lava Cake",
          quantity: 72,
          totalRevenue: 1080,
          cogs: 288,
          menuCategory: "Desserts",
        },
        {
          menuName: "Crème Brûlée",
          quantity: 58,
          totalRevenue: 870,
          cogs: 232,
          menuCategory: "Desserts",
        },
      ],
    },
  },

  "fast-casual-chain": {
    id: "fast-casual-chain",
    name: "Fast Casual Chain",
    description: "High volume, consistent performance across menu",
    location: {
      name: "Fresh Bowl Co",
      slug: "fresh-bowl-co",
    },
    analytics: {
      sourceFile: "sales_report_q1_2025.xlsx",
      periodStart: new Date("2025-01-01"),
      periodEnd: new Date("2025-03-31"),
      menuItems: [
        // Bowls - Core products
        {
          menuName: "Chicken Teriyaki Bowl",
          quantity: 680,
          totalRevenue: 8840,
          cogs: 4080,
          menuCategory: "Bowls",
        },
        {
          menuName: "Beef Bibimbap Bowl",
          quantity: 520,
          totalRevenue: 7280,
          cogs: 3640,
          menuCategory: "Bowls",
        },
        {
          menuName: "Tofu Poke Bowl",
          quantity: 450,
          totalRevenue: 5850,
          cogs: 2475,
          menuCategory: "Bowls",
        },
        {
          menuName: "Salmon Bowl",
          quantity: 380,
          totalRevenue: 6080,
          cogs: 3040,
          menuCategory: "Bowls",
        },
        {
          menuName: "Veggie Buddha Bowl",
          quantity: 320,
          totalRevenue: 3840,
          cogs: 1600,
          menuCategory: "Bowls",
        },

        // Sides
        {
          menuName: "Spring Rolls",
          quantity: 420,
          totalRevenue: 2100,
          cogs: 840,
          menuCategory: "Sides",
        },
        {
          menuName: "Edamame",
          quantity: 380,
          totalRevenue: 1520,
          cogs: 456,
          menuCategory: "Sides",
        },
        {
          menuName: "Miso Soup",
          quantity: 290,
          totalRevenue: 1160,
          cogs: 348,
          menuCategory: "Sides",
        },

        // Beverages
        {
          menuName: "Green Tea",
          quantity: 540,
          totalRevenue: 2160,
          cogs: 540,
          menuCategory: "Beverages",
        },
        {
          menuName: "Bubble Tea",
          quantity: 380,
          totalRevenue: 2280,
          cogs: 760,
          menuCategory: "Beverages",
        },
      ],
    },
  },

  "hidden-gems-bistro": {
    id: "hidden-gems-bistro",
    name: "Hidden Gems Bistro",
    description: "Restaurant with underpriced high-quality items (hidden gems)",
    location: {
      name: "Artisan Bistro",
      slug: "artisan-bistro",
    },
    analytics: {
      sourceFile: "sales_report_q1_2025.xlsx",
      periodStart: new Date("2025-01-01"),
      periodEnd: new Date("2025-03-31"),
      menuItems: [
        // High margin, low volume (hidden gems)
        {
          menuName: "Duck Confit",
          quantity: 32,
          totalRevenue: 960,
          cogs: 224,
          menuCategory: "Mains",
        },
        {
          menuName: "Truffle Risotto",
          quantity: 28,
          totalRevenue: 700,
          cogs: 175,
          menuCategory: "Mains",
        },
        {
          menuName: "Beef Wellington",
          quantity: 18,
          totalRevenue: 810,
          cogs: 243,
          menuCategory: "Mains",
        },
        {
          menuName: "Lobster Ravioli",
          quantity: 24,
          totalRevenue: 720,
          cogs: 216,
          menuCategory: "Pasta",
        },

        // Popular but lower margin
        {
          menuName: "Margherita Pizza",
          quantity: 180,
          totalRevenue: 2520,
          cogs: 1260,
          menuCategory: "Pizza",
        },
        {
          menuName: "Chicken Parmesan",
          quantity: 145,
          totalRevenue: 2175,
          cogs: 1088,
          menuCategory: "Mains",
        },
        {
          menuName: "Spaghetti Carbonara",
          quantity: 128,
          totalRevenue: 1792,
          cogs: 896,
          menuCategory: "Pasta",
        },

        // Appetizers
        {
          menuName: "Burrata",
          quantity: 65,
          totalRevenue: 975,
          cogs: 325,
          menuCategory: "Appetizers",
        },
        {
          menuName: "Calamari Fritti",
          quantity: 88,
          totalRevenue: 1232,
          cogs: 528,
          menuCategory: "Appetizers",
        },
        {
          menuName: "Bruschetta",
          quantity: 95,
          totalRevenue: 950,
          cogs: 285,
          menuCategory: "Appetizers",
        },
      ],
    },
  },

  "breakfast-spot": {
    id: "breakfast-spot",
    name: "Morning Glory Breakfast",
    description: "Breakfast-focused cafe with morning rush patterns",
    location: {
      name: "Morning Glory",
      slug: "morning-glory",
    },
    analytics: {
      sourceFile: "sales_report_q1_2025.xlsx",
      periodStart: new Date("2025-01-01"),
      periodEnd: new Date("2025-03-31"),
      menuItems: [
        // Breakfast classics
        {
          menuName: "Eggs Benedict",
          quantity: 280,
          totalRevenue: 3920,
          cogs: 1400,
          menuCategory: "Breakfast",
        },
        {
          menuName: "Pancake Stack",
          quantity: 320,
          totalRevenue: 3520,
          cogs: 1280,
          menuCategory: "Breakfast",
        },
        {
          menuName: "Avocado Toast",
          quantity: 380,
          totalRevenue: 4940,
          cogs: 1900,
          menuCategory: "Breakfast",
        },
        {
          menuName: "French Toast",
          quantity: 240,
          totalRevenue: 2880,
          cogs: 1080,
          menuCategory: "Breakfast",
        },
        {
          menuName: "Breakfast Burrito",
          quantity: 210,
          totalRevenue: 2730,
          cogs: 1260,
          menuCategory: "Breakfast",
        },
        {
          menuName: "Omelette Station",
          quantity: 195,
          totalRevenue: 2730,
          cogs: 1170,
          menuCategory: "Breakfast",
        },

        // Beverages - High volume
        {
          menuName: "Coffee",
          quantity: 680,
          totalRevenue: 3400,
          cogs: 680,
          menuCategory: "Beverages",
        },
        {
          menuName: "Fresh Orange Juice",
          quantity: 420,
          totalRevenue: 2520,
          cogs: 840,
          menuCategory: "Beverages",
        },
        {
          menuName: "Smoothie",
          quantity: 285,
          totalRevenue: 2565,
          cogs: 855,
          menuCategory: "Beverages",
        },

        // Bakery
        {
          menuName: "Croissant",
          quantity: 310,
          totalRevenue: 2170,
          cogs: 930,
          menuCategory: "Bakery",
        },
        {
          menuName: "Muffin",
          quantity: 280,
          totalRevenue: 1680,
          cogs: 560,
          menuCategory: "Bakery",
        },
      ],
    },
  },
};

// Helper to get all scenario IDs
export const getScenarioIds = (): string[] => Object.keys(SEED_SCENARIOS);

// Helper to get scenario by ID
export const getScenario = (id: string): SeedScenario | undefined =>
  SEED_SCENARIOS[id];

// Helper to list all scenarios
export const listScenarios = (): Array<{
  id: string;
  name: string;
  description: string;
}> =>
  Object.values(SEED_SCENARIOS).map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
  }));
