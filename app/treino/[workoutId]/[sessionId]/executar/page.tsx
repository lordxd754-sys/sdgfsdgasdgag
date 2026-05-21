import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { WorkoutExecution } from "./workout-execution";

export const dynamic = "force-dynamic";

type SearchParams = { studentId?: string | string[] };
function pickFirst(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function ExecutarPage({
  params,
  searchParams,
}: {
  params: { workoutId: string; sessionId: string };
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const authSession = await auth();
  if (!authSession) redirect("/login");

  const { workoutId, sessionId } = await Promise.resolve(params);
  const resolved = (await Promise.resolve(searchParams ?? {})) as SearchParams;
  const studentIdFromQuery = pickFirst(resolved.studentId);

  const { data: sessionData, error: sessionError } = await supabase
    .from("WorkoutSession")
    .select(
      "id, name, workoutId, Exercise(id, name, sets, reps, rest, notes, order, videoUrl)"
    )
    .eq("id", sessionId)
    .single();

  if ((sessionError as any)?.code === "PGRST116" || !sessionData) notFound();
  if (sessionError) throw new Error(`Erro ao carregar sessão: ${(sessionError as any).message}`);

  const rawSession = sessionData as any;
  const exercises = Array.isArray(rawSession.Exercise)
    ? [...rawSession.Exercise].sort((a: any, b: any) => a.order - b.order)
    : [];

  const sessionForClient = {
    id: rawSession.id,
    name: rawSession.name,
    workoutId: rawSession.workoutId,
    exercises,
  };

  // Last execution for reference
  const { data: lastExecution } = await supabase
    .from("WorkoutExecution")
    .select("id, SetLog(exerciseId, setNumber, reps, weight)")
    .eq("sessionId", sessionId)
    .order("startedAt", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Resolve studentId
  let studentId = studentIdFromQuery;
  if (!studentId) {
    const { data: workoutRow } = await supabase
      .from("Workout")
      .select("studentId")
      .eq("id", workoutId)
      .single();
    studentId = (workoutRow as any)?.studentId;
  }

  if (!studentId) notFound();

  return (
    <WorkoutExecution
      session={sessionForClient}
      lastExecution={(lastExecution as any) ?? null}
      studentId={studentId}
      workoutId={workoutId}
    />
  );
}
