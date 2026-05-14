"use client";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { Save, Loader2, TestTube } from "lucide-react";

type Settings = {
  id?: string;
  jotformSecret?: string | null;
  zapiToken?: string | null;
  zapiInstance?: string | null;
  zapiClientToken?: string | null;
  zapiPhone?: string | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpPass?: string | null;
  smtpFrom?: string | null;
  followUpTemplate?: string | null;
  autoFollowUp?: boolean;
  followUpHour?: number;
  workoutPreferences?: string | null;
};

const MASKED = "••••••••";

export function SettingsForm({ settings: initial }: { settings: Settings | null }) {
  const { toast } = useToast();
  const [tab, setTab] = useState<"integracoes" | "templates" | "treinos">("integracoes");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [form, setForm] = useState<Settings>(initial ?? {});

  function set(key: keyof Settings, value: string | number | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) toast("Configurações salvas!");
    else toast("Erro ao salvar", "error");
    setSaving(false);
  }

  async function test(type: string) {
    setTesting(type);
    const res = await fetch(`/api/settings/test/${type}`, { method: "POST" });
    const data = await res.json();
    if (data.success) toast(`Teste ${type} bem-sucedido!`);
    else toast(`Erro: ${data.error ?? "falha no teste"}`, "error");
    setTesting(null);
  }

  const tabs = [
    { key: "integracoes", label: "Integrações" },
    { key: "templates", label: "Templates" },
    { key: "treinos", label: "Preferências de Treino" },
  ] as const;

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex gap-1 border-b border-[#2a2a2a]">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === key
                ? "border-green-500 text-green-400"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "integracoes" && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Jotform</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Webhook Secret</Label>
                <Input
                  value={form.jotformSecret === MASKED ? "" : (form.jotformSecret ?? "")}
                  onChange={(e) => set("jotformSecret", e.target.value)}
                  placeholder={form.jotformSecret === MASKED ? "Já configurado — deixe em branco para manter" : "Secret para validar webhooks"}
                  type="password"
                />
              </div>
              <div className="rounded-lg bg-[#0f0f0f] p-3 space-y-1">
                <p className="text-xs text-gray-500">URL do webhook para configurar no Jotform (inclua o secret para validação):</p>
                <code className="text-xs text-green-400 break-all">
                  {typeof window !== "undefined" ? window.location.origin : "https://seu-app.vercel.app"}/api/webhooks/jotform
                  {form.jotformSecret && form.jotformSecret !== MASKED ? `?secret=${form.jotformSecret}` : "?secret=SEU_SECRET"}
                </code>
              </div>
              <Button variant="outline" size="sm" onClick={() => test("jotform")} disabled={testing === "jotform"}>
                {testing === "jotform" ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
                Testar
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>WhatsApp (Zapi)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Token</Label>
                  <Input
                    value={form.zapiToken === MASKED ? "" : (form.zapiToken ?? "")}
                    onChange={(e) => set("zapiToken", e.target.value)}
                    type="password"
                    placeholder={form.zapiToken === MASKED ? "Já configurado" : "Token da instância"}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Instance ID</Label>
                  <Input value={form.zapiInstance ?? ""} onChange={(e) => set("zapiInstance", e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Client Token</Label>
                  <Input
                    value={form.zapiClientToken === MASKED ? "" : (form.zapiClientToken ?? "")}
                    onChange={(e) => set("zapiClientToken", e.target.value)}
                    type="password"
                    placeholder={form.zapiClientToken === MASKED ? "Já configurado" : "Security Client Token do painel Zapi"}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Telefone padrão</Label>
                  <Input value={form.zapiPhone ?? ""} onChange={(e) => set("zapiPhone", e.target.value)} placeholder="5511999999999 (sem + ou espaços)" />
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => test("zapi")} disabled={testing === "zapi"}>
                {testing === "zapi" ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
                Testar WhatsApp
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>E-mail (SMTP)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Host SMTP</Label>
                  <Input value={form.smtpHost ?? ""} onChange={(e) => set("smtpHost", e.target.value)} placeholder="smtp.gmail.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Porta</Label>
                  <Input type="number" value={form.smtpPort ?? 587} onChange={(e) => set("smtpPort", parseInt(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Usuário</Label>
                  <Input value={form.smtpUser ?? ""} onChange={(e) => set("smtpUser", e.target.value)} type="email" />
                </div>
                <div className="space-y-1.5">
                  <Label>Senha</Label>
                  <Input
                    value={form.smtpPass === MASKED ? "" : (form.smtpPass ?? "")}
                    onChange={(e) => set("smtpPass", e.target.value)}
                    type="password"
                    placeholder={form.smtpPass === MASKED ? "Já configurado" : "Senha do e-mail"}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>E-mail remetente</Label>
                  <Input value={form.smtpFrom ?? ""} onChange={(e) => set("smtpFrom", e.target.value)} type="email" />
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => test("smtp")} disabled={testing === "smtp"}>
                {testing === "smtp" ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
                Testar e-mail
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "templates" && (
        <Card>
          <CardHeader><CardTitle>Template de acompanhamento</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-gray-500">
              Variáveis disponíveis: <code className="text-green-400">{"{nome}"}</code>{" "}
              <code className="text-green-400">{"{objetivo}"}</code>{" "}
              <code className="text-green-400">{"{treino_atual}"}</code>{" "}
              <code className="text-green-400">{"{dias}"}</code>
            </p>
            <Textarea
              rows={8}
              value={form.followUpTemplate ?? ""}
              onChange={(e) => set("followUpTemplate", e.target.value)}
              placeholder="Olá {nome}! Tudo bem? Passando para ver como está indo o {treino_atual}..."
            />
            <div className="space-y-1.5">
              <Label>Horário de envio automático (hora UTC)</Label>
              <Input
                type="number"
                min={0}
                max={23}
                value={form.followUpHour ?? 8}
                onChange={(e) => set("followUpHour", parseInt(e.target.value))}
                className="w-24"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "treinos" && (
        <Card>
          <CardHeader><CardTitle>Protocolo de treino</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500 mb-3">
              Descreva seu protocolo preferido. Isso será incluído no prompt da IA ao gerar treinos.
            </p>
            <Textarea
              rows={10}
              value={form.workoutPreferences ?? ""}
              onChange={(e) => set("workoutPreferences", e.target.value)}
              placeholder="Ex: Sempre usar periodização linear. Preferir exercícios compostos. Para iniciantes, priorizar movimentos fundamentais como agachamento, supino e remada..."
            />
          </CardContent>
        </Card>
      )}

      <div className="mt-6">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar configurações
        </Button>
      </div>
    </div>
  );
}
