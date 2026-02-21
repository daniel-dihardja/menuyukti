# Database Seeding with Scenarios

This system provides realistic, scenario-based database seeding for development and testing.

## Overview

Instead of manually uploading Excel files and setting COGS values, you can instantly populate your database with complete, realistic restaurant data for specific business scenarios.

Each scenario includes:

- ✅ Location/branch information
- ✅ Complete analytics data with realistic sales figures
- ✅ All menu items with COGS values pre-set
- ✅ Aggregated KPIs (revenue, profit, margins, etc.)
- ✅ Period information (Q1 2025)

## Available Scenarios

### 1. `thriving-cafe`

**Thriving Downtown Cafe**

- High-performing cafe with good margins
- 13 menu items across beverages, food, and desserts
- ~63% average margin
- Great for testing promotion strategies on successful items

### 2. `struggling-restaurant`

**Struggling Family Restaurant**

- Low margins and underperforming items
- 8 menu items with poor performance
- ~35-40% margins
- Ideal for testing optimization recommendations

### 3. `premium-steakhouse`

**Premium Steakhouse**

- High-end restaurant with expensive menu
- 12 premium items (steaks, seafood, sides)
- High revenue per item
- Good for testing high-value menu strategies

### 4. `fast-casual-chain`

**Fast Casual Chain**

- High volume, consistent performance
- 10 bowl-focused menu items
- Moderate margins, high quantity
- Perfect for testing volume-based strategies

### 5. `hidden-gems-bistro`

**Hidden Gems Bistro**

- Underpriced high-quality items
- Mix of hidden gems and popular items
- Great for testing "promote hidden gems" logic
- 10 menu items with varied performance

### 6. `breakfast-spot`

**Morning Glory Breakfast**

- Breakfast-focused cafe
- 11 breakfast items + beverages
- High beverage volume
- Good for daypart-specific testing

## Usage

### List All Scenarios

```bash
pnpm db:seed:scenario:list
# or
pnpm db:seed:scenario --list
```

### Seed a Specific Scenario

```bash
pnpm db:seed:scenario thriving-cafe
```

This will:

1. Clear any existing data for that location
2. Create the location
3. Create analytics record with all KPIs
4. Create all menu items with COGS values set
5. Display summary statistics

### Seed All Scenarios

```bash
pnpm db:seed:scenario:all
# or
pnpm db:seed:scenario --all
```

This populates your database with all 6 scenarios at once.

### Direct Script Usage

```bash
# Show help
node --env-file=.env --import tsx scripts/seed-scenarios.ts

# List scenarios
node --env-file=.env --import tsx scripts/seed-scenarios.ts --list

# Seed specific scenario
node --env-file=.env --import tsx scripts/seed-scenarios.ts premium-steakhouse
```

## Development Workflow

### Quick Start with Fresh Data

```bash
# Reset database and seed with your preferred scenario
pnpm db:reset && pnpm db:seed:scenario thriving-cafe

# Or seed multiple scenarios for testing
pnpm db:reset && pnpm db:seed:scenario:all
```

### Testing Menu Strategist Agent

```bash
# Seed a specific scenario
pnpm db:seed:scenario hidden-gems-bistro

# Start the app
pnpm dev

# Navigate to /agents → Menu Strategist
# Select "Artisan Bistro" from the dropdown
# Click "Generate Recommendations"
```

### E2E Tests with Pre-seeded Data

The e2e tests create their own data, but you can also:

```bash
# Seed data first
pnpm db:seed:scenario:all

# Then run tests (will use existing data if policy is "reuse")
pnpm test:e2e:menu-strategist
```

## Adding New Scenarios

Edit [`prisma/seed/scenarios.ts`](../prisma/seed/scenarios.ts):

```typescript
export const SEED_SCENARIOS: Record<string, SeedScenario> = {
  "my-new-scenario": {
    id: "my-new-scenario",
    name: "My Restaurant Name",
    description: "Description of the business situation",
    location: {
      name: "Restaurant Name",
      slug: "restaurant-slug",
    },
    analytics: {
      sourceFile: "sales_report_q1_2025.xlsx",
      periodStart: new Date("2025-01-01"),
      periodEnd: new Date("2025-03-31"),
      menuItems: [
        {
          menuName: "Menu Item Name",
          quantity: 100,
          totalRevenue: 1500,
          cogs: 600,
          menuCategory: "Category",
        },
        // ... more items
      ],
    },
  },
};
```

## Benefits

### ✅ No Manual Excel Uploads

Skip the tedious process of creating and uploading Excel files.

### ✅ Consistent Test Data

Same data every time for reproducible testing.

### ✅ Instant Setup

Populate database in seconds instead of minutes.

### ✅ Complete Data

All COGS values pre-set, no manual entry needed.

### ✅ Realistic Scenarios

Real-world business situations for meaningful testing.

### ✅ Easy Cleanup

Re-run the command to reset and reseed anytime.

## Technical Details

### What Gets Created

For each scenario:

- `Location` record (branch)
- `Analytics` record with:
  - `totalOrders`, `totalItemsSold`
  - `totalRevenue`, `totalCogs`, `totalProfit`, `totalMargin`
  - `avgOrderRevenue`, `avgOrderItems`
  - `avgPopularity` (for menu engineering)
  - `min/max` order metrics
- `AnalyticsMenuItem` records for each menu item with:
  - `menuName`, `quantity`, `totalRevenue`
  - `cogs` (✅ pre-set!)
  - `menuCategory`

### Data Cleaning

The script automatically:

- Removes existing data for the location before seeding
- Ensures no duplicate locations
- Calculates all metrics from menu item data

## Troubleshooting

### "Location already exists"

Normal behavior - the script reuses existing locations and clears their data.

### Missing COGS values

All scenarios include COGS. If you see null values, check the scenario definition.

### Database connection errors

Ensure your `.env` file has the correct `DATABASE_URL`.

## See Also

- [Seed Scenarios Definition](../prisma/seed/scenarios.ts)
- [Seed Script](../scripts/seed-scenarios.ts)
- [E2E Tests](../e2e/menu-strategist-agent.e2e.ts)
