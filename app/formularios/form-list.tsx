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
import { extractStudentFromRaw } from "@/lib/form-utils";
import Link from "next/link";

interface FormResponse {
  id: string;
  rawData: string;
  status: string;
  studentId: string | null;
  receivedAt: Date;
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

    const formEl = e.currentTarget;
    const data = Object.fromEntries(new FormData(formEl));

    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, formId: createModal.id }),
    });

    if (res.ok) {
      toast("Aluno criado com sucesso!");
      setCreateModal(null);
      router.refresh();
    } else {
      const body = await res.json().catch(() => null);
      toast(body?.error ?? "Erro ao criar aluno", "error");
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
              {forms.map((form) => {
                const { name, email } = extractStudentFromRaw(form.rawData);
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
                        {form.status === "novo" ? "Novo"
                          : form.status === "processado" ? "Processado"
                          : "Descartado"}
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
                        {form.status === "processado" && form.studentId && (
                          <Link
                            href={`/alunos/${form.studentId}`}
                            className="inline-flex items-center gap-1.5 rounded-xl py-1.5 px-3 text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all duration-150"
                          >
                            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                            Ver aluno
                          </Link>
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
        {createModal && (() => {
          const f = extractStudentFromRaw(createModal.rawData);
          return (
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Nome *</Label>
                  <Input name="name" defaultValue={f.name} required />
                </div>
                <div className="space-y-1.5">
                  <Label>E-mail</Label>
                  <Input name="email" type="email" defaultValue={f.email} />
                </div>
                <div className="space-y-1.5">
                  <Label>WhatsApp</Label>
                  <Input name="phone" defaultValue={f.phone} />
                </div>
                <div className="space-y-1.5">
                  <Label>Cidade</Label>
                  <Input name="city" defaultValue={f.city} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Objetivo</Label>
                  <Input name="goal" defaultValue={f.goal} />
                </div>
                <div className="space-y-1.5">
                  <Label>Nível</Label>
                  <Select name="level" defaultValue={f.level || "iniciante"}>
                    <option value="iniciante">Iniciante</option>
                    <option value="intermediario">Intermediário</option>
                    <option value="avancado">Avançado</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Dias/semana</Label>
                  <Select name="daysPerWeek" defaultValue={f.daysPerWeek || "3"}>
                    <option value="2">2 dias</option>
                    <option value="3">3 dias</option>
                    <option value="4">4 dias</option>
                    <option value="5">5 dias</option>
                    <option value="6">6 dias</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Duração da sessão (min)</Label>
                  <Input name="sessionDuration" type="number" defaultValue={f.sessionDuration || "60"} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Restrições / lesões</Label>
                  <Input name="restrictions" defaultValue={f.restrictions} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Equipamentos disponíveis</Label>
                  <Input name="equipment" defaultValue={f.equipment} />
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
            </form>
          );
        })()}
      </Modal>
    </>
  );
}
