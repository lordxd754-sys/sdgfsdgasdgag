import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const BUCKET = "student-photos";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: studentId } = await Promise.resolve(params);

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const angle = (formData.get("angle") as string) ?? "frente";

    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
    if (file.size > MAX_FILE_SIZE)
      return NextResponse.json({ error: "Arquivo muito grande (máx 5 MB)" }, { status: 413 });
    if (!ALLOWED_MIME_TYPES.has(file.type))
      return NextResponse.json({ error: "Tipo inválido. Use JPEG, PNG ou WebP" }, { status: 415 });

    const ext = MIME_TO_EXT[file.type];
    const filename = `${randomUUID()}.${ext}`;
    // Path: studentId/filename  — one folder per student in the bucket
    const storagePath = `${studentId}/${filename}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error("Storage upload error:", uploadError.message);
      return NextResponse.json({ error: "Falha no upload" }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    const { data: photo, error: dbError } = await supabase
      .from("Photo")
      .insert({ id: randomUUID(), studentId, url: urlData.publicUrl, angle })
      .select()
      .single();

    if (dbError) {
      // Attempt cleanup of orphaned file
      await supabase.storage.from(BUCKET).remove([storagePath]);
      return NextResponse.json({ error: "Erro ao salvar foto" }, { status: 500 });
    }

    return NextResponse.json(photo, { status: 201 });
  } catch (err) {
    console.error("Photo upload error:", err);
    return NextResponse.json({ error: "Upload falhou" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: studentId } = await Promise.resolve(params);
  const { searchParams } = new URL(req.url);
  const photoId = searchParams.get("photoId");
  if (!photoId) return NextResponse.json({ error: "photoId required" }, { status: 400 });

  const { data: photo } = await supabase
    .from("Photo")
    .select("url")
    .eq("id", photoId)
    .eq("studentId", studentId)
    .single();

  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Derive storage path from the public URL
  const url: string = (photo as any).url;
  const bucketPrefix = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(bucketPrefix);
  if (idx !== -1) {
    const storagePath = url.slice(idx + bucketPrefix.length);
    await supabase.storage.from(BUCKET).remove([storagePath]);
  }

  await supabase.from("Photo").delete().eq("id", photoId);
  return NextResponse.json({ ok: true });
}
