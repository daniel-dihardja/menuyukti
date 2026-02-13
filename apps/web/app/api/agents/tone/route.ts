import { NextResponse } from "next/server";

export const runtime = "nodejs";

type InvokeTonePayload = {
  analyticsId?: number;
};

const MOCK_OUTPUTS = {
  tone_profile: "Warm, modern, and appetite-forward with short, punchy sentences.",
  language_guidelines:
    "Use Bahasa + light English mix, friendly and confident; avoid jargon; keep lines under 90 chars.",
  caption_style: "Hook + menu highlight + social proof + CTA. Emojis sparingly.",
  hashtag_style: "3-5 branded + 3-5 local foodie tags. Keep under 10 total.",
  content_dos_donts:
    "Do spotlight top sellers and limited offers; don't overuse discounts or post long paragraphs.",
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as InvokeTonePayload;
  const analyticsId = Number(body?.analyticsId);

  if (!Number.isInteger(analyticsId)) {
    return NextResponse.json(
      { error: "INVALID_ANALYTICS_ID" },
      { status: 400 },
    );
  }

  return NextResponse.json({ outputs: MOCK_OUTPUTS });
}
