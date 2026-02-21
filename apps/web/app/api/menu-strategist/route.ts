import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { prisma } from "@/lib/prisma/client";

const RecommendationSchema = z.object({
  recommendations: z.object({
    promote: z.array(
      z.object({
        menuItem: z.string(),
        reason: z.string(),
        expectedImpact: z.enum(["high", "medium", "low"]),
      }),
    ),
    adjust: z.array(
      z.object({
        menuItem: z.string(),
        issue: z.string(),
        suggestion: z.string(),
        expectedImpact: z.enum(["high", "medium", "low"]),
      }),
    ),
  }),
});

export async function POST(request: Request) {
  try {
    const { analyticsId } = await request.json();

    if (!analyticsId) {
      return Response.json(
        { error: "analyticsId is required" },
        { status: 400 },
      );
    }

    // Convert analyticsId to number (it comes as string from JSON)
    const analyticsIdNum = Number(analyticsId);
    if (isNaN(analyticsIdNum)) {
      return Response.json(
        { error: "analyticsId must be a valid number" },
        { status: 400 },
      );
    }

    // Get menu analytics data from database
    const analytics = await prisma.analytics.findUnique({
      where: { id: analyticsIdNum },
      include: {
        menuItems: true,
        location: true,
      },
    });

    if (!analytics) {
      return Response.json({ error: "Analytics not found" }, { status: 404 });
    }

    // Format menu data for LLM
    const menuInfo = analytics.menuItems
      .map((item) => {
        const margin = item.cogs
          ? (
              ((Number(item.totalRevenue) - Number(item.cogs)) /
                Number(item.totalRevenue)) *
              100
            ).toFixed(1)
          : "N/A";
        return `${item.menuName}: Sales Qty: ${item.quantity}, Revenue: $${Number(
          item.totalRevenue,
        ).toFixed(2)}, Margin: ${margin}%`;
      })
      .join("\n");

    // Call Vercel AI SDK
    const result = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: RecommendationSchema,
      prompt: `You are a menu strategist analyzing restaurant sales data. 
      
Here is the menu item performance data:
${menuInfo}

Analyze this data and provide:
1. Items to promote (top performers and hidden gems with growth potential)
2. Items to adjust (underperformers that could be improved or removed)

Be concise and specific. Focus on actionable insights.`,
    });

    return Response.json(result.object);
  } catch (error) {
    console.error("Agent error:", error);
    return Response.json(
      { error: "Failed to generate recommendations" },
      { status: 500 },
    );
  }
}
