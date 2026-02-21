import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from "playwright";
import { ensureApiReachable, ensureE2eData } from "./_helpers/data-setup";
import { prisma } from "@/lib/prisma/client";
import fs from "node:fs";
import path from "node:path";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

// Test scenario configurations
type MenuStrategistScenario = {
  name: string;
  description: string;
  analyticsData: {
    locationName: string;
    menuItems: Array<{
      menuName: string;
      quantity: number;
      totalRevenue: number;
      cogs?: number;
    }>;
  };
  expectedOutcomes: {
    shouldHavePromoteRecommendations: boolean;
    shouldHaveAdjustRecommendations: boolean;
    minPromoteItems?: number;
    minAdjustItems?: number;
    validateRecommendation?: (result: any) => boolean;
  };
};

const SCENARIOS: MenuStrategistScenario[] = [
  {
    name: "high-performers",
    description: "Location with clear high-performing items",
    analyticsData: {
      locationName: "Downtown Cafe - High Performers",
      menuItems: [
        {
          menuName: "Signature Burger",
          quantity: 150,
          totalRevenue: 2250,
          cogs: 900,
        },
        {
          menuName: "Classic Fries",
          quantity: 200,
          totalRevenue: 1000,
          cogs: 300,
        },
        {
          menuName: "Premium Steak",
          quantity: 50,
          totalRevenue: 2000,
          cogs: 1000,
        },
        { menuName: "House Salad", quantity: 30, totalRevenue: 270, cogs: 100 },
        { menuName: "Veggie Wrap", quantity: 20, totalRevenue: 180, cogs: 80 },
      ],
    },
    expectedOutcomes: {
      shouldHavePromoteRecommendations: true,
      shouldHaveAdjustRecommendations: true,
      minPromoteItems: 1,
      minAdjustItems: 1,
    },
  },
  {
    name: "mixed-performance",
    description: "Location with varied item performance",
    analyticsData: {
      locationName: "Midtown Bistro - Mixed",
      menuItems: [
        {
          menuName: "Breakfast Combo",
          quantity: 80,
          totalRevenue: 960,
          cogs: 400,
        },
        {
          menuName: "Lunch Special",
          quantity: 120,
          totalRevenue: 1560,
          cogs: 700,
        },
        {
          menuName: "Dinner Plate",
          quantity: 60,
          totalRevenue: 1200,
          cogs: 600,
        },
        { menuName: "Coffee", quantity: 300, totalRevenue: 900, cogs: 200 },
        {
          menuName: "Dessert Trio",
          quantity: 25,
          totalRevenue: 300,
          cogs: 150,
        },
        {
          menuName: "Smoothie Bowl",
          quantity: 40,
          totalRevenue: 360,
          cogs: 150,
        },
      ],
    },
    expectedOutcomes: {
      shouldHavePromoteRecommendations: true,
      shouldHaveAdjustRecommendations: true,
      minPromoteItems: 1,
    },
  },
  {
    name: "low-performers",
    description: "Location with mostly underperforming items",
    analyticsData: {
      locationName: "Suburban Diner - Struggling",
      menuItems: [
        {
          menuName: "Basic Sandwich",
          quantity: 15,
          totalRevenue: 120,
          cogs: 70,
        },
        {
          menuName: "Soup of the Day",
          quantity: 10,
          totalRevenue: 80,
          cogs: 40,
        },
        { menuName: "Side Salad", quantity: 8, totalRevenue: 64, cogs: 30 },
        { menuName: "House Pasta", quantity: 20, totalRevenue: 240, cogs: 120 },
      ],
    },
    expectedOutcomes: {
      shouldHavePromoteRecommendations: true,
      shouldHaveAdjustRecommendations: true,
      minAdjustItems: 2,
      validateRecommendation: (result) => {
        // Should focus on adjustments for low performers
        return (
          result.recommendations.adjust.length >=
          result.recommendations.promote.length
        );
      },
    },
  },
  {
    name: "high-margin-hidden-gems",
    description: "Location with high-margin low-volume items (hidden gems)",
    analyticsData: {
      locationName: "Boutique Eatery - Hidden Gems",
      menuItems: [
        {
          menuName: "Gourmet Pizza",
          quantity: 100,
          totalRevenue: 2000,
          cogs: 800,
        },
        {
          menuName: "Artisan Pasta",
          quantity: 40,
          totalRevenue: 800,
          cogs: 200,
        }, // High margin, low volume
        {
          menuName: "Craft Burger",
          quantity: 90,
          totalRevenue: 1350,
          cogs: 650,
        },
        {
          menuName: "Truffle Fries",
          quantity: 30,
          totalRevenue: 450,
          cogs: 100,
        }, // High margin, low volume
        {
          menuName: "Basic Nachos",
          quantity: 150,
          totalRevenue: 1200,
          cogs: 600,
        }, // Low margin, high volume
      ],
    },
    expectedOutcomes: {
      shouldHavePromoteRecommendations: true,
      shouldHaveAdjustRecommendations: true,
      minPromoteItems: 2,
      validateRecommendation: (result) => {
        // Should recommend promoting hidden gems (high margin items)
        const promoteNames = result.recommendations.promote.map((p: any) =>
          p.menuItem.toLowerCase(),
        );
        return promoteNames.some(
          (name: string) =>
            name.includes("artisan") || name.includes("truffle"),
        );
      },
    },
  },
];

