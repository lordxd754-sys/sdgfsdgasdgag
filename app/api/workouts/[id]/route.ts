import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await Promise.resolve(params);
  const { data: workoutRaw } = await supabase
    .from("Workout")
    .select("*, Student(*, Photo(*)), WorkoutSession(*, Exercise(*))")
    .eq("id", id)
    .single();

  if (!workoutRaw) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const raw = workoutRaw as any;
  const workout = {
    ...raw,
    student: raw.Student
      ? {
          ...raw.Student,
          photos: raw.Student.Photo
            ? [...raw.Student.Photo]
                .sort(
                  (a: any, b: any) =>
                    new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime()
                )
                .slice(0, 4)
            : [],
        }
      : null,
    sessions: raw.WorkoutSession
      ? [...raw.WorkoutSession]
          .sort((a: any, b: any) => a.order - b.order)
          .map((s: any) => ({
            ...s,
            exercises: s.Exercise
              ? [...s.Exercise].sort((a: any, b: any) => a.order - b.order)
              : [],
          }))
      : [],
  };

  return NextResponse.json(workout);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await Promise.resolve(params);
  const body = await req.json();

  // Delete existing sessions if updating sessions
  if (body.sessions) {
    await supabase.from("WorkoutSession").delete().eq("workoutId", id);
  }

  const updateData: Record<string, any> = {};
  if (body.title) updateData.title = body.title;
  if (body.status) updateData.status = body.status;
  if (body.mfitSynced) updateData.mfitSyncedAt = new Date().toISOString();

  const { data: updatedWorkout } = await supabase
    .from("Workout")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  let sessions: any[] = [];
  if (body.sessions) {
    sessions = (
      await Promise.all(
        body.sessions.map(async (s: any, si: number) => {
          const { data: ws } = await supabase
            .from("WorkoutSession")
            .insert({ id: crypto.randomUUID(), workoutId: id, name: s.name, order: s.order ?? si + 1 })
            .select()
            .single();
          if (!ws) return null;

          const exercises = (
            await Promise.all(
              (s.exercises ?? []).map((ex: any, ei: number) =>
                supabase
                  .from("Exercise")
                  .insert({
                    id: crypto.randomUUID(),
                    sessionId: (ws as any).id,
                    name: ex.name,
                    sets: parseInt(String(ex.sets)) || 3,
                    reps: String(ex.reps),
                    rest: parseInt(String(ex.rest)) || 60,
                    notes: ex.notes || null,
                    order: ex.order ?? ei + 1,
                    videoUrl: ex.videoUrl || null,
                  })
                  .select()
                  .single()
                  .then((r) => r.data)
              )
            )
          ).filter(Boolean);

          return { ...(ws as any), exercises };
        })
      )
    ).filter(Boolean);
  }

  return NextResponse.json({ ...(updatedWorkout as any), sessions });
}
