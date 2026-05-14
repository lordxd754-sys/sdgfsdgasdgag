import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await Promise.resolve(params);
  const { data: raw } = await supabase
    .from("Student")
    .select("*, Photo(*), Workout(*), FollowUp(*)")
    .eq("id", id)
    .single();

  if (!raw) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const student = {
    ...(raw as any),
    photos: (raw as any).Photo
      ? [...(raw as any).Photo].sort(
          (a: any, b: any) =>
            new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime()
        )
      : [],
    workouts: (raw as any).Workout
      ? [...(raw as any).Workout].sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      : [],
    followUps: (raw as any).FollowUp
      ? [...(raw as any).FollowUp].sort(
          (a: any, b: any) =>
            new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
        )
      : [],
  };

  return NextResponse.json(student);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await Promise.resolve(params);
  const body = await req.json();

  try {
    const { data: student, error } = await supabase
      .from("Student")
      .update({
        name: body.name,
        email: body.email,
        phone: body.phone || null,
        birthdate: body.birthdate ? new Date(body.birthdate).toISOString() : null,
        city: body.city || null,
        goal: body.goal || null,
        level: body.level ?? "iniciante",
        daysPerWeek: parseInt(body.daysPerWeek ?? "3") || 3,
        sessionDuration: parseInt(body.sessionDuration ?? "60") || 60,
        restrictions: body.restrictions || null,
        equipment: body.equipment || null,
        notes: body.notes || null,
        status: body.status ?? "ativo",
        mfitId: body.mfitId || null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });
      }
      return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
    }

    return NextResponse.json(student);
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await Promise.resolve(params);
  await supabase.from("Student").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