// Helper to create analytics via Prisma
async function createAnalyticsData(
  scenario: MenuStrategistScenario,
): Promise<number> {
  // Create or find location
  let location = await prisma.location.findFirst({
    where: { name: scenario.analyticsData.locationName },
  });

  if (!location) {
    location = await prisma.location.create({
      data: {
        name: scenario.analyticsData.locationName,
        slug: scenario.name.toLowerCase().replace(/\s+/g, "-"),
      },
    });
  }

  // Create analytics record
  const analytics = await prisma.analytics.create({
    data: {
      locationId: location.id,
      sourceFile: `e2e-test-${scenario.name}.xlsx`,
      periodStart: new Date("2025-01-01"),
      periodEnd: new Date("2025-03-31"),
    },
  });

  // Create menu items
  for (const item of scenario.analyticsData.menuItems) {
    await prisma.analyticsMenuItem.create({
      data: {
        analyticsId: analytics.id,
        menuName: item.menuName,
        quantity: item.quantity,
        totalRevenue: item.totalRevenue,
        cogs: item.cogs,
      },
    });
  }

  return analytics.id;
}

// Test runner for a single scenario
async function runScenario(
  scenario: MenuStrategistScenario,
  browser: Browser,
): Promise<{
  success: boolean;
  error?: string;
  result?: any;
  screenshot?: string;
}> {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log(`\n🧪 Running scenario: ${scenario.name}`);
    console.log(`   ${scenario.description}`);

    // Setup test data
    const analyticsId = await createAnalyticsData(scenario);
    console.log(`   ✓ Created analytics data: ${analyticsId}`);

    // Navigate to agents page
    await page.goto(`${baseUrl}/agents`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=Menu Promotion Strategist", {
      timeout: 10000,
    });

    // Click on Menu Strategist card
    await page.click("text=Menu Promotion Strategist");
    await page.waitForURL(`${baseUrl}/menu-strategist`);
    console.log(`   ✓ Navigated to Menu Strategist page`);

    // Wait for the select dropdown to be visible
    const selectElement = page.locator("select");
    await selectElement.waitFor({ state: "visible", timeout: 10000 });

    // Select our test analytics by ID
    await selectElement.selectOption(analyticsId.toString());
    console.log(`   ✓ Selected analytics dataset`);

    // Click analyze button
    const analyzeButton = page.getByRole("button", {
      name: /analyze|generate/i,
    });
    await analyzeButton.waitFor({ state: "visible", timeout: 5000 });

    // Set up response capture BEFORE clicking
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/menu-strategist") && response.ok(),
      { timeout: 60000 },
    );

    await analyzeButton.click();
    console.log(`   ✓ Triggered analysis`);

    // Wait for and capture the API response
    const response = await responsePromise;
    const apiResponse = await response.json();
    console.log(`   ✓ Received API response`);

    // Wait for loading to complete
    const loader = page
      .locator('[role="status"]')
      .or(page.locator("text=/loading|analyzing/i"))
      .first();
    if (await loader.isVisible().catch(() => false)) {
      await loader.waitFor({ state: "hidden", timeout: 30000 });
    }

    // Check if results are displayed
    await page.waitForSelector("text=/promote|adjust|recommendation/i", {
      timeout: 30000,
    });
    console.log(`   ✓ Results displayed`);

    // Validate results
    if (!apiResponse) {
      throw new Error("No API response captured");
    }

    const { expectedOutcomes } = scenario;

    if (expectedOutcomes.shouldHavePromoteRecommendations) {
      if (
        !apiResponse.recommendations?.promote ||
        apiResponse.recommendations.promote.length === 0
      ) {
        throw new Error("Expected promote recommendations but got none");
      }
      if (
        expectedOutcomes.minPromoteItems &&
        apiResponse.recommendations.promote.length <
          expectedOutcomes.minPromoteItems
      ) {
        throw new Error(
          `Expected at least ${expectedOutcomes.minPromoteItems} promote items, got ${apiResponse.recommendations.promote.length}`,
        );
      }
    }

    if (expectedOutcomes.shouldHaveAdjustRecommendations) {
      if (
        !apiResponse.recommendations?.adjust ||
        apiResponse.recommendations.adjust.length === 0
      ) {
        throw new Error("Expected adjust recommendations but got none");
      }
      if (
        expectedOutcomes.minAdjustItems &&
        apiResponse.recommendations.adjust.length <
          expectedOutcomes.minAdjustItems
      ) {
        throw new Error(
          `Expected at least ${expectedOutcomes.minAdjustItems} adjust items, got ${apiResponse.recommendations.adjust.length}`,
        );
      }
    }

    if (expectedOutcomes.validateRecommendation) {
      if (!expectedOutcomes.validateRecommendation(apiResponse)) {
        throw new Error("Custom validation failed");
      }
    }

    console.log(`   ✅ Scenario passed`);
    console.log(
      `      - Promote recommendations: ${apiResponse.recommendations.promote.length}`,
    );
    console.log(
      `      - Adjust recommendations: ${apiResponse.recommendations.adjust.length}`,
    );

    return { success: true, result: apiResponse };
  } catch (error) {
    console.error(`   ❌ Scenario failed:`, error);
    const screenshot = path.join(
      process.cwd(),
      "e2e-artifacts",
      `menu-strategist-${scenario.name}-failure.png`,
    );
    await page.screenshot({ path: screenshot, fullPage: true });

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      screenshot,
    };
  } finally {
    await context.close();
  }
}

// Main test runner
async function run() {
  console.log("🚀 Menu Strategist Agent E2E Test Suite\n");

  await ensureE2eData({
    testId: "menu-strategist-agent",
    defaultPolicy: "reuse",
  });
  await ensureApiReachable(baseUrl);

  const artifactsDir = path.resolve(process.cwd(), "e2e-artifacts");
  fs.mkdirSync(artifactsDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  const results: Array<{
    scenario: string;
    success: boolean;
    error?: string;
  }> = [];

  try {
    // Run all scenarios
    for (const scenario of SCENARIOS) {
      const result = await runScenario(scenario, browser);
      results.push({
        scenario: scenario.name,
        success: result.success,
        error: result.error,
      });

      // Brief pause between scenarios
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 Test Summary");
    console.log("=".repeat(60));

    const passed = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    results.forEach((r) => {
      const status = r.success ? "✅ PASS" : "❌ FAIL";
      console.log(`${status} - ${r.scenario}`);
      if (r.error) {
        console.log(`       ${r.error}`);
      }
    });

    console.log("\n" + "=".repeat(60));
    console.log(
      `Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`,
    );
    console.log("=".repeat(60) + "\n");

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
