import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    await prisma.formResponse.create({
      data: { rawData, status: "novo" },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Jotform webhook error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
