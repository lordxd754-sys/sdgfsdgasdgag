import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { supabase } from "@/lib/supabase";

function safeEqual(a: string, b: string) {
  return (
    a.length === b.length &&
    timingSafeEqual(Buffer.from(a), Buffer.from(b))
  );
}

async function getWebhookSecrets() {
  const secrets = [process.env.JOTFORM_WEBHOOK_SECRET?.trim()].filter(Boolean) as string[];

  const { data: settings } = await supabase
    .from("Settings")
    .select("jotformSecret")
    .limit(1)
    .maybeSingle();

  const settingsSecret = (settings as any)?.jotformSecret?.trim();
  if (settingsSecret) secrets.push(settingsSecret);

  return Array.from(new Set(secrets));
}

async function parseWebhookBody(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const outer = await req.json();
    if (outer?.rawRequest) {
      try {
        const inner = JSON.parse(outer.rawRequest);
        return JSON.stringify({ ...outer, ...inner });
      } catch {
        return JSON.stringify(outer);
      }
    }
    return JSON.stringify(outer);
  }

  const outer: Record<string, string> = {};

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    form.forEach((v, k) => {
      outer[k] = typeof v === "string" ? v : v.name;
    });
  } else {
    const text = await req.text();
    if (!contentType.includes("application/x-www-form-urlencoded")) {
      try {
        JSON.parse(text);
        return text;
      } catch {
        // Fall through and try URLSearchParams; Jotform usually sends form-style payloads.
      }
    }

    const params = new URLSearchParams(text);
    params.forEach((v, k) => (outer[k] = v));
  }

  if (outer.rawRequest) {
    try {
      const inner = JSON.parse(outer.rawRequest);
      return JSON.stringify({ ...outer, ...inner });
    } catch {
      return JSON.stringify(outer);
    }
  }

  return JSON.stringify(outer);
}

export async function POST(req: NextRequest) {
  // Validate secret token in query param against env or DB-stored jotformSecret.
  // Configure webhook URL in Jotform as: /api/webhooks/jotform?secret=SEU_SECRET
  const { searchParams } = new URL(req.url);
  const provided = searchParams.get("secret") ?? req.headers.get("x-jotform-secret") ?? "";
  const secrets = await getWebhookSecrets();
  if (secrets.length > 0 && !secrets.some((secret) => safeEqual(provided, secret))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rawData = await parseWebhookBody(req);

    const { error } = await supabase
      .from("FormResponse")
      .insert({ id: crypto.randomUUID(), rawData, status: "novo" });

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Jotform webhook error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
