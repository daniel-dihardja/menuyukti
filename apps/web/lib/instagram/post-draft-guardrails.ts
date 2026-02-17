export type PostDraftValidationCode =
  | "CAPTION_REQUIRED"
  | "CAPTION_TOO_LONG"
  | "CTA_REQUIRED"
  | "HASHTAG_MISSING"
  | "HASHTAG_TOO_MANY";

export type PostDraftValidationIssue = {
  code: PostDraftValidationCode;
  severity: "warning" | "blocked";
  message: string;
};

export type PostDraftGuardrailResult = {
  readiness: "ready" | "warning" | "blocked";
  issues: PostDraftValidationIssue[];
};

function parseHashtags(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((tag) => tag.startsWith("#"));
}

export function validatePostDraftGuardrails(input: {
  caption: string;
  cta: string;
  hashtagsRaw: string;
}): PostDraftGuardrailResult {
  const issues: PostDraftValidationIssue[] = [];

  const caption = input.caption.trim();
  const cta = input.cta.trim();
  const hashtags = parseHashtags(input.hashtagsRaw);

  if (!caption) {
    issues.push({
      code: "CAPTION_REQUIRED",
      severity: "blocked",
      message: "Caption is required.",
    });
  }

  if (caption.length > 2200) {
    issues.push({
      code: "CAPTION_TOO_LONG",
      severity: "blocked",
      message: "Caption exceeds Instagram 2200-character limit.",
    });
  }

  if (!cta) {
    issues.push({
      code: "CTA_REQUIRED",
      severity: "blocked",
      message: "Call-to-action is required.",
    });
  }

  if (hashtags.length === 0) {
    issues.push({
      code: "HASHTAG_MISSING",
      severity: "warning",
      message: "No hashtags were provided.",
    });
  }

  if (hashtags.length > 10) {
    issues.push({
      code: "HASHTAG_TOO_MANY",
      severity: "warning",
      message: "More than 10 hashtags may reduce readability.",
    });
  }

  const hasBlocked = issues.some((issue) => issue.severity === "blocked");
  if (hasBlocked) {
    return { readiness: "blocked", issues };
  }

  if (issues.length > 0) {
    return { readiness: "warning", issues };
  }

  return { readiness: "ready", issues };
}
