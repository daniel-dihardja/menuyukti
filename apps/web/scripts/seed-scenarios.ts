/**
 * Scenario-based database seeder (DEPRECATED)
 *
 * ⚠️ This script is deprecated. Use seed-scenarios-v2.ts instead.
 * The v2 script uses real analytics calculations from the Python package.
 *
 * @deprecated Use pnpm db:seed:v2 instead
 *
 * Old Usage:
 *   pnpm db:seed:scenario thriving-cafe      # Specific scenario (deprecated)
 *
 * New Usage:
 *   pnpm db:seed:v2 thriving-cafe            # Use v2 with real calculations
 */

import { prisma } from "@/lib/prisma/client";
import {
  SEED_SCENARIOS,
  getScenario,
  getScenarioIds,
  listScenarios,
  type SeedScenario,
} from "../prisma/seed/scenarios";

type MenuItem = {
  menuName: string;
  quantity: number;
  totalRevenue: number;
  cogs: number;
  menuCategory?: string;
};

function generateMatrixJson(menuItems: MenuItem[], avgPopularity: number) {
  const items = menuItems.map((item) => {
    const margin = item.totalRevenue - item.cogs;
    const marginPercentage =
      item.totalRevenue > 0 ? margin / item.totalRevenue : 0;
    const popularityIndex =
      avgPopularity > 0 ? item.quantity / avgPopularity : 1;

    // Determine category based on popularity and margin
    let category: string;
    let action: string;

    if (popularityIndex >= 1 && marginPercentage >= 0.5) {
      category = "star";
      action = "keep";
    } else if (popularityIndex >= 1 && marginPercentage < 0.5) {
      category = "plow_horse";
      action = "reprice";
    } else if (popularityIndex < 1 && marginPercentage >= 0.5) {
      category = "puzzle";
      action = "promote";
    } else {
      category = "dog";
      action = "remove";
    }

    return {
      menu: item.menuName,
      quantity: item.quantity,
      total_revenue: item.totalRevenue,
      cogs: Math.round(item.cogs / item.quantity),
      total_cogs: item.cogs,
      contribution_margin: margin,
      contribution_margin_percentage: marginPercentage,
      margin_per_unit: margin / item.quantity,
      menu_category: item.menuCategory,
      category,
      action,
      popularity_index: popularityIndex,
      we_value: popularityIndex * marginPercentage,
    };
  });

  return {
    items,
    thresholds: {
      avg_popularity: avgPopularity,
      avg_margin_percentage: 0.5,
    },
  };
}

function generateHeatmapJson(menuItems: MenuItem[]) {
  return menuItems.map((item) => {
    // Generate hourly pattern (8am - 10pm)
    const dailyHeatmap = Array.from({ length: 24 }, (_, hour) => {
      let quantity = 0;

      // Business hours with realistic patterns
      if (hour >= 8 && hour <= 22) {
        // Peak hours: 11am-2pm (lunch) and 6pm-8pm (dinner)
        if ((hour >= 11 && hour <= 14) || (hour >= 18 && hour <= 20)) {
          quantity = Math.floor(
            (item.quantity / 7) * (0.15 + Math.random() * 0.1),
          );
        } else if (hour >= 8 && hour <= 10) {
          // Breakfast
          quantity = Math.floor(
            (item.quantity / 7) * (0.08 + Math.random() * 0.05),
          );
        } else {
          // Off-peak
          quantity = Math.floor(
            (item.quantity / 7) * (0.03 + Math.random() * 0.04),
          );
        }
      }

      return {
        hour: String(hour).padStart(2, "0"),
        quantity: Math.max(0, quantity),
      };
    });

    // Generate weekly pattern
    const weeklyHeatmap = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map(
      (day, index) => {
        // Weekend boost for some items
        const weekendMultiplier = index >= 5 ? 1.3 : 1.0;
        const quantity = Math.floor((item.quantity / 7) * weekendMultiplier);

        return {
          day,
          quantity: Math.max(0, quantity),
        };
      },
    );

    return {
      menu: item.menuName,
      dailyHeatmap,
      weeklyHeatmap,
    };
  });
}

