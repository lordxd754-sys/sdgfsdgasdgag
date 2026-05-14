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
    const zapiInstance = settings?.zapiInstance?.trim();
    const zapiToken = settings?.zapiToken?.trim();
    const zapiClientToken = settings?.zapiClientToken?.trim();

    if (!zapiInstance || !zapiToken || !zapiClientToken) {
      return NextResponse.json({
        success: false,
        error: "Zapi não configurado: preencha Instance ID, Token e Client Token.",
      });
    }
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Client-Token": zapiClientToken,
      };

      const res = await fetch(
        `https://api.z-api.io/instances/${zapiInstance}/token/${zapiToken}/status`,
        { headers }
      );
      if (!res.ok) {
        const errorText = await res.text();
        return NextResponse.json({
          success: false,
          error: `Zapi respondeu HTTP ${res.status}${errorText ? `: ${errorText}` : ""}`,
        });
      }
      const data = await res.json();
      if (data.connected && data.smartphoneConnected !== false) {
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({
        success: false,
        error: data.error ?? data.message ?? "Instância Zapi não conectada ao WhatsApp.",
      });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message });
    }
  }

  if (type === "jotform") {
    const hasSecret = Boolean(settings?.jotformSecret?.trim() || process.env.JOTFORM_WEBHOOK_SECRET?.trim());
    if (!hasSecret) {
      return NextResponse.json({
        success: false,
        error: "Configure um Webhook Secret antes de conectar o Jotform.",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Configure o webhook no Jotform para a URL mostrada",
    });
  }

  return NextResponse.json({ success: false, error: "Tipo desconhecido" });
}
