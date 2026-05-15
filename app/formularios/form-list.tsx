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
    const parsed = JSON.parse(rawData);
    const data =
      typeof parsed.rawRequest === "string"
        ? { ...parsed, ...JSON.parse(parsed.rawRequest) }
        : parsed;

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
      toast("Aluno criado com sucesso!");
      setCreateModal(null);
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      toast(data?.error ?? "Erro ao criar aluno", "error");
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
              <tr className="border-b border-outline-variant text-left bg-surface-container-high/50">
                <th className="px-4 py-3 text-label-md text-on-surface-variant uppercase tracking-wider">Nome</th>
                <th className="px-4 py-3 text-label-md text-on-surface-variant uppercase tracking-wider">E-mail</th>
                <th className="px-4 py-3 text-label-md text-on-surface-variant uppercase tracking-wider">Recebido</th>
                <th className="px-4 py-3 text-label-md text-on-surface-variant uppercase tracking-wider">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {forms.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-label-md text-on-surface-variant">
                    Nenhum formulário recebido ainda
                  </td>
                </tr>
              )}
              {forms.map((form: (typeof forms)[number]) => {
                const { name, email } = extractFromRaw(form.rawData);
                return (
                  <tr key={form.id} className="hover:bg-surface-container-high transition-colors">
                    <td className="px-4 py-3 text-body-md font-semibold text-on-surface">{name || "—"}</td>
                    <td className="px-4 py-3 text-body-md text-on-surface-variant">{email || "—"}</td>
                    <td className="px-4 py-3 text-body-md text-on-surface-variant">{formatDateTime(form.receivedAt)}</td>
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
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                          Ver dados
                        </Button>
                        {form.status === "novo" && (
                          <>
                            <Button size="sm" onClick={() => setCreateModal(form)}>
                              <span className="material-symbols-outlined text-[16px]">person_add</span>
                              Criar aluno
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDiscard(form.id)}
                              disabled={discarding === form.id}
                            >
                              <span className={`material-symbols-outlined text-[16px] ${discarding === form.id ? "animate-spin" : ""}`}>
                                {discarding === form.id ? "refresh" : "close"}
                              </span>
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
          <pre className="overflow-auto max-h-96 rounded-xl bg-surface-container-lowest p-4 text-label-sm text-primary font-mono">
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
                      <span className={`material-symbols-outlined text-[18px] ${creating ? "animate-spin" : ""}`}>
                        {creating ? "refresh" : "person_add"}
                      </span>
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
