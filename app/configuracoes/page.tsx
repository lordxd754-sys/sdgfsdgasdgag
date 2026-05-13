import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppLayout } from "@/components/layout/app-layout";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [settings, formCount, overdueCount] = await Promise.all([
    prisma.settings.findFirst(),
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

  return (
    <AppLayout formCount={formCount} overdueCount={overdueCount}>
      <div className="mb-8">
        <h1 className="font-syne text-3xl font-bold text-white">Configurações</h1>
        <p className="mt-1 text-sm text-gray-500">Integrações, templates e preferências</p>
      </div>
      <SettingsForm settings={settings as any} />
    </AppLayout>
  );
}
