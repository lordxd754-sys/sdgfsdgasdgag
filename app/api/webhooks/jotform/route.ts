import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual, randomUUID } from "crypto";
import { supabase } from "@/lib/supabase";
import { extractStudentFromRaw, extractPhotoUrlsFromRaw } from "@/lib/form-utils";

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

async function parseWebhookBody(req: NextRequest): Promise<string> {
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
    form.forEach((v, k) => { outer[k] = typeof v === "string" ? v : v.name; });
  } else {
    const text = await req.text();
    if (!contentType.includes("application/x-www-form-urlencoded")) {
      try { JSON.parse(text); return text; } catch { /* fall through */ }
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

async function downloadAndStorePhoto(
  url: string,
  studentId: string
): Promise<string | null> {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!resp.ok) return null;

    const contentType = resp.headers.get("content-type") ?? "image/jpeg";
    const extMap: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    const ext = extMap[contentType.split(";")[0].trim()] ?? "jpg";
    const filename = `${randomUUID()}.${ext}`;
    const storagePath = `${studentId}/${filename}`;

    const buffer = Buffer.from(await resp.arrayBuffer());

    const { error } = await supabase.storage
      .from("student-photos")
      .upload(storagePath, buffer, { contentType, upsert: false });

    if (error) {
      console.error("Storage upload error:", error.message);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("student-photos")
      .getPublicUrl(storagePath);

    return urlData.publicUrl;
  } catch (err) {
    console.error("Photo download error:", err);
    return null;
  }
}

async function autoCreateStudent(
  rawData: string,
  formResponseId: string
): Promise<void> {
  const fields = extractStudentFromRaw(rawData);

  // Need at minimum a name to create the student
  if (!fields.name) return;

  const now = new Date().toISOString();
  const studentId = randomUUID();

  const daysPerWeek = parseInt(fields.daysPerWeek) || 3;
  const sessionDuration = parseInt(fields.sessionDuration) || 60;

  const levelMap: Record<string, string> = {
    iniciante: "iniciante",
    beginner: "iniciante",
    intermediário: "intermediario",
    intermediario: "intermediario",
    intermediate: "intermediario",
    avançado: "avancado",
    avancado: "avancado",
    advanced: "avancado",
  };
  const level =
    levelMap[fields.level.toLowerCase().trim()] ?? "iniciante";

  // Try to create student — handle duplicate email gracefully
  const { data: student, error } = await supabase
    .from("Student")
    .insert({
      id: studentId,
      name: fields.name,
      email: fields.email || null,
      phone: fields.phone || null,
      birthdate: fields.birthdate ? new Date(fields.birthdate).toISOString() : null,
      city: fields.city || null,
      goal: fields.goal || null,
      level,
      daysPerWeek,
      sessionDuration,
      restrictions: fields.restrictions || null,
      equipment: fields.equipment || null,
      notes: fields.notes || null,
      status: "ativo",
      updatedAt: now,
    })
    .select("id")
    .single();

  let resolvedStudentId = studentId;

  if (error) {
    if (error.code === "23505" && fields.email) {
      // Email already registered — link FormResponse to existing student
      const { data: existing } = await supabase
        .from("Student")
        .select("id")
        .eq("email", fields.email)
        .single();
      if (existing) resolvedStudentId = (existing as any).id;
    } else {
      console.error("Auto-create student error:", error.message);
      return;
    }
  } else {
    resolvedStudentId = (student as any).id;
  }

  // Link FormResponse to the student and mark as processed
  await supabase
    .from("FormResponse")
    .update({ status: "processado", studentId: resolvedStudentId })
    .eq("id", formResponseId);

  // Download and store any photo URLs found in the form data
  const photoUrls = extractPhotoUrlsFromRaw(rawData);
  if (photoUrls.length > 0) {
    await Promise.allSettled(
      photoUrls.map(async (url, i) => {
        const publicUrl = await downloadAndStorePhoto(url, resolvedStudentId);
        if (!publicUrl) return;
        await supabase.from("Photo").insert({
          id: randomUUID(),
          studentId: resolvedStudentId,
          url: publicUrl,
          angle: i === 0 ? "frente" : i === 1 ? "costas" : i === 2 ? "lateral" : null,
        });
      })
    );
  }
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const provided = searchParams.get("secret") ?? req.headers.get("x-jotform-secret") ?? "";
  const secrets = await getWebhookSecrets();
  if (secrets.length > 0 && !secrets.some((s) => safeEqual(provided, s))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rawData = await parseWebhookBody(req);
    const formResponseId = randomUUID();

    const { error } = await supabase
      .from("FormResponse")
      .insert({ id: formResponseId, rawData, status: "novo" });

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    // Auto-create student in background — don't block the webhook response
    autoCreateStudent(rawData, formResponseId).catch((err) =>
      console.error("autoCreateStudent error:", err)
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Jotform webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
