import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { formatDate, daysSince, cutoff15Days } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const cutoff15 = cutoff15Days();
  const cutoff12 = new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString();

  const [
    totalActiveResult,
    overdueContactResult,
    newFormsResult,
    upcomingFollowUpsResult,
    needsAttentionRaw,
    allActiveWithWorkoutsResult,
  ] = await Promise.all([
    supabase
      .from("Student")
      .select("*", { count: "exact", head: true })
      .eq("status", "ativo"),

    supabase
      .from("Student")
      .select("*", { count: "exact", head: true })
      .eq("status", "ativo")
      .or(`lastContactAt.lt.${cutoff15},and(lastContactAt.is.null,createdAt.lt.${cutoff15})`),

    supabase
      .from("FormResponse")
      .select("*", { count: "exact", head: true })
      .eq("status", "novo"),

    supabase
      .from("Student")
      .select("*", { count: "exact", head: true })
      .eq("status", "ativo")
      .gte("lastContactAt", cutoff15)
      .lt("lastContactAt", cutoff12),

    supabase
      .from("Student")
      .select("id, name, goal, lastContactAt, createdAt, Workout(id, title, createdAt)")
      .eq("status", "ativo")
      .order("lastContactAt", { ascending: true })
      .limit(10),

    supabase
      .from("Student")
      .select("id, Workout(id)")
      .eq("status", "ativo"),
  ]);

  const totalActive = totalActiveResult.count ?? 0;
  const overdueContact = overdueContactResult.count ?? 0;
  const newForms = newFormsResult.count ?? 0;
  const upcomingFollowUps = upcomingFollowUpsResult.count ?? 0;

  const noWorkout = (allActiveWithWorkoutsResult.data ?? []).filter(
    (s: any) => !s.Workout || s.Workout.length === 0
  ).length;

  const needsAttentionAll = (needsAttentionRaw.data ?? []).map((s: any) => ({
    ...s,
    workouts: s.Workout
      ? [...s.Workout].sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ).slice(0, 1)
      : [],
  }));

  const cutoff15ms = Date.now() - 15 * 24 * 60 * 60 * 1000;
  const needsAttention = needsAttentionAll.filter((s: any) => {
    const hasNoWorkout = s.workouts.length === 0;
    const lastContact = s.lastContactAt ? new Date(s.lastContactAt).getTime() : null;
    const createdAt = new Date(s.createdAt).getTime();
    const isOverdue =
      (lastContact !== null && lastContact < cutoff15ms) ||
      (lastContact === null && createdAt < cutoff15ms);
    return hasNoWorkout || isOverdue;
  });

  const metrics = [
    { label: "Alunos Ativos",          value: totalActive,      icon: "group",          color: "text-primary",  bg: "bg-primary/10" },
    { label: "Sem Treino",             value: noWorkout,        icon: "fitness_center", color: "text-error",    bg: "bg-error/10" },
    { label: "Contato Vencido",        value: overdueContact,   icon: "event_busy",     color: "text-tertiary", bg: "bg-tertiary/10" },
    { label: "Formulários Novos",      value: newForms,         icon: "pending_actions",color: "text-primary",  bg: "bg-primary/10" },
    { label: "Próx. Acompanhamentos",  value: upcomingFollowUps,icon: "access_time",    color: "text-secondary",bg: "bg-secondary/10" },
  ];

  return (
    <AppLayout formCount={newForms} overdueCount={overdueContact}>
      <div className="mb-8">
        <h1 className="text-headline-lg font-bold text-on-surface">Visão Geral</h1>
        <p className="mt-1 text-label-md text-on-surface-variant">
          Bem-vindo de volta. Aqui está o que precisa da sua atenção hoje.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map((m) => (
          <Card key={m.label} className="relative overflow-hidden hover:-translate-y-1 transition-transform">
            <CardContent>
              <div className="flex justify-between items-start mb-4">
                <div className={`w-11 h-11 rounded-xl ${m.bg} flex items-center justify-center`}>
                  <span className={`material-symbols-outlined ${m.color}`}>{m.icon}</span>
                </div>
              </div>
              <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">{m.label}</p>
              <p className="text-headline-lg font-bold text-on-surface mt-1">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link href="/formularios">
          <Button variant="outline" size="sm">
            <span className="material-symbols-outlined text-[18px]">description</span>
            Ver formulários
            {newForms > 0 && (
              <Badge variant="default" className="ml-1">{newForms}</Badge>
            )}
          </Button>
        </Link>
        <Link href="/alunos/novo">
          <Button size="sm">
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Novo aluno
          </Button>
        </Link>
      </div>

      {needsAttention.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary">warning</span>
              <CardTitle>Precisam de atenção</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-outline-variant">
              {needsAttention.map((student: (typeof needsAttention)[number]) => {
                const hasWorkout = student.workouts.length > 0;
                const days = daysSince(student.lastContactAt ?? student.createdAt);
                return (
                  <div key={student.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-label-md font-bold text-primary">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-body-md font-semibold text-on-surface">{student.name}</p>
                        <p className="text-label-sm text-on-surface-variant">
                          {!hasWorkout ? "Sem treino" : `Último contato: ${formatDate(student.lastContactAt)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {!hasWorkout && <Badge variant="warning">Sem treino</Badge>}
                      {days > 15 && <Badge variant="danger">{days}d sem contato</Badge>}
                      <Link href={`/alunos/${student.id}`}>
                        <Button variant="ghost" size="sm">Ver perfil</Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
}
