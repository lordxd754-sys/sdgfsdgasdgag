import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { AppLayout } from "@/components/layout/app-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserPlus, Search } from "lucide-react";
import Link from "next/link";
import { formatDate, daysSince, levelLabel, statusLabel } from "@/lib/utils";
import { StudentFilters } from "./student-filters";

export const dynamic = "force-dynamic";

export default async function AlunosPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; level?: string; page?: string };
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await Promise.resolve(searchParams);
  const q = params.q ?? "";
  const status = params.status ?? "";
  const level = params.level ?? "";
  const page = parseInt(params.page ?? "1");
  const perPage = 20;
  const skip = (page - 1) * perPage;
  const cutoff = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();

  // Build students query
  let studentsQuery = supabase
    .from("Student")
    .select("*, Workout(*)")
    .order("createdAt", { ascending: false })
    .range(skip, skip + perPage - 1);

  let countQuery = supabase
    .from("Student")
    .select("*", { count: "exact", head: true });

  if (q) {
    studentsQuery = studentsQuery.or(`name.ilike.%${q}%,email.ilike.%${q}%`);
    countQuery = countQuery.or(`name.ilike.%${q}%,email.ilike.%${q}%`);
  }
  if (status) {
    studentsQuery = studentsQuery.eq("status", status);
    countQuery = countQuery.eq("status", status);
  }
  if (level) {
    studentsQuery = studentsQuery.eq("level", level);
    countQuery = countQuery.eq("level", level);
  }

  const [studentsResult, totalResult, newFormsResult, overdueCountResult] = await Promise.all([
    studentsQuery,
    countQuery,
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

  const students = (studentsResult.data ?? []).map((s: any) => ({
    ...s,
    workouts: s.Workout
      ? [...s.Workout].sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ).slice(0, 1)
      : [],
  }));

  const total = totalResult.count ?? 0;
  const newForms = newFormsResult.count ?? 0;
  const overdueCount = overdueCountResult.count ?? 0;
  const totalPages = Math.ceil(total / perPage);

  return (
    <AppLayout formCount={newForms} overdueCount={overdueCount}>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="font-syne text-3xl font-bold text-white">Alunos</h1>
          <p className="mt-1 text-sm text-gray-500">{total} alunos cadastrados</p>
        </div>
        <Link href="/alunos/novo">
          <Button>
            <UserPlus className="h-4 w-4" />
            Novo aluno
          </Button>
        </Link>
      </div>

      <StudentFilters q={q} status={status} level={level} />

      <Card className="mt-4 p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2a2a2a] text-left">
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">Aluno</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">Objetivo</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">Nível</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">Último contato</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">Treino</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a]">
              {students.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-500">
                    Nenhum aluno encontrado
                  </td>
                </tr>
              )}
              {students.map((student: (typeof students)[number]) => {
                const days = daysSince(student.lastContactAt ?? undefined);
                const hasWorkout = student.workouts.length > 0;
                const contactUrgent = days > 15;

                return (
                  <tr key={student.id} className="hover:bg-[#1f1f1f] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-2 w-2 rounded-full flex-shrink-0 ${
                            student.status === "ativo"
                              ? "bg-green-500"
                              : student.status === "pausado"
                              ? "bg-yellow-500"
                              : "bg-gray-600"
                          }`}
                        />
                        <div>
                          <p className="text-sm font-medium text-white">{student.name}</p>
                          <p className="text-xs text-gray-500">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {student.goal ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{levelLabel(student.level)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          student.status === "ativo"
                            ? "success"
                            : student.status === "pausado"
                            ? "warning"
                            : "secondary"
                        }
                      >
                        {statusLabel(student.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${contactUrgent ? "text-red-400" : "text-gray-400"}`}>
                        {student.lastContactAt ? formatDate(student.lastContactAt) : "Nunca"}
                        {contactUrgent && student.lastContactAt && (
                          <span className="ml-1 text-xs">({days}d)</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {hasWorkout ? (
                        <Badge variant="success">Sim</Badge>
                      ) : (
                        <Badge variant="danger">Não</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/alunos/${student.id}`}>
                        <Button variant="ghost" size="sm">Ver</Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#2a2a2a] px-4 py-3">
            <p className="text-sm text-gray-500">
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={`/alunos?page=${page - 1}&q=${q}&status=${status}&level=${level}`}>
                  <Button variant="outline" size="sm">Anterior</Button>
                </Link>
              )}
              {page < totalPages && (
                <Link href={`/alunos?page=${page + 1}&q=${q}&status=${status}&level=${level}`}>
                  <Button variant="outline" size="sm">Próxima</Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </Card>
    </AppLayout>
  );
}
