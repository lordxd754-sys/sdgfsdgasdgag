import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { cutoff15Days } from "@/lib/utils";
import { AppLayout } from "@/components/layout/app-layout";
import { WorkoutEditor } from "./workout-editor";

export const dynamic = "force-dynamic";

export default async function TreinoPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await Promise.resolve(params);
  const cutoff = cutoff15Days();

  // Step 1: fetch the workout row only (no joins) — isolates 404 vs query error
  const { data: workoutRaw, error: workoutError } = await supabase
    .from("Workout")
    .select("id, title, status, content, mfitSyncedAt, createdAt, studentId")
    .eq("id", id)
    .single();

  if (workoutError?.code === "PGRST116" || !workoutRaw) notFound();
  if (workoutError) throw new Error(`Erro ao carregar treino: ${(workoutError as any).message}`);

  // Step 2: fetch related data in parallel — simple, one-level joins each
  const [sessionsResult, studentResult, formCountResult, overdueCountResult] = await Promise.all([
    supabase
      .from("WorkoutSession")
      .select("id, name, order, workoutId, Exercise(id, name, sets, reps, rest, notes, order, videoUrl, sessionId)")
      .eq("workoutId", id)
      .order("order", { ascending: true }),

    supabase
      .from("Student")
      .select("id, name, goal, level, daysPerWeek, sessionDuration, restrictions, equipment, Photo(id, url, angle, takenAt)")
      .eq("id", (workoutRaw as any).studentId)
      .single(),

    supabase
      .from("FormResponse")
      .select("*", { count: "exact", head: true })
      .eq("status", "novo"),

    supabase
      .from("Student")
      .select("*", { count: "exact", head: true })
      .eq("status", "ativo")
      .or(`lastContactAt.lt.${cutoff},and(lastContactAt.is.null,createdAt.lt.${cutoff})`),
  ]);

  const studentData = studentResult.data as any;

  const workout = {
    ...workoutRaw,
    student: studentData
      ? {
          ...studentData,
          photos: Array.isArray(studentData.Photo)
            ? [...studentData.Photo]
                .sort((a: any, b: any) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime())
                .slice(0, 4)
            : [],
        }
      : null,
    sessions: (sessionsResult.data ?? []).map((s: any) => ({
      ...s,
      exercises: Array.isArray(s.Exercise)
        ? [...s.Exercise].sort((a: any, b: any) => a.order - b.order)
        : [],
    })),
  };

  const formCount = formCountResult.count ?? 0;
  const overdueCount = overdueCountResult.count ?? 0;

  return (
    <AppLayout formCount={formCount} overdueCount={overdueCount}>
      <WorkoutEditor workout={workout as any} />
    </AppLayout>
  );
}
