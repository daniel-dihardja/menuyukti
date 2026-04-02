import type { PostSlot } from "./_components/ai-artifact-panel";

function normalizeTheme(
  raw: unknown
): "holiday" | "promotion" | "engagement" {
  const t = String(raw ?? "promotion").toLowerCase();
  if (t === "holiday" || t === "engagement" || t === "promotion") return t;
  return "promotion";
}

function normalizeFormat(raw: unknown): "single" | "carousel" {
  const f = String(raw ?? "single").toLowerCase();
  return f === "carousel" ? "carousel" : "single";
}

/** Parses `post_schedule_json` from campaign_brief into UI post slots. */
export function parsePostScheduleJson(
  postScheduleJson: string | null | undefined
): PostSlot[] {
  if (postScheduleJson == null || !String(postScheduleJson).trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(postScheduleJson) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((row): PostSlot => {
      const slot = row as Record<string, unknown>;
      return {
        scheduled_date: String(slot.scheduled_date ?? ""),
        scheduled_time:
          slot.scheduled_time != null
            ? String(slot.scheduled_time)
            : undefined,
        theme: normalizeTheme(slot.theme),
        format: normalizeFormat(slot.format),
        focus_item:
          slot.focus_item != null ? String(slot.focus_item) : null,
        carousel_items: Array.isArray(slot.carousel_items)
          ? slot.carousel_items.map(String)
          : null,
        carousel_narrative:
          slot.carousel_narrative != null
            ? String(slot.carousel_narrative)
            : null,
        caption_seed: String(slot.caption_seed ?? ""),
      };
    });
  } catch {
    return [];
  }
}
