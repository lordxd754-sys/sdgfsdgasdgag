import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { supabase } from "@/lib/supabase";
import { StudentForm } from "../student-form";

export const dynamic = "force-dynamic";

export default async function NovoAlunoPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const cutoff = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();

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

  return (
    <AppLayout formCount={formCount} overdueCount={overdueCount}>
      <div className="mb-8">
        <h1 className="font-syne text-3xl font-bold text-white">Novo aluno</h1>
        <p className="mt-1 text-sm text-gray-500">Cadastre um novo aluno manualmente</p>
      </div>
      <StudentForm />
    </AppLayout>
  );
}
