import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { cutoff15Days, formatDate } from "@/lib/utils";
import { AppLayout } from "@/components/layout/app-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  aprovado: "Aprovado",
  enviado_mfit: "No MFIT",
};

export default async function TreinosPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const cutoff = cutoff15Days();

  const [workoutsResult, formCountResult, overdueCountResult] = await Promise.all([
    supabase
      .from("Workout")
      .select("id, title, status, createdAt, studentId, Student(id, name, level)")
      .order("createdAt", { ascending: false })
      .limit(60),
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

  const workouts = (workoutsResult.data ?? []) as any[];
  const formCount = formCountResult.count ?? 0;
  const overdueCount = overdueCountResult.count ?? 0;

  const rascunhos = workouts.filter((w) => w.status === "rascunho");
  const aprovados = workouts.filter((w) => w.status === "aprovado");
  const enviados = workouts.filter((w) => w.status === "enviado_mfit");

  function WorkoutCard({ w }: { w: any }) {
    const student = w.Student as any;
    return (
      <Link href={`/treinos/${w.id}`}>
        <Card className="p-4 hover:border-primary/40 transition-colors cursor-pointer group h-full flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <p className="text-body-md font-semibold text-on-surface group-hover:text-primary transition-colors line-clamp-2">
              {w.title}
            </p>
            <Badge
              variant={
                w.status === "aprovado"
                  ? "success"
                  : w.status === "enviado_mfit"
                    ? "secondary"
                    : "outline"
              }
              className="shrink-0"
            >
              {STATUS_LABEL[w.status] ?? w.status}
            </Badge>
          </div>
          {student && (
            <p className="text-label-md text-on-surface-variant">
              <span className="material-symbols-outlined text-[14px] align-middle mr-1">person</span>
              {student.name}
            </p>
          )}
          <p className="text-label-sm text-on-surface-variant mt-auto">{formatDate(w.createdAt)}</p>
        </Card>
      </Link>
    );
  }

  return (
    <AppLayout formCount={formCount} overdueCount={overdueCount}>
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-headline-lg font-bold text-on-surface">Treinos</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            {workouts.length} treino{workouts.length !== 1 ? "s" : ""} no total
          </p>
        </div>
        <Link href="/alunos">
          <Button variant="outline" size="sm">
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Criar via aluno
          </Button>
        </Link>
      </div>

      {workouts.length === 0 ? (
        <Card className="p-10 text-center">
          <span className="material-symbols-outlined text-on-surface-variant text-[40px]">fitness_center</span>
          <p className="mt-2 text-body-md text-on-surface">Nenhum treino criado ainda.</p>
          <p className="text-label-md text-on-surface-variant mt-1">
            Acesse o perfil de um aluno para criar o primeiro treino.
          </p>
          <Link href="/alunos" className="mt-4 inline-block">
            <Button>Ver alunos</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-8">
          {rascunhos.length > 0 && (
            <section>
              <h2 className="text-title-md font-semibold text-on-surface mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-on-surface-variant inline-block" />
                Rascunhos
                <span className="text-label-md text-on-surface-variant font-normal">({rascunhos.length})</span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rascunhos.map((w) => <WorkoutCard key={w.id} w={w} />)}
              </div>
            </section>
          )}

          {aprovados.length > 0 && (
            <section>
              <h2 className="text-title-md font-semibold text-on-surface mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                Aprovados
                <span className="text-label-md text-on-surface-variant font-normal">({aprovados.length})</span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {aprovados.map((w) => <WorkoutCard key={w.id} w={w} />)}
              </div>
            </section>
          )}

          {enviados.length > 0 && (
            <section>
              <h2 className="text-title-md font-semibold text-on-surface mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-secondary inline-block" />
                No MFIT
                <span className="text-label-md text-on-surface-variant font-normal">({enviados.length})</span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {enviados.map((w) => <WorkoutCard key={w.id} w={w} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </AppLayout>
  );
}
