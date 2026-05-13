import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.settings.findFirst();
  return NextResponse.json(settings ?? {});
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const existing = await prisma.settings.findFirst();

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

  const settings = existing
    ? await prisma.settings.update({ where: { id: existing.id }, data })
    : await prisma.settings.create({ data });

  return NextResponse.json(settings);
}