function generateMatrixDistributionJson(matrixJson: {
  items: Array<{ category: string }>;
}) {
  const items = matrixJson.items;
  const distribution: Record<string, number> = {
    star: 0,
    plow_horse: 0,
    puzzle: 0,
    dog: 0,
  };

  items.forEach((item) => {
    distribution[item.category] = (distribution[item.category] || 0) + 1;
  });

  return {
    distribution,
    categories: Object.entries(distribution).map(([category, count]) => ({
      category,
      count,
      percentage: count / items.length,
    })),
  };
}

async function seedScenario(scenario: SeedScenario): Promise<void> {
  console.log(`\n📦 Seeding: ${scenario.name}`);
  console.log(`   ${scenario.description}`);

  // 1. Create or find location
  let location = await prisma.location.findUnique({
    where: { slug: scenario.location.slug },
  });

  if (!location) {
    location = await prisma.location.create({
      data: {
        name: scenario.location.name,
        slug: scenario.location.slug,
      },
    });
    console.log(`   ✓ Created location: ${location.name}`);
  } else {
    console.log(`   ✓ Using existing location: ${location.name}`);
  }

  // 2. Calculate aggregated metrics
  const menuItems = scenario.analytics.menuItems;
  const totalOrders = Math.ceil(
    menuItems.reduce((sum, item) => sum + item.quantity, 0) / 2.5,
  ); // Avg 2.5 items per order
  const totalItemsSold = menuItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const totalRevenue = menuItems.reduce(
    (sum, item) => sum + item.totalRevenue,
    0,
  );
  const totalCogs = menuItems.reduce((sum, item) => sum + item.cogs, 0);
  const totalProfit = totalRevenue - totalCogs;
  const totalMargin = totalRevenue > 0 ? totalProfit / totalRevenue : 0;
  const avgOrderRevenue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const avgOrderItems = totalOrders > 0 ? totalItemsSold / totalOrders : 0;

  // Calculate menu engineering metrics
  const avgPopularity =
    menuItems.length > 0
      ? menuItems.reduce((sum, item) => sum + item.quantity, 0) /
        menuItems.length
      : 0;

  // Generate analytics JSON data
  const matrixJson = generateMatrixJson(menuItems, avgPopularity);
  const matrixDistributionJson = generateMatrixDistributionJson(matrixJson);
  const heatmapJson = generateHeatmapJson(menuItems);
  const popularityJson = {
    items: menuItems.map((item) => ({
      menu: item.menuName,
      quantity: item.quantity,
      popularity_index: avgPopularity > 0 ? item.quantity / avgPopularity : 1,
    })),
  };

  // 3. Create analytics record
  const analytics = await prisma.analytics.create({
    data: {
      locationId: location.id,
      sourceFile: scenario.analytics.sourceFile,
      periodStart: scenario.analytics.periodStart,
      periodEnd: scenario.analytics.periodEnd,
      uploadedAt: new Date(),

      // Global KPIs
      totalOrders,
      totalItemsSold,
      totalRevenue,
      totalCogs,
      totalProfit,
      totalMargin,
      avgOrderRevenue,
      avgOrderItems,

      // Menu Engineering
      avgPopularity,

      // Min/Max
      maxOrderItems: Math.ceil(avgOrderItems * 1.8),
      minOrderItems: Math.max(1, Math.floor(avgOrderItems * 0.4)),
      maxOrderRevenue: avgOrderRevenue * 2.5,
      minOrderRevenue: avgOrderRevenue * 0.3,

      // Analytics JSON results
      matrixJson,
      matrixDistributionJson,
      heatmapJson,
      popularityJson,
    },
  });

  console.log(`   ✓ Created analytics record (ID: ${analytics.id})`);
  console.log(
    `      Period: ${analytics.periodStart?.toISOString().split("T")[0]} - ${analytics.periodEnd?.toISOString().split("T")[0]}`,
  );
  console.log(
    `      Revenue: $${totalRevenue.toFixed(2)} | Profit: $${totalProfit.toFixed(2)} | Margin: ${(totalMargin * 100).toFixed(1)}%`,
  );

  // 4. Create menu items with COGS
  for (const item of menuItems) {
    await prisma.analyticsMenuItem.create({
      data: {
        analyticsId: analytics.id,
        menuName: item.menuName,
        quantity: item.quantity,
        totalRevenue: item.totalRevenue,
        cogs: item.cogs,
        menuCategory: item.menuCategory,
      },
    });
  }

  console.log(
    `   ✓ Created ${menuItems.length} menu items (all with COGS set)`,
  );

  // Calculate some interesting stats
  const highMarginItems = menuItems.filter(
    (item) => (item.totalRevenue - item.cogs) / item.totalRevenue > 0.6,
  );
  const lowMarginItems = menuItems.filter(
    (item) => (item.totalRevenue - item.cogs) / item.totalRevenue < 0.3,
  );

  console.log(`      High margin items (>60%): ${highMarginItems.length}`);
  console.log(`      Low margin items (<30%): ${lowMarginItems.length}`);
}

