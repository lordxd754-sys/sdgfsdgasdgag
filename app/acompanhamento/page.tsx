import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { AppLayout } from "@/components/layout/app-layout";
import { FollowUpList } from "./follow-up-list";

export const dynamic = "force-dynamic";

export default async function AcompanhamentoPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const cutoff = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();

  const [studentsResult, settingsResult, formCountResult, overdueCountResult] = await Promise.all([
    supabase
      .from("Student")
      .select("*, Workout(*)")
      .eq("status", "ativo")
      .order("lastContactAt", { ascending: true }),
    supabase.from("Settings").select("*").limit(1).maybeSingle(),
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

  const settings = settingsResult.data;
  const formCount = formCountResult.count ?? 0;
  const overdueCount = overdueCountResult.count ?? 0;

  return (
    <AppLayout formCount={formCount} overdueCount={overdueCount}>
      <div className="mb-8">
        <h1 className="text-headline-lg font-bold text-on-surface">Acompanhamento</h1>
        <p className="mt-1 text-label-md text-on-surface-variant">Central de mensagens e follow-ups</p>
      </div>
      <FollowUpList students={students as any[]} autoFollowUp={settings?.autoFollowUp ?? false} />
    </AppLayout>
  );
}
