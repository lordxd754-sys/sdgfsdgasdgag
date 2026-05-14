import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    let rawData: string;

    if (contentType.includes("application/json")) {
      const body = await req.json();
      rawData = JSON.stringify(body);
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      const params = new URLSearchParams(text);
      const obj: Record<string, string> = {};
      params.forEach((v, k) => (obj[k] = v));
      rawData = JSON.stringify(obj);
    } else {
      const text = await req.text();
      rawData = text;
    }

    await supabase.from("FormResponse").insert({ rawData, status: "novo" });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Jotform webhook error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
