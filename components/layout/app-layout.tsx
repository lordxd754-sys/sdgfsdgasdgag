"use client";
import { Sidebar } from "./sidebar";
import { ToastProvider } from "@/components/ui/toast";

interface AppLayoutProps {
  children: React.ReactNode;
  formCount?: number;
  overdueCount?: number;
}

export function AppLayout({ children, formCount, overdueCount }: AppLayoutProps) {
  return (
    <ToastProvider>
      <Sidebar formCount={formCount} overdueCount={overdueCount} />
      <main className="ml-60 min-h-screen bg-[#0f0f0f]">
        <div className="mx-auto max-w-7xl p-8">{children}</div>
      </main>
    </ToastProvider>
  );
}
