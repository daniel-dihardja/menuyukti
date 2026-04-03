import sharp from "sharp";

/** Presigned init-image upload + poll status — only REST paths Leonardo exposes for these. */
const BASE_V1 = "https://cloud.leonardo.ai/api/rest/v1";
/** Nano Banana and other v2 models — https://docs.leonardo.ai/docs/nano-banana */
const BASE_V2 = "https://cloud.leonardo.ai/api/rest/v2";

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_MS = 120_000;

const LOG_PREFIX = "[leonardo]";

/** Per Nano Banana docs — width/height must be one of these (excluding 0, which we avoid here). */
const NANO_BANANA_ALLOWED_DIMS = [
  672, 768, 832, 864, 896, 1024, 1152, 1184, 1248, 1344,
] as const;

function snapNanoBananaDimension(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 1024;
  let best: number = 1024;
  let bestDiff = Infinity;
  for (const d of NANO_BANANA_ALLOWED_DIMS) {
    const diff = Math.abs(d - n);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = d;
    }
  }
  return best;
}

function truncateBody(text: string, max = 1500): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…(truncated, ${text.length} chars total)`;
}

function logInfo(message: string, data?: Record<string, unknown>): void {
  if (data && Object.keys(data).length > 0) {
    console.info(LOG_PREFIX, message, data);
  } else {
    console.info(LOG_PREFIX, message);
  }
}

function logError(message: string, data?: Record<string, unknown>): void {
  if (data && Object.keys(data).length > 0) {
    console.error(LOG_PREFIX, message, data);
  } else {
    console.error(LOG_PREFIX, message);
  }
}

function getApiKey(): string {
  const key = process.env.LEONARDO_API_KEY?.trim();
  if (!key) {
    throw new Error("LEONARDO_API_KEY is not configured");
  }
  return key;
}

function authHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${getApiKey()}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

/** Nano Banana v2 image-reference strength (see Leonardo docs). */
export type ImageReferenceStrength = "LOW" | "MID" | "HIGH";

/** Config for remove-background via Nano Banana / v2 generations API. */
export type NanoBananaFlowConfig = {
  /** e.g. `gemini-2.5-flash-image` per https://docs.leonardo.ai/docs/nano-banana */
  model: string;
  prompt: string;
  /** Optional preset styles; omit or use `"None"` style UUID. */
  styleIds?: string[];
  imageReferenceStrength?: ImageReferenceStrength;
  promptEnhance?: "OFF" | "ON";
};

export type CreateNanoBananaParams = NanoBananaFlowConfig & {
  /** From POST /init-image after S3 upload */
  uploadedImageId: string;
  /** Output size — snapped to Nano Banana allowed dimensions */
  width: number;
  height: number;
};

function parseJsonBody(rawText: string): unknown {
  if (!rawText) return null;
  try {
    return JSON.parse(rawText);
  } catch {
    return null;
  }
}

/**
 * POST /api/rest/v2/generations returns `{ generationId }` at the top level.
 */
function generationIdFromCreateResponse(data: unknown): string | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const o = data as Record<string, unknown>;

  const direct = o.generationId;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  for (const key of ["generate", "data", "generation", "sdGenerationJob"] as const) {
    const nested = o[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      const inner = (nested as Record<string, unknown>).generationId;
      if (typeof inner === "string" && inner.trim()) return inner.trim();
    }
  }
  return null;
}

/** GET /api/rest/v1/generations/{id} — Hasura-style envelope */
type GetGenerationV1Response = {
  generations_by_pk?: {
    status?: string | null;
    generated_images?: { url?: string | null }[] | null;
  } | null;
};

/**
 * Request presigned upload details and upload the image bytes to Leonardo S3.
 * @param buffer — image bytes (WebP from our pipeline)
 * @param extension — must match buffer format: webp, png, jpg, or jpeg
 */
export async function uploadInitImage(
  buffer: Buffer,
  extension: "webp" | "png" | "jpg" | "jpeg",
): Promise<string> {
  logInfo("init-image: requesting presigned upload", { extension, bytes: buffer.length });

  const res = await fetch(`${BASE_V1}/init-image`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ extension }),
  });

  const rawText = await res.text();
  if (!res.ok) {
    logError("init-image: API error", { status: res.status, body: truncateBody(rawText) });
    throw new Error(`Leonardo init-image failed: ${res.status} ${truncateBody(rawText, 500)}`);
  }

  const data = parseJsonBody(rawText) as {
    uploadInitImage?: { id?: string | null; url?: string | null; fields?: string | null } | null;
  };
  const upload = data?.uploadInitImage;
  const id = upload?.id;
  const url = upload?.url;
  const fieldsRaw = upload?.fields;

  if (!id || !url || !fieldsRaw) {
    logError("init-image: unexpected response shape", {
      hasId: Boolean(id),
      hasUrl: Boolean(url),
      hasFields: Boolean(fieldsRaw),
    });
    throw new Error("Leonardo init-image response missing id, url, or fields");
  }

  let fields: Record<string, string>;
  try {
    fields = JSON.parse(fieldsRaw) as Record<string, string>;
  } catch {
    logError("init-image: fields JSON parse failed", {
      fieldsPreview: truncateBody(fieldsRaw, 200),
    });
    throw new Error("Leonardo init-image fields is not valid JSON");
  }

  const formData = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    formData.append(k, v);
  }

  const filename = extension === "jpeg" ? "image.jpg" : `image.${extension}`;
  const blob = new Blob([new Uint8Array(buffer)], {
    type:
      extension === "webp"
        ? "image/webp"
        : extension === "png"
          ? "image/png"
          : "image/jpeg",
  });
  formData.append("file", blob, filename);

  const putRes = await fetch(url, { method: "POST", body: formData });
  if (!putRes.ok && putRes.status !== 204) {
    const text = await putRes.text();
    logError("init-image: S3 presigned upload failed", {
      status: putRes.status,
      body: truncateBody(text),
    });
    throw new Error(`Leonardo S3 upload failed: ${putRes.status} ${truncateBody(text, 500)}`);
  }

  logInfo("init-image: upload complete", { initImageId: id });
  return id;
}

/**
 * Nano Banana — POST /api/rest/v2/generations.
 * @see https://docs.leonardo.ai/docs/nano-banana
 */
export async function createNanoBananaGeneration(params: CreateNanoBananaParams): Promise<string> {
  const {
    model,
    prompt,
    uploadedImageId,
    width,
    height,
    styleIds,
    imageReferenceStrength = "MID",
    promptEnhance = "OFF",
  } = params;

  const w = snapNanoBananaDimension(width);
  const h = snapNanoBananaDimension(height);

  const parameters: Record<string, unknown> = {
    prompt,
    quantity: 1,
    prompt_enhance: promptEnhance,
    width: w,
    height: h,
    guidances: {
      image_reference: [
        {
          image: {
            id: uploadedImageId,
            type: "UPLOADED",
          },
          strength: imageReferenceStrength,
        },
      ],
    },
  };

  if (styleIds && styleIds.length > 0) {
    parameters.style_ids = styleIds;
  }

  const body = {
    model,
    parameters,
    public: false,
  };

  logInfo("generations v2: creating job (Nano Banana)", {
    model,
    uploadedImageId,
    width: w,
    height: h,
    promptPreview: truncateBody(prompt, 120),
    hasStyleIds: Boolean(styleIds?.length),
  });

  const res = await fetch(`${BASE_V2}/generations`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  const rawText = await res.text();
  const data = parseJsonBody(rawText);

  if (data === null && rawText) {
    logError("generations v2: response is not JSON", { status: res.status, body: truncateBody(rawText) });
    throw new Error(`Leonardo v2 generations failed: ${res.status} (invalid JSON)`);
  }

  if (!res.ok) {
    logError("generations v2: API error", { status: res.status, body: truncateBody(rawText) });
    throw new Error(`Leonardo v2 generations failed: ${res.status} ${truncateBody(rawText, 500)}`);
  }

  let genId = generationIdFromCreateResponse(data);

  if (!genId) {
    const loc = res.headers.get("location") ?? res.headers.get("Location");
    if (loc) {
      const m = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i.exec(loc);
      if (m?.[1]) {
        genId = m[1];
        logInfo("generations v2: using generation id from Location header", { generationId: genId });
      }
    }
  }

  if (!genId) {
    const snippet = truncateBody(JSON.stringify(data), 800);
    logError("generations v2: missing generationId in response", { raw: snippet });
    throw new Error(
      `Leonardo v2 generations response missing generationId.${process.env.NODE_ENV === "development" ? ` Response: ${snippet}` : ""}`,
    );
  }

  logInfo("generations v2: job created", { generationId: genId });
  return genId;
}

/**
 * Poll until COMPLETE — GET /api/rest/v1/generations/{id} (only status endpoint Leonardo documents).
 */
export async function pollGeneration(generationId: string): Promise<string> {
  const started = Date.now();
  let pollCount = 0;
  let lastLoggedStatus: string | null = null;

  logInfo("poll: waiting for generation", { generationId, timeoutMs: POLL_MAX_MS });

  while (Date.now() - started < POLL_MAX_MS) {
    pollCount += 1;
    const res = await fetch(`${BASE_V1}/generations/${encodeURIComponent(generationId)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        Accept: "application/json",
      },
    });

    const rawText = await res.text();
    if (!res.ok) {
      logError("poll: GET generation failed", {
        generationId,
        pollCount,
        status: res.status,
        body: truncateBody(rawText),
      });
      throw new Error(`Leonardo get generation failed: ${res.status} ${truncateBody(rawText, 500)}`);
    }

    const data = parseJsonBody(rawText) as GetGenerationV1Response | null;
    const gen = data?.generations_by_pk;
    const status = gen?.status;

    if (status !== lastLoggedStatus) {
      lastLoggedStatus = status ?? null;
      logInfo("poll: status update", {
        generationId,
        pollCount,
        status: status ?? "undefined",
        elapsedMs: Date.now() - started,
        imageCount: gen?.generated_images?.length ?? 0,
      });
    }

    if (status === "FAILED") {
      logError("poll: generation FAILED", {
        generationId,
        snapshot: truncateBody(rawText, 1200),
      });
      throw new Error("Leonardo generation failed");
    }

    if (status === "COMPLETE") {
      const images = gen?.generated_images ?? [];
      const firstUrl = images.find((img) => img.url)?.url;
      if (firstUrl) {
        logInfo("poll: complete, have image URL", {
          generationId,
          polls: pollCount,
          resultUrlHost: (() => {
            try {
              return new URL(firstUrl).host;
            } catch {
              return "invalid-url";
            }
          })(),
        });
        return firstUrl;
      }
      logError("poll: COMPLETE but no URL on images", {
        generationId,
        imageRows: images.length,
        snapshot: truncateBody(rawText, 800),
      });
      throw new Error("Leonardo generation completed but no image URL was returned");
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  logError("poll: timed out", { generationId, pollCount, elapsedMs: Date.now() - started });
  throw new Error("Leonardo generation timed out");
}

