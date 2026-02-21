/**
 * Scenario-based database seeder
 *
 * Seeds the database with realistic restaurant data for specific business scenarios.
 * Simulates the complete workflow: sales upload → COGS setting → save
 *
 * Usage:
 *   pnpm db:seed:scenario                    # Interactive menu
 *   pnpm db:seed:scenario thriving-cafe      # Specific scenario
 *   pnpm db:seed:scenario --all              # All scenarios
 *   pnpm db:seed:scenario --list             # List available scenarios
 */

import { prisma } from "@/lib/prisma/client";
import {
  SEED_SCENARIOS,
  getScenario,
  getScenarioIds,
  listScenarios,
  type SeedScenario,
} from "../prisma/seed/scenarios";

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
