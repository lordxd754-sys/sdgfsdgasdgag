"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: number;
}

interface SidebarProps {
  formCount?: number;
  overdueCount?: number;
}

export function Sidebar({ formCount = 0, overdueCount = 0 }: SidebarProps) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
    { href: "/alunos", label: "Alunos", icon: "group" },
    { href: "/treinos", label: "Treinos", icon: "fitness_center" },
    { href: "/treino", label: "Módulo Aluno", icon: "sports_gymnastics" },
    { href: "/acompanhamento", label: "Acompanhamento", icon: "monitoring", badge: overdueCount },
    { href: "/configuracoes", label: "Configurações", icon: "settings" },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/treino")
      return pathname === "/treino" || pathname.startsWith("/treino/");
    if (href === "/treinos")
      return (
        pathname === "/treinos" ||
        (pathname.startsWith("/treinos/") && !pathname.startsWith("/treino/"))
      );
    return pathname.startsWith(href);
  };

  // Bottom nav items (mobile — 4 items)
  const bottomNavItems = [
    { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
    { href: "/alunos", label: "Alunos", icon: "group" },
    { href: "/treino", label: "Treino", icon: "sports_gymnastics" },
    { href: "/configuracoes", label: "Ajustes", icon: "settings" },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex h-screen w-64 fixed left-0 top-0 bg-surface-container border-r border-outline-variant flex-col py-8 z-50">
        <div className="px-8 mb-10">
          <h1 className="text-headline-md font-bold text-primary">PT Manager</h1>
          <p className="text-label-sm text-on-surface-variant tracking-wider uppercase opacity-60 mt-1">Elite Consultancy</p>
        </div>

        <nav className="flex-1 space-y-1 px-4">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 rounded-lg text-body-md transition-colors group",
                  active
                    ? "text-primary font-bold bg-primary/5 border-l-4 border-primary rounded-l-none"
                    : "text-on-surface-variant hover:bg-surface-container-high"
                )}
              >
                <span
                  className={cn(
                    "material-symbols-outlined text-[22px] transition-colors",
                    active ? "text-primary" : "group-hover:text-primary"
                  )}
                >
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-on-primary">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-8 mt-auto">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-4 text-on-surface-variant hover:text-error transition-colors py-4"
          >
            <span className="material-symbols-outlined text-[22px]">logout</span>
            <span className="text-label-md">Sair</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-2 h-20 bg-surface/90 backdrop-blur-xl border-t border-outline-variant/30 shadow-[0_-4px_20px_rgba(78,222,163,0.05)] rounded-t-xl">
        {bottomNavItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center transition-colors relative",
                active ? "text-primary font-bold scale-110" : "text-on-surface-variant hover:text-primary"
              )}
            >
              <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
              <span className="text-label-sm mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
