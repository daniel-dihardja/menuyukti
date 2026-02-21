import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { prisma } from "@/lib/prisma/client";

// Runtime configuration
export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds max

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Response schema
const RecommendationSchema = z.object({
  recommendations: z.object({
    promote: z.array(
      z.object({
        menuItem: z.string(),
        reason: z.string(),
        marketingAngle: z.string(),
        expectedImpact: z.enum(["high", "medium", "low"]),
        confidence: z.number().min(0).max(1),
      }),
    ),
    adjust: z.array(
      z.object({
        menuItem: z.string(),
        issue: z.string(),
        suggestion: z.enum(["pricing", "bundling", "promotion", "remove"]),
        reason: z.string(),
        expectedImpact: z.enum(["high", "medium", "low"]),
      }),
    ),
  }),
});

type RecommendationOutput = z.infer<typeof RecommendationSchema>;

// Helper: Parse and validate analyticsId
function parseAnalyticsId(value: string | null): number | null {
  if (!value) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Helper: Format matrix data for LLM
function formatMatrixForLLM(matrixRows: any[]): string {
  if (matrixRows.length === 0) return "No matrix data available.";

  const sorted = [...matrixRows].sort((a, b) => b.revenue - a.revenue);
  const top10 = sorted.slice(0, 10);
  const bottom5 = sorted.slice(-5).reverse();

  let output = "TOP PERFORMERS (by revenue):\n";
  top10.forEach((row, idx) => {
    output += `${idx + 1}. ${row.menuItem}\n`;
    output += `   Revenue: $${row.revenue.toFixed(2)} | Qty: ${row.quantity} | Margin: ${(row.marginPct * 100).toFixed(1)}%\n`;
    output += `   Action: ${row.action}\n\n`;
  });

  output += "\nUNDERPERFORMERS:\n";
  bottom5.forEach((row, idx) => {
    output += `${idx + 1}. ${row.menuItem}\n`;
    output += `   Revenue: $${row.revenue.toFixed(2)} | Qty: ${row.quantity} | Margin: ${(row.marginPct * 100).toFixed(1)}%\n`;
    output += `   Action: ${row.action}\n\n`;
  });

  return output;
}

// Helper: Build LLM prompt
function buildPrompt(data: {
  locationName: string;
  periodStart: string;
  periodEnd: string;
  matrixSummary: string;
  totalItems: number;
}): string {
  return `You are a restaurant menu promotion strategist. Analyze this sales data and provide actionable recommendations.

CONTEXT:
- Location: ${data.locationName}
- Period: ${data.periodStart} to ${data.periodEnd}
- Total menu items analyzed: ${data.totalItems}

SALES DATA:
${data.matrixSummary}

YOUR TASK:
1. Identify 3-5 items to actively PROMOTE in marketing campaigns
   - Focus on high margin items with good sales
   - Consider marketing appeal and customer interest
   - Provide specific marketing angles that can be used directly

2. Identify 2-4 items that need ADJUSTMENTS
   - Low performers that could be improved
   - Items with margin or pricing issues
   - Suggest specific actions (pricing, bundling, promotion, or removal)

REQUIREMENTS:
- Base all recommendations on the data provided
- Be specific and actionable
- Provide clear reasoning
- Rate expected impact (high/medium/low)
- Include confidence scores (0-1 scale)

OUTPUT FORMAT (JSON):
{
  "recommendations": {
    "promote": [
      {
        "menuItem": "Item name exactly as shown",
        "reason": "Data-backed reason",
        "marketingAngle": "Ready-to-use marketing copy",
        "expectedImpact": "high|medium|low",
        "confidence": 0.85
      }
    ],
    "adjust": [
      {
        "menuItem": "Item name exactly as shown",
        "issue": "Clear problem statement",
        "suggestion": "pricing|bundling|promotion|remove",
        "reason": "Explanation and data support",
        "expectedImpact": "high|medium|low"
      }
    ]
  }
}

Respond ONLY with valid JSON, no additional text.`;
}

// Main handler
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse and validate parameters
    const analyticsId = parseAnalyticsId(
      request.nextUrl.searchParams.get("analyticsId"),
    );

    if (!analyticsId) {
      return NextResponse.json(
        {
          error: "INVALID_ANALYTICS_ID",
          message: "Valid analyticsId required",
        },
        { status: 400 },
      );
    }

    // Load analytics snapshot
    const analytics = await prisma.analytics.findUnique({
      where: { id: analyticsId },
      select: {
        id: true,
        locationId: true,
        periodStart: true,
        periodEnd: true,
        matrixJson: true,
        location: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!analytics) {
      return NextResponse.json(
        {
          error: "ANALYTICS_NOT_FOUND",
          message: "Analytics snapshot not found",
        },
        { status: 404 },
      );
    }

    // Check for matrix data
    if (!analytics.matrixJson) {
      return NextResponse.json(
        {
          error: "NO_MATRIX_DATA",
          message: "Analytics snapshot has no matrix data",
        },
        { status: 409 },
      );
    }

    // Parse matrix data
    const matrixData = Array.isArray(analytics.matrixJson)
      ? analytics.matrixJson
      : [];

    if (matrixData.length === 0) {
      return NextResponse.json(
        { error: "EMPTY_MATRIX", message: "Matrix data is empty" },
        { status: 409 },
      );
    }

    // Format data for LLM
    const matrixSummary = formatMatrixForLLM(matrixData);
    const prompt = buildPrompt({
      locationName: analytics.location.name,
      periodStart:
        analytics.periodStart?.toISOString().split("T")[0] ?? "unknown",
      periodEnd: analytics.periodEnd?.toISOString().split("T")[0] ?? "unknown",
      matrixSummary,
      totalItems: matrixData.length,
    });

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a data-driven restaurant menu promotion strategist. Always respond with valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("No response from LLM");
    }

    // Parse and validate response
    const parsed = JSON.parse(responseContent);
    const validated = RecommendationSchema.parse(parsed);

    const processingTimeMs = Date.now() - startTime;

    // Return structured response
    return NextResponse.json({
      ...validated,
      context: {
        analyticsId: analytics.id,
        locationId: analytics.locationId,
        locationName: analytics.location.name,
        period: {
          start: analytics.periodStart?.toISOString() ?? null,
          end: analytics.periodEnd?.toISOString() ?? null,
        },
        totalItems: matrixData.length,
        dataQuality: matrixData.length >= 10 ? "good" : "limited",
      },
      metadata: {
        model: completion.model,
        generatedAt: new Date().toISOString(),
        processingTimeMs,
        usage: completion.usage,
      },
    });
  } catch (error) {
    console.error("Menu strategist error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "INVALID_LLM_RESPONSE",
          message: "LLM response validation failed",
          details: error.errors,
        },
        { status: 500 },
      );
    }

    if (error instanceof Error && error.message.includes("API key")) {
      return NextResponse.json(
        {
          error: "LLM_CONFIGURATION_ERROR",
          message: "OpenAI API key not configured",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
