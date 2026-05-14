import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const MASKED = "••••••••";
const SENSITIVE_KEYS = ["jotformSecret", "zapiToken", "zapiClientToken", "smtpPass"] as const;

type SettingsRow = Record<string, unknown>;

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
    zapiInstance: body.zapiInstance ?? null,
    zapiPhone: body.zapiPhone ?? null,
    smtpHost: body.smtpHost ?? null,
    smtpPort: body.smtpPort ? parseInt(String(body.smtpPort)) : null,
    smtpUser: body.smtpUser ?? null,
    smtpFrom: body.smtpFrom ?? null,
    followUpTemplate: body.followUpTemplate ?? null,
    autoFollowUp: body.autoFollowUp ?? false,
    followUpHour: body.followUpHour ? parseInt(String(body.followUpHour)) : 8,
    workoutPreferences: body.workoutPreferences ?? null,
    // Sensitive: only overwrite when user supplied a real new value
    jotformSecret: isMasked(body.jotformSecret) ? (sensitive?.jotformSecret ?? null) : (body.jotformSecret ?? null),
    zapiToken: isMasked(body.zapiToken) ? (sensitive?.zapiToken ?? null) : (body.zapiToken ?? null),
    zapiClientToken: isMasked(body.zapiClientToken) ? (sensitive?.zapiClientToken ?? null) : (body.zapiClientToken ?? null),
    smtpPass: isMasked(body.smtpPass) ? (sensitive?.smtpPass ?? null) : (body.smtpPass ?? null),
  };

  let settings: unknown;
  if (existing) {
    const { data: updated } = await supabase
      .from("Settings")
      .update(data)
      .eq("id", (existing as any).id)
      .select()
      .single();
    settings = updated;
  } else {
    const { data: created } = await supabase.from("Settings").insert(data).select().single();
    settings = created;
  }

  return NextResponse.json(maskSettings(settings as SettingsRow | null));
}
