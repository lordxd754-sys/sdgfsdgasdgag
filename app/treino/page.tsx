import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { cutoff15Days, formatDate, levelLabel } from "@/lib/utils";
import { AppLayout } from "@/components/layout/app-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

type SearchParams = { studentId?: string | string[] };

function pickFirst(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function TreinoIndexPage({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const resolvedParams = (await Promise.resolve(searchParams ?? {})) as SearchParams;
  const studentId = pickFirst(resolvedParams.studentId);

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

  if (!studentId) {
    // Show student selector
    const { data: students } = await supabase
      .from("Student")
      .select("id, name, level, goal, status")
      .eq("status", "ativo")
      .order("name");

    return (
      <AppLayout formCount={formCount} overdueCount={overdueCount} pageTitle="Módulo Aluno">
        <div className="mb-6">
          <h1 className="text-headline-lg font-bold text-on-surface">Módulo Aluno</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Selecione um aluno para ver as rotinas de treino.
          </p>
        </div>

        {(!students || students.length === 0) ? (
          <Card className="p-8 text-center">
            <span className="material-symbols-outlined text-on-surface-variant text-[40px]">
              group
            </span>
            <p className="mt-2 text-on-surface-variant">Nenhum aluno ativo encontrado.</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {students.map((s: any) => (
              <Link key={s.id} href={`/treino?studentId=${s.id}`}>
                <Card className="p-5 hover:border-primary/40 transition-colors cursor-pointer group h-full">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary">person</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body-md font-semibold text-on-surface truncate group-hover:text-primary transition-colors">
                        {s.name}
                      </p>
                      <p className="text-label-sm text-on-surface-variant mt-0.5">
                        {levelLabel(s.level)}
                      </p>
                      {s.goal && (
                        <p className="text-label-sm text-on-surface-variant mt-1 line-clamp-2">
                          {s.goal}
                        </p>
                      )}
                    </div>
                    <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">
                      chevron_right
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </AppLayout>
    );
  }

  // With studentId: fetch student + workouts
  const [studentResult, workoutsResult] = await Promise.all([
    supabase
      .from("Student")
      .select("id, name, level, goal")
      .eq("id", studentId)
      .single(),
    supabase
      .from("Workout")
      .select("id, title, status, createdAt, studentId, WorkoutSession(id, name, order)")
      .eq("studentId", studentId)
      .eq("status", "aprovado")
      .order("createdAt", { ascending: false }),
  ]);

  const student = studentResult.data as any;
  const workouts = (workoutsResult.data ?? []).map((w: any) => ({
    ...w,
    sessions: Array.isArray(w.WorkoutSession)
      ? [...w.WorkoutSession].sort((a: any, b: any) => a.order - b.order)
      : [],
  }));

  return (
    <AppLayout formCount={formCount} overdueCount={overdueCount} pageTitle="Rotinas de Treino">
      <div className="mb-4">
        <Link
          href={`/alunos/${studentId}`}
          className="inline-flex items-center gap-1 text-label-md text-on-surface-variant hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Voltar ao perfil
        </Link>
      </div>

      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-headline-lg font-bold text-on-surface">Rotinas de Treino</h1>
          {student && (
            <div className="mt-1 flex items-center gap-2">
              <p className="text-body-md text-on-surface-variant">{student.name}</p>
              <Badge variant="outline">{levelLabel(student.level)}</Badge>
            </div>
          )}
        </div>
      </div>

      {workouts.length === 0 ? (
        <Card className="p-10 text-center">
          <span className="material-symbols-outlined text-on-surface-variant text-[40px]">
            fitness_center
          </span>
          <p className="mt-2 text-body-md text-on-surface">Nenhum treino aprovado disponível.</p>
          <p className="text-label-md text-on-surface-variant mt-1">
            Volte ao perfil para criar e aprovar um treino.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workouts.map((w) => (
            <Link key={w.id} href={`/treino/${w.id}?studentId=${studentId}`}>
              <Card className="p-5 hover:border-primary/40 transition-colors cursor-pointer group h-full flex flex-col">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary">fitness_center</span>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">
                    chevron_right
                  </span>
                </div>
                <p className="text-body-md font-semibold text-on-surface group-hover:text-primary transition-colors">
                  {w.title}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="success">Aprovado</Badge>
                  <Badge variant="outline">
                    {w.sessions.length} {w.sessions.length === 1 ? "sessão" : "sessões"}
                  </Badge>
                </div>
                <div className="mt-auto pt-3 text-label-sm text-on-surface-variant">
                  {formatDate(w.createdAt)}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
