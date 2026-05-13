"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";

interface StudentFormProps {
  defaultValues?: Record<string, string>;
  studentId?: string;
}

export function StudentForm({ defaultValues = {}, studentId }: StudentFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));

    try {
      const url = studentId ? `/api/students/${studentId}` : "/api/students";
      const method = studentId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Erro ao salvar");

      const saved = await res.json();
      toast(studentId ? "Aluno atualizado!" : "Aluno criado com sucesso!");
      router.push(`/alunos/${saved.id ?? studentId}`);
    } catch {
      toast("Erro ao salvar aluno", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      <Card>
        <h2 className="font-syne text-base font-semibold text-white mb-4">Dados pessoais</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nome completo *</Label>
            <Input id="name" name="name" defaultValue={defaultValues.name} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail *</Label>
            <Input id="email" name="email" type="email" defaultValue={defaultValues.email} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">WhatsApp</Label>
            <Input id="phone" name="phone" defaultValue={defaultValues.phone} placeholder="+55 11 99999-9999" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="birthdate">Data de nascimento</Label>
            <Input id="birthdate" name="birthdate" type="date" defaultValue={defaultValues.birthdate} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">Cidade</Label>
            <Input id="city" name="city" defaultValue={defaultValues.city} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <Select id="status" name="status" defaultValue={defaultValues.status ?? "ativo"}>
              <option value="ativo">Ativo</option>
              <option value="pausado">Pausado</option>
              <option value="inativo">Inativo</option>
            </Select>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="font-syne text-base font-semibold text-white mb-4">Objetivos e anamnese</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="goal">Objetivo principal</Label>
            <Input id="goal" name="goal" defaultValue={defaultValues.goal} placeholder="Ex: Hipertrofia, emagrecimento..." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="level">Nível de experiência</Label>
            <Select id="level" name="level" defaultValue={defaultValues.level ?? "iniciante"}>
              <option value="iniciante">Iniciante</option>
              <option value="intermediario">Intermediário</option>
              <option value="avancado">Avançado</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="daysPerWeek">Dias/semana disponíveis</Label>
            <Select id="daysPerWeek" name="daysPerWeek" defaultValue={defaultValues.daysPerWeek ?? "3"}>
              {[2, 3, 4, 5, 6].map((d) => (
                <option key={d} value={d}>{d} dias</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sessionDuration">Duração da sessão (min)</Label>
            <Select id="sessionDuration" name="sessionDuration" defaultValue={defaultValues.sessionDuration ?? "60"}>
              {[30, 45, 60, 75, 90].map((d) => (
                <option key={d} value={d}>{d} minutos</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mfitId">ID no MFIT</Label>
            <Input id="mfitId" name="mfitId" defaultValue={defaultValues.mfitId} placeholder="ID para referência cruzada" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="restrictions">Restrições médicas / lesões</Label>
            <Textarea id="restrictions" name="restrictions" defaultValue={defaultValues.restrictions} rows={3} placeholder="Ex: Hérnia de disco L4-L5, dor no joelho..." />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="equipment">Equipamentos disponíveis</Label>
            <Textarea id="equipment" name="equipment" defaultValue={defaultValues.equipment} rows={2} placeholder="Ex: Academia completa, halteres em casa..." />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="notes">Observações extras</Label>
            <Textarea id="notes" name="notes" defaultValue={defaultValues.notes} rows={3} placeholder="Qualquer informação relevante..." />
          </div>
        </div>
      </Card>

      <div className="flex gap-3">
        <Link href={studentId ? `/alunos/${studentId}` : "/alunos"}>
          <Button variant="outline" type="button">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </Link>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {studentId ? "Atualizar aluno" : "Criar aluno"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
