import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { cutoff15Days } from "@/lib/utils";
import { AppLayout } from "@/components/layout/app-layout";
import { WorkoutEditor } from "./workout-editor";

export const dynamic = "force-dynamic";

export default async function TreinoPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await Promise.resolve(params);
  const cutoff = cutoff15Days();

  const [workoutResult, formCountResult, overdueCountResult] = await Promise.all([
    supabase
      .from("Workout")
      .select("*, Student(*, Photo(*)), WorkoutSession(*, Exercise(*))")
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

  if (!workoutResult.data) notFound();

  const raw = workoutResult.data as any;
  const workout = {
    ...raw,
    student: raw.Student
      ? {
          ...raw.Student,
          photos: raw.Student.Photo
            ? [...raw.Student.Photo]
                .sort(
                  (a: any, b: any) =>
                    new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime()
                )
                .slice(0, 4)
            : [],
        }
      : null,
    sessions: raw.WorkoutSession
      ? [...raw.WorkoutSession]
          .sort((a: any, b: any) => a.order - b.order)
          .map((s: any) => ({
            ...s,
            exercises: s.Exercise
              ? [...s.Exercise].sort((a: any, b: any) => a.order - b.order)
              : [],
          }))
      : [],
  };

  const formCount = formCountResult.count ?? 0;
  const overdueCount = overdueCountResult.count ?? 0;

  return (
    <AppLayout formCount={formCount} overdueCount={overdueCount}>
      <WorkoutEditor workout={workout as any} />
    </AppLayout>
  );
}
