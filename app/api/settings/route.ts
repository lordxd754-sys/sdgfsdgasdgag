import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const MASKED = "••••••••";
const SENSITIVE_KEYS = ["jotformSecret", "zapiToken", "zapiClientToken", "smtpPass"] as const;

type SettingsRow = Record<string, unknown>;

function cleanString(v: unknown): string | null {
  if (typeof v !== "string") return v == null ? null : String(v).trim();
  const cleaned = v.trim();
  return cleaned ? cleaned : null;
}

function maskSettings(settings: SettingsRow | null): SettingsRow {
  if (!settings) return {};
  const out: SettingsRow = { ...settings };
  for (const key of SENSITIVE_KEYS) {
    if (out[key]) out[key] = MASKED;
  }
  return out;
}

// Returns true if value is the placeholder sentinel sent back from the masked GET
function isMasked(v: unknown): boolean {
  return v === MASKED || v === null || v === undefined || v === "";
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: settings } = await supabase.from("Settings").select("*").limit(1).maybeSingle();
  return NextResponse.json(maskSettings(settings as SettingsRow | null));
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { data: existing } = await supabase
    .from("Settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  // Build update payload; skip sensitive fields if the client sent back the masked placeholder
  const sensitive = existing as SettingsRow | null;
  const data: SettingsRow = {
    zapiInstance: cleanString(body.zapiInstance),
    zapiPhone: cleanString(body.zapiPhone),
    smtpHost: cleanString(body.smtpHost),
    smtpPort: body.smtpPort ? parseInt(String(body.smtpPort)) : null,
    smtpUser: cleanString(body.smtpUser),
    smtpFrom: cleanString(body.smtpFrom),
    followUpTemplate: cleanString(body.followUpTemplate),
    autoFollowUp: body.autoFollowUp ?? false,
    followUpHour: body.followUpHour ? parseInt(String(body.followUpHour)) : 8,
    workoutPreferences: cleanString(body.workoutPreferences),
    // Sensitive: only overwrite when user supplied a real new value
    jotformSecret: isMasked(body.jotformSecret) ? (sensitive?.jotformSecret ?? null) : cleanString(body.jotformSecret),
    zapiToken: isMasked(body.zapiToken) ? (sensitive?.zapiToken ?? null) : cleanString(body.zapiToken),
    zapiClientToken: isMasked(body.zapiClientToken) ? (sensitive?.zapiClientToken ?? null) : cleanString(body.zapiClientToken),
    smtpPass: isMasked(body.smtpPass) ? (sensitive?.smtpPass ?? null) : cleanString(body.smtpPass),
  };

  let settings: unknown;
  if (existing) {
    const { data: updated, error } = await supabase
      .from("Settings")
      .update(data)
      .eq("id", (existing as any).id)
      .select()
      .single();
    if (error) {
      console.error("Settings update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    settings = updated;
  } else {
    const { data: created, error } = await supabase
      .from("Settings")
      .insert({ id: crypto.randomUUID(), ...data })
      .select()
      .single();
    if (error) {
      console.error("Settings insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    settings = created;
  }

  return NextResponse.json(maskSettings(settings as SettingsRow | null));
}
