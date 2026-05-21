import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await Promise.resolve(params);

  const { data, error } = await supabase
    .from("Workout")
    .select(
      "id, title, status, createdAt, studentId, WorkoutSession(id, name, order, Exercise(id, name, sets, reps, rest, notes, order, videoUrl, sessionId))"
    )
    .eq("studentId", id)
    .eq("status", "aprovado")
    .order("createdAt", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const workouts = (data ?? []).map((w: any) => ({
    ...w,
    sessions: Array.isArray(w.WorkoutSession)
      ? [...w.WorkoutSession]
          .sort((a: any, b: any) => a.order - b.order)
          .map((s: any) => ({
            ...s,
            exercises: Array.isArray(s.Exercise)
              ? [...s.Exercise].sort((a: any, b: any) => a.order - b.order)
              : [],
          }))
      : [],
  }));

  return NextResponse.json(workouts);
}
