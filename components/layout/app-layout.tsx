"use client";
import { Sidebar } from "./sidebar";
import { ToastProvider } from "@/components/ui/toast";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface AppLayoutProps {
  children: React.ReactNode;
  formCount?: number;
  overdueCount?: number;
  pageTitle?: string;
}

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/alunos": "Alunos",
  "/formularios": "Formulários",
  "/treinos": "Treinos",
  "/acompanhamento": "Acompanhamento",
  "/configuracoes": "Configurações",
};

function Header({ pageTitle }: { pageTitle?: string }) {
  const pathname = usePathname();
  const title = pageTitle ?? Object.entries(pageTitles).find(([k]) => pathname.startsWith(k))?.[1] ?? "PT Manager";

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 bg-surface/80 backdrop-blur-xl border-b border-outline-variant z-40 flex items-center justify-between px-4 lg:px-8">
      {/* Mobile: brand logo */}
      <div className="flex items-center gap-2 lg:hidden">
        <span className="material-symbols-outlined text-primary text-xl">fitness_center</span>
        <span className="text-headline-md font-bold text-primary">PT Manager</span>
      </div>
      {/* Desktop: page title */}
      <h2 className="hidden lg:block text-headline-md font-bold text-primary">{title}</h2>
      <div className="flex items-center gap-4">
        <button className="relative text-on-surface hover:text-primary transition-colors">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <div className="w-9 h-9 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center text-on-surface-variant">
          <span className="material-symbols-outlined text-[20px]">account_circle</span>
        </div>
      </div>
    </header>
  );
}

export function AppLayout({ children, formCount, overdueCount, pageTitle }: AppLayoutProps) {
  return (
    <ToastProvider>
      <Sidebar formCount={formCount} overdueCount={overdueCount} />
      <Header pageTitle={pageTitle} />
      <main className="lg:ml-64 pt-16 min-h-screen bg-background">
        <div className="px-4 lg:px-8 py-6 lg:py-8 pb-24 lg:pb-8 max-w-[1280px] mx-auto">
          {children}
        </div>
      </main>
    </ToastProvider>
  );
}
