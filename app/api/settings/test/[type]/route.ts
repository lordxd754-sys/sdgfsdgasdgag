import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest, { params }: { params: { type: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type } = await Promise.resolve(params);
  const { data: settings } = await supabase.from("Settings").select("*").limit(1).maybeSingle() as any;

  if (type === "smtp") {
    if (!settings?.smtpHost || !settings?.smtpUser) {
      return NextResponse.json({ success: false, error: "SMTP não configurado" });
    }
    try {
      const transporter = nodemailer.createTransport({
        host: settings.smtpHost,
        port: settings.smtpPort ?? 587,
        secure: (settings.smtpPort ?? 587) === 465,
        auth: { user: settings.smtpUser, pass: settings.smtpPass ?? "" },
      });
      await transporter.verify();
      return NextResponse.json({ success: true });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message });
    }
  }

  if (type === "zapi") {
    if (!settings?.zapiToken || !settings?.zapiInstance) {
      return NextResponse.json({ success: false, error: "Zapi não configurado" });
    }
    try {
      const res = await fetch(
        `https://api.z-api.io/instances/${settings.zapiInstance}/token/${settings.zapiToken}/status`,
        { headers: { "Content-Type": "application/json" } }
      );
      const data = await res.json();
      if (data.connected) {
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ success: false, error: "Não conectado" });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message });
    }
  }

  if (type === "jotform") {
    return NextResponse.json({
      success: true,
      message: "Configure o webhook no Jotform para a URL mostrada",
    });
  }

  return NextResponse.json({ success: false, error: "Tipo desconhecido" });
}
