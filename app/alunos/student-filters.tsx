"use client";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useCallback, useRef } from "react";

interface StudentFiltersProps {
  q: string;
  status: string;
  level: string;
}

export function StudentFilters({ q, status, level }: StudentFiltersProps) {
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = useCallback((key: string, value: string) => {
    const params = new URLSearchParams();
    if (key !== "q" && q) params.set("q", q);
    if (key !== "status" && status) params.set("status", status);
    if (key !== "level" && level) params.set("level", level);
    if (value) params.set(key, value);
    router.push(`/alunos?${params.toString()}`);
  }, [q, status, level, router]);

  return (
    <div className="flex gap-3 flex-wrap">
      <div className="relative flex-1 min-w-48">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant">search</span>
        <Input
          placeholder="Buscar por nome ou e-mail..."
          defaultValue={q}
          className="pl-9"
          onChange={(e) => {
            const val = e.target.value;
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
              const params = new URLSearchParams();
              if (val) params.set("q", val);
              if (status) params.set("status", status);
              if (level) params.set("level", level);
              router.replace(`/alunos?${params.toString()}`);
            }, 400);
          }}
        />
      </div>
      <Select
        value={status}
        onChange={(e) => update("status", e.target.value)}
        className="w-40"
      >
        <option value="">Todos os status</option>
        <option value="ativo">Ativo</option>
        <option value="pausado">Pausado</option>
        <option value="inativo">Inativo</option>
      </Select>
      <Select
        value={level}
        onChange={(e) => update("level", e.target.value)}
        className="w-44"
      >
        <option value="">Todos os níveis</option>
        <option value="iniciante">Iniciante</option>
        <option value="intermediario">Intermediário</option>
        <option value="avancado">Avançado</option>
      </Select>
    </div>
  );
}
