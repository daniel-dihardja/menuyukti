# Database Seeding with menuyukti Package

## Overview

The database seeding system uses a two-step process:

1. **Python scripts** (in `packages/menuyukti/`) generate realistic scenario data using actual analytics calculations
2. **TypeScript scripts** (in `apps/web/`) read the JSON files and seed the PostgreSQL database

This ensures that seed data uses the same calculation logic as production analytics.

## Architecture

```
packages/menuyukti/
├── src/menuyukti/samples/          # Scenario definitions (Python)
│   ├── thriving_cafe.py
│   ├── struggling_restaurant.py
│   └── star_item.py
├── scripts/export_sample.py        # JSON generator script
└── seed_scenarios/                 # Generated JSON files
    ├── thriving_cafe.json
    ├── struggling_restaurant.json
    └── star_item.json

apps/web/
├── prisma/seed/scenarios.ts        # Legacy scenarios (to be migrated)
└── scripts/seed-scenarios.ts       # Database seeding script
```

## Generating Scenario Data

### 1. Add a New Scenario

Create a new Python file in `packages/menuyukti/src/menuyukti/samples/`:

```python
# my_scenario.py
from datetime import datetime, timedelta
from menuyukti.core.models.pos_transaction import POSTransactionLineItem

MY_SCENARIO_COGS_RATES = {
    "Menu Item 1": 0.35,
    "Menu Item 2": 0.42,
}

def my_scenario() -> list[POSTransactionLineItem]:
    """Scenario description."""
    # Generate realistic transaction data
    items = []
    # ... generate POSTransactionLineItem objects
    return items
```

### 2. Register in export_sample.py

Add your scenario to `packages/menuyukti/scripts/export_sample.py`:

```python
from menuyukti.samples.my_scenario import MY_SCENARIO_COGS_RATES, my_scenario

SCENARIOS = {
    # ... existing scenarios
    "my_scenario": {
        "fn": my_scenario,
        "description": "My scenario description",
        "cogs_rates": MY_SCENARIO_COGS_RATES,
    },
}
```

### 3. Generate JSON

```bash
cd /path/to/menuyukti/v3
uv run python packages/menuyukti/scripts/export_sample.py \
  --scenario my_scenario \
  --output-dir packages/menuyukti/seed_scenarios
```

This generates `packages/menuyukti/seed_scenarios/my_scenario.json` with:

- `order_menu_items`: Individual transaction line items with timestamps
- `analytics_menu_items`: Aggregated menu data with quantities, revenue, and COGS

## JSON Structure

```json
{
  "scenario": "thriving_cafe",
  "description": "Thriving downtown cafe with good margins",
  "order_menu_items": [
    {
      "bill_number": "ORD-TC-00001",
      "menu": "Cappuccino",
      "qty": 1,
      "price": 45000.0,
      "total_after_bill_discount": 45000.0,
      "order_time": "2025-01-01T07:00:00",
      "menu_category": "Beverages",
      "menu_category_detail": "Coffee"
    }
  ],
  "analytics_menu_items": [
    {
      "menu_name": "Cappuccino",
      "menu_category": "Beverages",
      "menu_category_detail": "Coffee",
      "quantity": 568,
      "total_revenue": 25560000.0,
      "cogs": 6390000.0
    }
  ]
}
```

## Seeding the Database

### Using TypeScript Seed Script

```bash
# List available scenarios
pnpm db:seed:scenario --list

# Seed a specific scenario
pnpm db:seed:scenario thriving-cafe

# Seed all scenarios
pnpm db:seed:scenario --all
```

### What Gets Seeded

For each scenario:

1. Location record (if doesn't exist)
2. Analytics record with:
   - Global KPIs (calculated from menu items)
   - Matrix JSON (menu engineering matrix)
   - Heatmap JSON (daily/weekly demand patterns)
   - Distribution JSON (portfolio analysis)
3. AnalyticsMenuItem records (individual menu items with COGS)

## Next Steps

### TODO: Migrate to JSON-based seeding

Currently, `apps/web/prisma/seed/scenarios.ts` contains hardcoded TypeScript data.

**Migration plan:**

1. ✅ Create Python scenarios in menuyukti package
2. ✅ Generate JSON files with export_sample.py
3. 🔄 Update seed-scenarios.ts to read JSON files
4. 🔄 Call menuyukti analytics API to compute matrix/heatmap
5. ⏳ Remove hardcoded data from scenarios.ts

### Future Enhancements

- Add more scenarios (premium steakhouse, fast casual, etc.)
- Support seeding from actual POS exports
- Add validation for scenario data quality
- CLI to list/compare scenarios before seeding

## Benefits

✅ **Realistic data**: Uses actual analytics calculation logic  
✅ **Maintainability**: Single source of truth in Python package  
✅ **Consistency**: Same calculations for dev/test/prod  
✅ **Flexibility**: Easy to add new scenarios  
✅ **Testing**: Scenarios can be used for e2e tests
