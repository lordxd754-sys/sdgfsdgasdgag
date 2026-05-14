import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await Promise.resolve(params);

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const angle = (formData.get("angle") as string) ?? "frente";

    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 413 });
    if (!ALLOWED_MIME_TYPES.has(file.type)) return NextResponse.json({ error: "Invalid file type. Use JPEG, PNG or WebP" }, { status: 415 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Use server-generated filename — never trust client-supplied name/extension
    const ext = MIME_TO_EXT[file.type];
    const filename = `${id}-${randomUUID()}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");

    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);

    const url = `/uploads/${filename}`;
    const { data: photo } = await supabase
      .from("Photo")
      .insert({ id: randomUUID(), studentId: id, url, angle })
      .select()
      .single();

    return NextResponse.json(photo, { status: 201 });
  } catch (error) {
    console.error("Photo upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
