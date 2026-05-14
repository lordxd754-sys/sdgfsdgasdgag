import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: settings } = await supabase.from("Settings").select("*").limit(1).maybeSingle();
  return NextResponse.json(settings ?? {});
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { data: existing } = await supabase.from("Settings").select("id").limit(1).maybeSingle();

  const data = {
    jotformSecret: body.jotformSecret ?? null,
    zapiToken: body.zapiToken ?? null,
    zapiInstance: body.zapiInstance ?? null,
    zapiPhone: body.zapiPhone ?? null,
    smtpHost: body.smtpHost ?? null,
    smtpPort: body.smtpPort ? parseInt(String(body.smtpPort)) : null,
    smtpUser: body.smtpUser ?? null,
    smtpPass: body.smtpPass ?? null,
    smtpFrom: body.smtpFrom ?? null,
    followUpTemplate: body.followUpTemplate ?? null,
    autoFollowUp: body.autoFollowUp ?? false,
    followUpHour: body.followUpHour ? parseInt(String(body.followUpHour)) : 8,
    workoutPreferences: body.workoutPreferences ?? null,
  };

  let settings: any;
  if (existing) {
    const { data: updated }: any = await supabase
      .from("Settings")
      .update(data)
      .eq("id", existing.id)
      .select()
      .single();
    settings = updated;
  } else {
    const { data: created }: any = await supabase.from("Settings").insert(data).select().single();
    settings = created;
  }

  return NextResponse.json(settings);
}
