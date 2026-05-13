"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FileText,
  Dumbbell,
  MessageSquare,
  Settings,
  Zap,
  LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

interface SidebarProps {
  formCount?: number;
  overdueCount?: number;
}

export function Sidebar({ formCount = 0, overdueCount = 0 }: SidebarProps) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/alunos", label: "Alunos", icon: Users },
    { href: "/formularios", label: "Formulários", icon: FileText, badge: formCount },
    { href: "/treinos", label: "Treinos", icon: Dumbbell },
    {
      href: "/acompanhamento",
      label: "Acompanhamento",
      icon: MessageSquare,
      badge: overdueCount,
    },
    { href: "/configuracoes", label: "Configurações", icon: Settings },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 border-r border-[#2a2a2a] bg-[#111] flex flex-col z-40">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[#2a2a2a]">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500">
          <Zap className="h-4 w-4 text-black" />
        </div>
        <span className="font-syne text-base font-bold text-white">PT Manager</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
                active
                  ? "bg-green-500/10 text-green-400"
                  : "text-gray-500 hover:bg-[#1a1a1a] hover:text-gray-300"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-green-500 px-1 text-xs font-bold text-black">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[#2a2a2a] px-3 py-3">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-500 hover:bg-[#1a1a1a] hover:text-gray-300 transition-all"
        >
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
