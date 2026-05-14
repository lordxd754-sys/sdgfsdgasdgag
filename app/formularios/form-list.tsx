"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { Eye, UserPlus, X, Loader2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface FormResponse {
  id: string;
  rawData: string;
  status: string;
  studentId: string | null;
  receivedAt: Date;
}

function flattenJotformField(val: unknown): string {
  if (!val) return "";
  if (typeof val === "string") return val.trim();
  if (typeof val === "object") {
    // Jotform name fields: { first: "João", last: "Silva" }
    const v = val as Record<string, string>;
    if (v.first || v.last) return `${v.first ?? ""} ${v.last ?? ""}`.trim();
    // Jotform address fields: { addr_line1, city, state, ... }
    return Object.values(v).filter(Boolean).join(", ");
  }
  return String(val);
}

function extractFromRaw(rawData: string) {
  try {
    const data = JSON.parse(rawData);

    // Scan all keys for name-like fields (handles any q-number prefix)
    const findField = (...keys: string[]) => {
      for (const k of keys) {
        if (data[k] !== undefined && data[k] !== "") return flattenJotformField(data[k]);
      }
      // Fuzzy match: find any key that contains one of the key patterns
      for (const k of keys) {
        const match = Object.keys(data).find(
          (dk) => dk.toLowerCase().includes(k.toLowerCase())
        );
        if (match && data[match]) return flattenJotformField(data[match]);
      }
      return "";
    };

    const name = findField(
      "q3_nome", "q3_name", "nome", "name", "q3_nome_completo",
      "nome_completo", "fullName", "full_name", "Nome"
    );
    const email = findField(
      "q4_email", "email", "Email", "q4_emailAddress", "emailAddress"
    );
    const phone = findField(
      "q5_phone", "phone", "telefone", "whatsapp", "celular",
      "q5_phoneNumber", "phoneNumber"
    );
    const goal = findField(
      "q6_objetivo", "objetivo", "goal", "q6_goal", "meta", "objetivo_principal"
    );

    return { name, email, phone, goal };
  } catch {
    return { name: "", email: "", phone: "", goal: "" };
  }
}

export function FormList({ forms }: { forms: FormResponse[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [viewModal, setViewModal] = useState<FormResponse | null>(null);
  const [createModal, setCreateModal] = useState<FormResponse | null>(null);
  const [creating, setCreating] = useState(false);
  const [discarding, setDiscarding] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!createModal) return;
    setCreating(true);

    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));

    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, formId: createModal.id }),
    });

    if (res.ok) {
      const student = await res.json();
      await fetch(`/api/forms/${createModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "processado", studentId: student.id }),
      });
      toast("Aluno criado com sucesso!");
      setCreateModal(null);
      router.refresh();
    } else {
      toast("Erro ao criar aluno", "error");
    }
    setCreating(false);
  }

  async function handleDiscard(id: string) {
    setDiscarding(id);
    await fetch(`/api/forms/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "descartado" }),
    });
    toast("Formulário descartado");
    setDiscarding(null);
    router.refresh();
  }

  return (
    <>
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2a2a2a] text-left">
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">Nome</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">E-mail</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">Recebido</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a]">
              {forms.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-500">
                    Nenhum formulário recebido ainda
                  </td>
                </tr>
              )}
              {forms.map((form: (typeof forms)[number]) => {
                const { name, email } = extractFromRaw(form.rawData);
                return (
                  <tr key={form.id} className="hover:bg-[#1f1f1f] transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-white">{name || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{email || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{formatDateTime(form.receivedAt)}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          form.status === "novo" ? "success"
                          : form.status === "processado" ? "secondary"
                          : "danger"
                        }
                      >
                        {form.status === "novo" ? "Novo" : form.status === "processado" ? "Processado" : "Descartado"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => setViewModal(form)}>
                          <Eye className="h-4 w-4" />
                          Ver dados
                        </Button>
                        {form.status === "novo" && (
                          <>
                            <Button size="sm" onClick={() => setCreateModal(form)}>
                              <UserPlus className="h-4 w-4" />
                              Criar aluno
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDiscard(form.id)}
                              disabled={discarding === form.id}
                            >
                              {discarding === form.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* View Modal */}
      <Modal open={!!viewModal} onClose={() => setViewModal(null)} title="Dados do formulário" className="max-w-2xl">
        {viewModal && (
          <pre className="overflow-auto max-h-96 rounded-lg bg-[#0f0f0f] p-4 text-xs text-green-400 font-mono">
            {JSON.stringify(JSON.parse(viewModal.rawData), null, 2)}
          </pre>
        )}
      </Modal>

      {/* Create Student Modal */}
      <Modal open={!!createModal} onClose={() => setCreateModal(null)} title="Criar aluno a partir do formulário" className="max-w-2xl">
        {createModal && (
          <form onSubmit={handleCreate} className="space-y-4">
            {(() => {
              const { name, email, phone, goal } = extractFromRaw(createModal.rawData);
              return (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Nome *</Label>
                      <Input name="name" defaultValue={name} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label>E-mail *</Label>
                      <Input name="email" type="email" defaultValue={email} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label>WhatsApp</Label>
                      <Input name="phone" defaultValue={phone} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Objetivo</Label>
                      <Input name="goal" defaultValue={goal} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Nível</Label>
                      <Select name="level">
                        <option value="iniciante">Iniciante</option>
                        <option value="intermediario">Intermediário</option>
                        <option value="avancado">Avançado</option>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Dias/semana</Label>
                      <Select name="daysPerWeek">
                        <option value="3">3 dias</option>
                        <option value="4">4 dias</option>
                        <option value="5">5 dias</option>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <Button variant="outline" type="button" onClick={() => setCreateModal(null)}>Cancelar</Button>
                    <Button type="submit" disabled={creating}>
                      {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                      Criar aluno
                    </Button>
                  </div>
                </>
              );
            })()}
          </form>
        )}
      </Modal>
    </>
  );
}
