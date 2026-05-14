import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Dumbbell, MessageSquare, FileText, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";
import { formatDate, daysSince } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [
    totalActive,
    noWorkout,
    overdueContact,
    newForms,
    upcomingFollowUps,
    needsAttention,
  ] = await Promise.all([
    prisma.student.count({ where: { status: "ativo" } }),

    prisma.student.count({
      where: {
        status: "ativo",
        workouts: { none: {} },
      },
    }),

    prisma.student.count({
      where: {
        status: "ativo",
        OR: [
          { lastContactAt: { lt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) } },
          { lastContactAt: null, createdAt: { lt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) } },
        ],
      },
    }),

    prisma.formResponse.count({ where: { status: "novo" } }),

    prisma.student.count({
      where: {
        status: "ativo",
        OR: [
          {
            lastContactAt: {
              gte: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
              lt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
            },
          },
        ],
      },
    }),

    prisma.student.findMany({
      where: {
        status: "ativo",
        OR: [
          { workouts: { none: {} } },
          { lastContactAt: { lt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) } },
          { lastContactAt: null, createdAt: { lt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) } },
        ],
      },
      include: {
        workouts: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { lastContactAt: "asc" },
      take: 10,
    }),
  ]);

  const metrics = [
    {
      label: "Alunos ativos",
      value: totalActive,
      icon: Users,
      color: "text-green-400",
      bg: "bg-green-500/10",
    },
    {
      label: "Sem treino",
      value: noWorkout,
      icon: Dumbbell,
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
    },
    {
      label: "Contato vencido",
      value: overdueContact,
      icon: MessageSquare,
      color: "text-red-400",
      bg: "bg-red-500/10",
    },
    {
      label: "Formulários novos",
      value: newForms,
      icon: FileText,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "Próx. acompanhamentos",
      value: upcomingFollowUps,
      icon: Clock,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
    },
  ];

  return (
    <AppLayout formCount={newForms} overdueCount={overdueContact}>
      <div className="mb-8">
        <h1 className="font-syne text-3xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Visão geral da sua consultoria
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map((m: (typeof metrics)[number]) => {
          const Icon = m.icon;
          return (
            <Card key={m.label} className="relative overflow-hidden">
              <CardContent>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                      {m.label}
                    </p>
                    <p className="mt-2 text-4xl font-bold text-white">{m.value}</p>
                  </div>
                  <div className={`rounded-xl p-2.5 ${m.bg}`}>
                    <Icon className={`h-5 w-5 ${m.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 flex items-center gap-3">
        <Link href="/formularios">
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4" />
            Ver formulários
            {newForms > 0 && (
              <Badge variant="default" className="ml-1">{newForms}</Badge>
            )}
          </Button>
        </Link>
        <Link href="/alunos/novo">
          <Button size="sm">
            <Users className="h-4 w-4" />
            Novo aluno
          </Button>
        </Link>
      </div>

      {needsAttention.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
              <CardTitle>Precisam de atenção</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-[#2a2a2a]">
              {needsAttention.map((student: (typeof needsAttention)[number]) => {
                const hasWorkout = student.workouts.length > 0;
                const days = daysSince(student.lastContactAt ?? student.createdAt);
                return (
                  <div key={student.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-[#2a2a2a] flex items-center justify-center text-sm font-medium text-gray-300">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{student.name}</p>
                        <p className="text-xs text-gray-500">
                          {!hasWorkout ? "Sem treino" : `Último contato: ${formatDate(student.lastContactAt)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {!hasWorkout && (
                        <Badge variant="warning">Sem treino</Badge>
                      )}
                      {days > 15 && (
                        <Badge variant="danger">{days}d sem contato</Badge>
                      )}
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
