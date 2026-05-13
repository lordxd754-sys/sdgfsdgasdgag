import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppLayout } from "@/components/layout/app-layout";
import { StudentProfile } from "./student-profile";

export const dynamic = "force-dynamic";

export default async function AlunoPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await Promise.resolve(params);

  const [student, formCount, overdueCount] = await Promise.all([
    prisma.student.findUnique({
      where: { id },
      include: {
        photos: { orderBy: { takenAt: "desc" } },
        workouts: {
          orderBy: { createdAt: "desc" },
          include: {
            sessions: {
              include: { exercises: { orderBy: { order: "asc" } } },
              orderBy: { order: "asc" },
            },
          },
        },
        followUps: { orderBy: { sentAt: "desc" } },
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

  if (!student) notFound();

  return (
    <AppLayout formCount={formCount} overdueCount={overdueCount}>
      <StudentProfile student={student as any} />
    </AppLayout>
  );
}
