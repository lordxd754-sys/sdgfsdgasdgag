import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { cutoff15Days } from "@/lib/utils";
import { AppLayout } from "@/components/layout/app-layout";
import { FormList } from "./form-list";

export const dynamic = "force-dynamic";

export default async function FormulariosPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const cutoff = cutoff15Days();

  const [formsResult, formCountResult, overdueCountResult] = await Promise.all([
    supabase
      .from("FormResponse")
      .select("*")
      .order("receivedAt", { ascending: false })
      .limit(100),
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

  const forms = formsResult.data ?? [];
  const formCount = formCountResult.count ?? 0;
  const overdueCount = overdueCountResult.count ?? 0;

  return (
    <AppLayout formCount={formCount} overdueCount={overdueCount}>
      <div className="mb-8">
        <h1 className="text-headline-lg font-bold text-on-surface">Formulários recebidos</h1>
        <p className="mt-1 text-label-md text-on-surface-variant">Inbox de respostas do Jotform</p>
      </div>
      <FormList forms={forms as any[]} />
    </AppLayout>
  );
}