async function clearExistingData(locationSlug?: string): Promise<void> {
  if (locationSlug) {
    const location = await prisma.location.findUnique({
      where: { slug: locationSlug },
      include: { analytics: true },
    });

    if (location) {
      // Delete analytics and related data
      await prisma.analyticsMenuItem.deleteMany({
        where: {
          analytics: {
            locationId: location.id,
          },
        },
      });

      await prisma.analytics.deleteMany({
        where: { locationId: location.id },
      });

      console.log(`   🗑️  Cleared existing data for: ${location.name}`);
    }
  } else {
    // Clear all seed scenario data
    const slugs = Object.values(SEED_SCENARIOS).map((s) => s.location.slug);
    const locations = await prisma.location.findMany({
      where: { slug: { in: slugs } },
      include: { analytics: true },
    });

    for (const location of locations) {
      await prisma.analyticsMenuItem.deleteMany({
        where: {
          analytics: {
            locationId: location.id,
          },
        },
      });

      await prisma.analytics.deleteMany({
        where: { locationId: location.id },
      });
    }

    if (locations.length > 0) {
      console.log(
        `   🗑️  Cleared existing data for ${locations.length} locations`,
      );
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log("🌱 Menuyukti Scenario Seeder\n");

  // List scenarios
  if (command === "--list" || command === "-l") {
    console.log("Available scenarios:\n");
    const scenarios = listScenarios();
    scenarios.forEach((s) => {
      console.log(`  ${s.id.padEnd(25)} ${s.name}`);
      console.log(`  ${" ".repeat(25)} ${s.description}\n`);
    });
    process.exit(0);
  }

  // Seed all scenarios
  if (command === "--all" || command === "-a") {
    console.log("Seeding all scenarios...\n");
    await clearExistingData();

    const scenarioIds = getScenarioIds();
    for (const id of scenarioIds) {
      const scenario = getScenario(id);
      if (scenario) {
        await seedScenario(scenario);
      }
    }

    console.log("\n✅ All scenarios seeded successfully!");
    console.log(`   Total: ${scenarioIds.length} scenarios`);
    process.exit(0);
  }

  // Seed specific scenario
  if (command) {
    const scenario = getScenario(command);
    if (!scenario) {
      console.error(`❌ Error: Scenario "${command}" not found`);
      console.log("\nUse --list to see available scenarios");
      process.exit(1);
    }

    await clearExistingData(scenario.location.slug);
    await seedScenario(scenario);

    console.log("\n✅ Scenario seeded successfully!");
    process.exit(0);
  }

  // Interactive mode
  console.log("Usage:");
  console.log(
    "  pnpm db:seed:scenario --list              List available scenarios",
  );
  console.log("  pnpm db:seed:scenario --all               Seed all scenarios");
  console.log(
    "  pnpm db:seed:scenario <scenario-id>       Seed specific scenario",
  );
  console.log("\nExamples:");
  console.log("  pnpm db:seed:scenario thriving-cafe");
  console.log("  pnpm db:seed:scenario premium-steakhouse");

  process.exit(0);
}

main()
  .catch((error) => {
    console.error("\n❌ Error seeding database:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
