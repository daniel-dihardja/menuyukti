// JSON value used in API / analytics payloads
export type JsonValue =
  | string
  | number
  | boolean
  | JsonValue[]
  | { [key: string]: JsonValue };

// Prisma-compatible JSON input (NO raw null)
export type PrismaJsonInput = JsonValue;
