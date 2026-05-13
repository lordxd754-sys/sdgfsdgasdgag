import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppLayout } from "@/components/layout/app-layout";
import { WorkoutEditor } from "./workout-editor";

export const dynamic = "force-dynamic";

export default async function TreinoPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await Promise.resolve(params);

  const [workout, formCount, overdueCount] = await Promise.all([
    prisma.workout.findUnique({
      where: { id },
      include: {
        student: { include: { photos: { orderBy: { takenAt: "desc" }, take: 4 } } },
        sessions: {
          orderBy: { order: "asc" },
          include: { exercises: { orderBy: { order: "asc" } } },
        },
      },
    }),
    prisma.formResponse.count({ where: { status: "novo" } }),
    prisma.student.count({
      where: {
        status: "ativo",
        OR: [
          { lastContactAt: { lt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) } },
          { lastContactAt: null, createdAt: { lt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) } },
        ],
      },
    }),
  ]);

  if (!workout) notFound();

  return (
    <AppLayout formCount={formCount} overdueCount={overdueCount}>
      <WorkoutEditor workout={workout as any} />
    </AppLayout>
  );
}
