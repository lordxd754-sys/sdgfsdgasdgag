import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { cutoff15Days, formatDate } from "@/lib/utils";
import { AppLayout } from "@/components/layout/app-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type SearchParams = { studentId?: string | string[] };

function pickFirst(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function WorkoutSessionsPage({
  params,
  searchParams,
}: {
  params: { workoutId: string };
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { workoutId } = await Promise.resolve(params);
  const resolved = (await Promise.resolve(searchParams ?? {})) as SearchParams;
  const studentIdFromQuery = pickFirst(resolved.studentId);

  const { data: workoutRaw, error } = await supabase
    .from("Workout")
    .select(
      "id, title, status, createdAt, studentId, WorkoutSession(id, name, order, Exercise(id, name, sets, reps, rest, order, videoUrl))"
    )
    .eq("id", workoutId)
    .single();

  if ((error as any)?.code === "PGRST116" || !workoutRaw) notFound();
  if (error) throw new Error(`Erro ao carregar treino: ${(error as any).message}`);

  const raw = workoutRaw as any;
  const studentId = studentIdFromQuery ?? raw.studentId;

  const sessions = Array.isArray(raw.WorkoutSession)
    ? [...raw.WorkoutSession]
        .sort((a: any, b: any) => a.order - b.order)
        .map((s: any) => ({
          ...s,
          exercises: Array.isArray(s.Exercise)
            ? [...s.Exercise].sort((a: any, b: any) => a.order - b.order)
            : [],
        }))
    : [];

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
    <AppLayout formCount={formCount} overdueCount={overdueCount} pageTitle="Sessões">
      <div className="mb-4">
        <Link
          href={`/treino?studentId=${studentId}`}
          className="inline-flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Rotinas
        </Link>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-headline-lg font-bold text-on-surface">{raw.title}</h1>
          <Badge variant="success">Aprovado</Badge>
        </div>
        <p className="text-label-md text-on-surface-variant mt-1">
          Data: {formatDate(raw.createdAt)} · Sessões: {sessions.length}
        </p>
      </div>

      {sessions.length === 0 ? (
        <Card className="p-10 text-center">
          <span className="material-symbols-outlined text-on-surface-variant text-[40px]">
            list
          </span>
          <p className="mt-2 text-on-surface">Este treino não possui sessões.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map((s: any) => {
            const exerciseCount = s.exercises.length;
            const previewNames = s.exercises.slice(0, 3).map((e: any) => e.name);
            const hasMore = exerciseCount > 3;
            return (
              <Card key={s.id} className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-body-md shrink-0">
                    {s.order}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-md font-semibold text-on-surface">{s.name}</p>
                    <p className="text-label-md text-on-surface-variant mt-0.5">
                      {exerciseCount} {exerciseCount === 1 ? "exercício" : "exercícios"}
                    </p>
                    {previewNames.length > 0 && (
                      <div className="mt-2 flex items-center gap-1.5 text-label-sm text-on-surface-variant flex-wrap">
                        <span className="material-symbols-outlined text-[16px]">
                          exercise
                        </span>
                        <span className="truncate">
                          {previewNames.join(" · ")}
                          {hasMore && " ..."}
                        </span>
                      </div>
                    )}

                    <div className="mt-4 flex gap-2 flex-wrap">
                      <Link
                        href={`/treino/${workoutId}/${s.id}?studentId=${studentId}`}
                      >
                        <Button variant="ghost" size="sm">
                          <span className="material-symbols-outlined text-[18px]">
                            visibility
                          </span>
                          Ver exercícios
                        </Button>
                      </Link>
                      <Link
                        href={`/treino/${workoutId}/${s.id}/executar?studentId=${studentId}`}
                      >
                        <Button size="sm">
                          <span className="material-symbols-outlined text-[18px]">
                            play_arrow
                          </span>
                          Iniciar treino
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
