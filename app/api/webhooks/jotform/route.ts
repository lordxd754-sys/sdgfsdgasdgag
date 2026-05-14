import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  // Validate secret token in query param against the DB-stored jotformSecret.
  // Configure webhook URL in Jotform as: /api/webhooks/jotform?secret=SEU_SECRET
  const { data: settings } = await supabase.from("Settings").select("jotformSecret").limit(1).maybeSingle();
  const webhookSecret = (settings as any)?.jotformSecret as string | null | undefined;
  if (webhookSecret) {
    const { searchParams } = new URL(req.url);
    const provided = searchParams.get("secret") ?? "";
    const match =
      provided.length === webhookSecret.length &&
      timingSafeEqual(Buffer.from(provided), Buffer.from(webhookSecret));
    if (!match) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const contentType = req.headers.get("content-type") ?? "";
    let rawData: string;

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      const params = new URLSearchParams(text);
      const outer: Record<string, string> = {};
      params.forEach((v, k) => (outer[k] = v));

      // Jotform embeds the actual submission JSON in `rawRequest`
      if (outer.rawRequest) {
        try {
          const inner = JSON.parse(outer.rawRequest);
          // Merge top-level fields (q3_name, q4_email…) into the parsed object
          // so extraction works regardless of which format the form uses
          rawData = JSON.stringify({ ...outer, ...inner });
        } catch {
          rawData = JSON.stringify(outer);
        }
      } else {
        rawData = JSON.stringify(outer);
      }
    } else if (contentType.includes("application/json")) {
      const body = await req.json();
      rawData = JSON.stringify(body);
    } else {
      const text = await req.text();
      // Try to parse as JSON anyway
      try {
        JSON.parse(text);
        rawData = text;
      } catch {
        // Treat as form-urlencoded fallback
        const params = new URLSearchParams(text);
        const obj: Record<string, string> = {};
        params.forEach((v, k) => (obj[k] = v));
        rawData = JSON.stringify(obj);
      }
    }

    const { error } = await supabase
      .from("FormResponse")
      .insert({ rawData, status: "novo" });

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
