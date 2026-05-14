import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { AppLayout } from "@/components/layout/app-layout";
import { StudentProfile } from "./student-profile";

export const dynamic = "force-dynamic";

export default async function AlunoPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await Promise.resolve(params);
  const cutoff = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();

  const [studentResult, formCountResult, overdueCountResult] = await Promise.all([
    supabase
      .from("Student")
      .select("*, Photo(*), Workout(*, WorkoutSession(*, Exercise(*))), FollowUp(*)")
      .eq("id", id)
      .single(),
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

  if (!studentResult.data) notFound();

  const raw = studentResult.data as any;

  // Normalize nested relations to match Prisma shape
  const student = {
    ...raw,
    photos: raw.Photo
      ? [...raw.Photo].sort(
          (a: any, b: any) =>
            new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime()
        )
      : [],
    workouts: raw.Workout
      ? [...raw.Workout]
          .sort(
            (a: any, b: any) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          .map((w: any) => ({
            ...w,
            sessions: w.WorkoutSession
              ? [...w.WorkoutSession]
                  .sort((a: any, b: any) => a.order - b.order)
                  .map((s: any) => ({
                    ...s,
                    exercises: s.Exercise
                      ? [...s.Exercise].sort((a: any, b: any) => a.order - b.order)
                      : [],
                  }))
              : [],
          }))
      : [],
    followUps: raw.FollowUp
      ? [...raw.FollowUp].sort(
          (a: any, b: any) =>
            new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
        )
      : [],
  };

  const formCount = formCountResult.count ?? 0;
  const overdueCount = overdueCountResult.count ?? 0;

  return (
    <AppLayout formCount={formCount} overdueCount={overdueCount}>
      <StudentProfile student={student as any} />
    </AppLayout>
  );
}
