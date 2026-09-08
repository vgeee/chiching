import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { importParsedAlerts } from "@/lib/import-alerts";

const emailSchema = z.object({
  sourceId: z.string().min(1),
  subject: z.string(),
  body: z.string(),
  receivedAt: z.coerce.date(),
});

const bodySchema = z.object({
  emails: z.array(emailSchema).min(1).max(50),
});

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.INGEST_SECRET;
  if (!expected) return false; // refuse to run unconfigured
  const provided = req.headers.get("x-import-secret") ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const result = await importParsedAlerts(parsed.data.emails);
  return NextResponse.json(result);
}
