import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { cutoff15Days } from "@/lib/utils";
import { AppLayout } from "@/components/layout/app-layout";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const cutoff = cutoff15Days();

  const [settingsResult, formCountResult, overdueCountResult] = await Promise.all([
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

  const settings = settingsResult.data;
  const formCount = formCountResult.count ?? 0;
  const overdueCount = overdueCountResult.count ?? 0;

  return (
    <AppLayout formCount={formCount} overdueCount={overdueCount}>
      <div className="mb-8">
        <h1 className="text-headline-lg font-bold text-on-surface">Configurações</h1>
        <p className="mt-1 text-label-md text-on-surface-variant">Integrações, templates e preferências</p>
      </div>
      <SettingsForm settings={settings as any} />
    </AppLayout>
  );
}
