import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { cutoff15Days } from "@/lib/utils";
import { AppLayout } from "@/components/layout/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExerciseVideoModal } from "./exercise-video-modal";

export const dynamic = "force-dynamic";

type SearchParams = { studentId?: string | string[] };
function pickFirst(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function SessionViewPage({
  params,
  searchParams,
}: {
  params: { workoutId: string; sessionId: string };
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { workoutId, sessionId } = await Promise.resolve(params);
  const resolved = (await Promise.resolve(searchParams ?? {})) as SearchParams;
  const studentIdFromQuery = pickFirst(resolved.studentId);

  // Fetch session + exercises
  const { data: sessionData, error: sessionError } = await supabase
    .from("WorkoutSession")
    .select(
      "id, name, order, workoutId, Exercise(id, name, sets, reps, rest, notes, order, videoUrl, sessionId)"
    )
    .eq("id", sessionId)
    .single();

  if ((sessionError as any)?.code === "PGRST116" || !sessionData) notFound();
  if (sessionError) throw new Error(`Erro ao carregar sessão: ${(sessionError as any).message}`);

  const raw = sessionData as any;
  const exercises = Array.isArray(raw.Exercise)
    ? [...raw.Exercise].sort((a: any, b: any) => a.order - b.order)
    : [];

  // Last execution for reference
  const { data: lastExecution } = await supabase
    .from("WorkoutExecution")
    .select("id, startedAt, SetLog(exerciseId, setNumber, reps, weight)")
    .eq("sessionId", sessionId)
    .order("startedAt", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Resolve studentId from workout if needed
  let studentId = studentIdFromQuery;
  if (!studentId) {
    const { data: workoutRow } = await supabase
      .from("Workout")
      .select("studentId")
      .eq("id", workoutId)
      .single();
    studentId = (workoutRow as any)?.studentId;
  }

  // Build reference cargas map
  const lastSets = ((lastExecution as any)?.SetLog ?? []) as Array<{
    exerciseId: string;
    setNumber: number;
    reps: number;
    weight: number;
  }>;
  const refByExercise = new Map<string, { weight: number; reps: number }>();
  for (const s of lastSets) {
    const existing = refByExercise.get(s.exerciseId);
    if (!existing || s.weight > existing.weight) {
      refByExercise.set(s.exerciseId, { weight: s.weight, reps: s.reps });
    }
  }

  // AppLayout counts
  const cutoff = cutoff15Days();
  const [formCountResult, overdueCountResult] = await Promise.all([
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
  const formCount = formCountResult.count ?? 0;
  const overdueCount = overdueCountResult.count ?? 0;

  return (
    <AppLayout
      formCount={formCount}
      overdueCount={overdueCount}
      pageTitle={raw.name}
    >
      <div className="mb-4">
        <Link
          href={`/treino/${workoutId}?studentId=${studentId}`}
          className="inline-flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Voltar
        </Link>
      </div>

      <div className="mb-4">
        <h1 className="text-headline-lg font-bold text-on-surface">{raw.name}</h1>
        <p className="text-label-md text-on-surface-variant mt-1">
          {exercises.length} {exercises.length === 1 ? "exercício" : "exercícios"}
        </p>
      </div>

      <Card
        glass={false}
        className="mb-6 bg-primary/10 border border-primary/30 p-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[28px]">visibility</span>
          <div>
            <p className="text-body-md font-semibold text-on-surface">Modo visualização</p>
            <p className="text-label-md text-on-surface-variant">
              Veja todos os exercícios. Pronto para começar?
            </p>
          </div>
        </div>
        <Link
          href={`/treino/${workoutId}/${sessionId}/executar?studentId=${studentId}`}
        >
          <Button size="lg" className="w-full sm:w-auto">
            <span className="material-symbols-outlined">play_arrow</span>
            INICIAR TREINO
          </Button>
        </Link>
      </Card>

      {exercises.length === 0 ? (
        <Card className="p-10 text-center">
          <span className="material-symbols-outlined text-on-surface-variant text-[40px]">
            list
          </span>
          <p className="mt-2 text-on-surface">Esta sessão não possui exercícios.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {exercises.map((ex: any, idx: number) => {
            const ref = refByExercise.get(ex.id);
            return (
              <Card key={ex.id} className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center font-bold text-label-md shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-md font-semibold text-on-surface">{ex.name}</p>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-label-md text-on-surface-variant">
                      <div>
                        <span className="block text-label-sm opacity-70">Séries</span>
                        <span className="text-on-surface font-medium">{ex.sets}</span>
                      </div>
                      <div>
                        <span className="block text-label-sm opacity-70">Repetições</span>
                        <span className="text-on-surface font-medium">{ex.reps}</span>
                      </div>
                      <div>
                        <span className="block text-label-sm opacity-70">Descanso</span>
                        <span className="text-on-surface font-medium">{ex.rest}s</span>
                      </div>
                    </div>
                    {ex.notes && (
                      <p className="text-label-md text-on-surface-variant mt-2">{ex.notes}</p>
                    )}
                    {ref && (
                      <p className="text-label-sm text-on-surface-variant mt-2">
                        Última carga: <span className="text-primary font-medium">{ref.weight}kg</span>
                        {ref.reps ? ` · ${ref.reps} reps` : null}
                      </p>
                    )}
                  </div>
                  {ex.videoUrl ? (
                    <div className="shrink-0 w-32 sm:w-40">
                      <ExerciseVideoModal
                        videoUrl={ex.videoUrl}
                        exerciseName={ex.name}
                      />
                    </div>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
