import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await Promise.resolve(params);
  const { data: workoutRaw } = await supabase
    .from("Workout")
    .select("*, WorkoutSession(*, Exercise(*))")
    .eq("id", id)
    .single();

  if (!workoutRaw) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const workout = {
    ...(workoutRaw as any),
    sessions: (workoutRaw as any).WorkoutSession
      ? [...(workoutRaw as any).WorkoutSession]
          .sort((a: any, b: any) => a.order - b.order)
          .map((s: any) => ({
            ...s,
            exercises: s.Exercise
              ? [...s.Exercise].sort((a: any, b: any) => a.order - b.order)
              : [],
          }))
      : [],
  };

  const text = workout.sessions
    .map((s: any) => {
      const lines = s.exercises.map(
        (ex: any, i: number) =>
          `  ${i + 1}. ${ex.name} | ${ex.sets}x${ex.reps} | ${ex.rest}s descanso${ex.notes ? ` | ${ex.notes}` : ""}`
      );
      return `${s.name}\n${lines.join("\n")}`;
    })
    .join("\n\n");

  return new NextResponse(text, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