/**
 * Full pipeline: upload init image → v2 Nano Banana generation → poll → download → encode WebP.
 */
export async function runRemoveBackground(
  webpBuffer: Buffer,
  flow: NanoBananaFlowConfig,
  width: number,
  height: number,
): Promise<Buffer> {
  logInfo("runRemoveBackground: start", {
    model: flow.model,
    width,
    height,
    inputBytes: webpBuffer.length,
    promptPreview: truncateBody(flow.prompt, 120),
  });

  const initImageId = await uploadInitImage(webpBuffer, "webp");
  const generationId = await createNanoBananaGeneration({
    ...flow,
    uploadedImageId: initImageId,
    width,
    height,
  });
  const imageUrl = await pollGeneration(generationId);

  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) {
    logError("runRemoveBackground: download result failed", {
      status: imgRes.status,
      urlHost: (() => {
        try {
          return new URL(imageUrl).host;
        } catch {
          return "invalid-url";
        }
      })(),
    });
    throw new Error(`Failed to download Leonardo result: ${imgRes.status}`);
  }

  const arrayBuffer = await imgRes.arrayBuffer();
  const raw = Buffer.from(arrayBuffer);
  const out = await sharp(raw).webp({ quality: 85 }).toBuffer();
  logInfo("runRemoveBackground: done", { outputBytes: out.length });
  return out;
}
