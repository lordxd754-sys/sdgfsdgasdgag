import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const level = searchParams.get("level") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const perPage = parseInt(searchParams.get("perPage") ?? "20");
  const skip = (page - 1) * perPage;

  let studentsQuery = supabase
    .from("Student")
    .select("*")
    .order("createdAt", { ascending: false })
    .range(skip, skip + perPage - 1);

  let countQuery = supabase
    .from("Student")
    .select("*", { count: "exact", head: true });

  if (q) {
    studentsQuery = studentsQuery.or(`name.ilike.%${q}%,email.ilike.%${q}%`);
    countQuery = countQuery.or(`name.ilike.%${q}%,email.ilike.%${q}%`);
  }
  if (status) {
    studentsQuery = studentsQuery.eq("status", status);
    countQuery = countQuery.eq("status", status);
  }
  if (level) {
    studentsQuery = studentsQuery.eq("level", level);
    countQuery = countQuery.eq("level", level);
  }

  const [studentsResult, totalResult] = await Promise.all([studentsQuery, countQuery]);

  const students = studentsResult.data ?? [];
  const total = totalResult.count ?? 0;

  return NextResponse.json({ students, total, page, perPage });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { formId, ...data } = body;

    const { data: student, error } = await supabase
      .from("Student")
      .insert({
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        birthdate: data.birthdate ? new Date(data.birthdate).toISOString() : null,
        city: data.city || null,
        goal: data.goal || null,
        level: data.level ?? "iniciante",
        daysPerWeek: parseInt(data.daysPerWeek ?? "3") || 3,
        sessionDuration: parseInt(data.sessionDuration ?? "60") || 60,
        restrictions: data.restrictions || null,
        equipment: data.equipment || null,
        notes: data.notes || null,
        status: data.status ?? "ativo",
        mfitId: data.mfitId || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });
      }
      return NextResponse.json({ error: "Erro ao criar aluno" }, { status: 500 });
    }

    if (formId) {
      await supabase
        .from("FormResponse")
        .update({ status: "processado", studentId: (student as any).id })
        .eq("id", formId);
    }

    return NextResponse.json(student, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao criar aluno" }, { status: 500 });
  }
}
