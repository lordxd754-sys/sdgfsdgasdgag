import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { extractStudentFromRaw, extractPhotoUrlsFromRaw } from "@/lib/form-utils";

async function downloadAndStorePhoto(url: string, studentId: string): Promise<string | null> {
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
    if (error) return null;
    const { data: urlData } = supabase.storage.from("student-photos").getPublicUrl(storagePath);
    return urlData.publicUrl;
  } catch {
    return null;
  }
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await Promise.resolve(params);

  const { data: form } = await supabase
    .from("FormResponse")
    .select("id, rawData, status, studentId")
    .eq("id", id)
    .single();

  if (!form) return NextResponse.json({ error: "Formulário não encontrado" }, { status: 404 });
  if ((form as any).status === "processado") {
    return NextResponse.json({ error: "Formulário já processado" }, { status: 400 });
  }

  const fields = extractStudentFromRaw((form as any).rawData);

  if (!fields.name) {
    return NextResponse.json(
      { error: "Não foi possível extrair o nome do formulário. Verifique os dados e crie o aluno manualmente." },
      { status: 422 }
    );
  }

  const levelMap: Record<string, string> = {
    iniciante: "iniciante", beginner: "iniciante",
    intermediário: "intermediario", intermediario: "intermediario", intermediate: "intermediario",
    avançado: "avancado", avancado: "avancado", advanced: "avancado",
  };
  const level = levelMap[fields.level.toLowerCase().trim()] ?? "iniciante";

  const studentId = randomUUID();
  const now = new Date().toISOString();

  const { data: student, error: insertError } = await supabase
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
      daysPerWeek: parseInt(fields.daysPerWeek) || 3,
      sessionDuration: parseInt(fields.sessionDuration) || 60,
      restrictions: fields.restrictions || null,
      equipment: fields.equipment || null,
      notes: fields.notes || null,
      status: "ativo",
      updatedAt: now,
    })
    .select("id")
    .single();

  let resolvedStudentId = studentId;

  if (insertError) {
    if (insertError.code === "23505" && fields.email) {
      const { data: existing } = await supabase
        .from("Student")
        .select("id")
        .eq("email", fields.email)
        .single();
      if (existing) resolvedStudentId = (existing as any).id;
      else return NextResponse.json({ error: "Email duplicado — aluno não encontrado" }, { status: 500 });
    } else {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  } else {
    resolvedStudentId = (student as any).id;
  }

  await supabase
    .from("FormResponse")
    .update({ status: "processado", studentId: resolvedStudentId })
    .eq("id", id);

  // Download photos in background — don't block response
  const photoUrls = extractPhotoUrlsFromRaw((form as any).rawData);
  if (photoUrls.length > 0) {
    Promise.allSettled(
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
    ).catch(() => {});
  }

  return NextResponse.json({ studentId: resolvedStudentId });
}
