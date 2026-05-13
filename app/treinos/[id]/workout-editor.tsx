"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  ArrowLeft, Save, Wand2, CheckCircle, ClipboardCopy, Plus, Trash2, Loader2,
} from "lucide-react";
import { formatDate, levelLabel } from "@/lib/utils";

type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: string;
  rest: number;
  notes: string | null;
  order: number;
};

type Session = {
  id: string;
  name: string;
  order: number;
  exercises: Exercise[];
};

type Workout = {
  id: string;
  title: string;
  status: string;
  createdAt: Date;
  mfitSyncedAt: Date | null;
  sessions: Session[];
  student: {
    id: string;
    name: string;
    goal: string | null;
    level: string;
    restrictions: string | null;
    equipment: string | null;
    daysPerWeek: number;
    sessionDuration: number;
    photos: { id: string; url: string; angle: string | null }[];
  };
};

export function WorkoutEditor({ workout: initial }: { workout: Workout }) {
  const { toast } = useToast();
  const [workout, setWorkout] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mfitDone, setMfitDone] = useState(!!initial.mfitSyncedAt);

  function updateSession(sessionIdx: number, field: string, value: string) {
    setWorkout((w) => ({
      ...w,
      sessions: w.sessions.map((s, i) =>
        i === sessionIdx ? { ...s, [field]: value } : s
      ),
    }));
  }

  function updateExercise(sessionIdx: number, exIdx: number, field: string, value: string | number) {
    setWorkout((w) => ({
      ...w,
      sessions: w.sessions.map((s, i) =>
        i === sessionIdx
          ? {
              ...s,
              exercises: s.exercises.map((ex, j) =>
                j === exIdx ? { ...ex, [field]: value } : ex
              ),
            }
          : s
      ),
    }));
  }

  function addExercise(sessionIdx: number) {
    setWorkout((w) => ({
      ...w,
      sessions: w.sessions.map((s, i) =>
        i === sessionIdx
          ? {
              ...s,
              exercises: [
                ...s.exercises,
                {
                  id: `new-${Date.now()}`,
                  name: "",
                  sets: 3,
                  reps: "10-12",
                  rest: 60,
                  notes: null,
                  order: s.exercises.length + 1,
                },
              ],
            }
          : s
      ),
    }));
  }

  function removeExercise(sessionIdx: number, exIdx: number) {
    setWorkout((w) => ({
      ...w,
      sessions: w.sessions.map((s, i) =>
        i === sessionIdx
          ? { ...s, exercises: s.exercises.filter((_, j) => j !== exIdx) }
          : s
      ),
    }));
  }

  async function handleSave(newStatus?: string) {
    setSaving(true);
    const res = await fetch(`/api/workouts/${workout.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: workout.title,
        status: newStatus ?? workout.status,
        sessions: workout.sessions,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setWorkout((w) => ({ ...w, status: updated.status }));
      toast(newStatus === "aprovado" ? "Treino aprovado!" : "Salvo com sucesso!");
    } else {
      toast("Erro ao salvar", "error");
    }
    setSaving(false);
  }

  async function handleRegenerate() {
    setRegenerating(true);
    const res = await fetch(`/api/workouts/${workout.id}/generate`, { method: "POST" });
    if (res.ok) {
      const updated = await res.json();
      setWorkout((w) => ({ ...w, sessions: updated.sessions }));
      toast("Treino regenerado com IA!");
    } else {
      toast("Erro ao regenerar treino", "error");
    }
    setRegenerating(false);
  }

  async function handleMfitDone(checked: boolean) {
    setMfitDone(checked);
    if (checked) {
      await fetch(`/api/workouts/${workout.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "enviado_mfit", mfitSynced: true }),
      });
      toast("Marcado como enviado ao MFIT!");
    }
  }

  const exportText = workout.sessions
    .map((s) => {
      const exLines = s.exercises.map(
        (ex, i) =>
          `  ${i + 1}. ${ex.name} | ${ex.sets}x${ex.reps} | ${ex.rest}s descanso${ex.notes ? ` | ${ex.notes}` : ""}`
      );
      return `${s.name}\n${exLines.join("\n")}`;
    })
    .join("\n\n");

  function copyExport() {
    navigator.clipboard.writeText(exportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/alunos/${workout.student.id}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <Input
            value={workout.title}
            onChange={(e) => setWorkout((w) => ({ ...w, title: e.target.value }))}
            className="text-xl font-bold bg-transparent border-transparent hover:border-[#2a2a2a] focus:border-green-500/50 px-2"
          />
        </div>
        <Badge
          variant={
            workout.status === "aprovado" ? "success"
            : workout.status === "enviado_mfit" ? "secondary"
            : "outline"
          }
        >
          {workout.status === "rascunho" ? "Rascunho" : workout.status === "aprovado" ? "Aprovado" : "No MFIT"}
        </Badge>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left - Student info */}
        <div className="col-span-12 lg:col-span-3">
          <Card>
            <CardHeader><CardTitle>Aluno</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-base font-semibold text-white">{workout.student.name}</p>
                <p className="text-xs text-gray-500">{levelLabel(workout.student.level)}</p>
              </div>
              {workout.student.goal && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Objetivo</p>
                  <p className="text-sm text-gray-300">{workout.student.goal}</p>
                </div>
              )}
              {workout.student.restrictions && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Restrições</p>
                  <p className="text-sm text-gray-300">{workout.student.restrictions}</p>
                </div>
              )}
              <div className="flex gap-2 text-xs text-gray-500">
                <span>{workout.student.daysPerWeek}x/sem</span>
                <span>·</span>
                <span>{workout.student.sessionDuration}min</span>
              </div>
              {workout.student.photos.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Fotos de avaliação</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {workout.student.photos.slice(0, 4).map((p) => (
                      <img key={p.id} src={p.url} alt={p.angle ?? "foto"} className="rounded-lg aspect-[3/4] object-cover w-full" />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Center - Workout editor */}
        <div className="col-span-12 lg:col-span-5">
          <div className="flex gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={regenerating}>
              {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Regenerar com IA
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleSave()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </Button>
            {workout.status !== "aprovado" && (
              <Button size="sm" onClick={() => handleSave("aprovado")} disabled={saving}>
                <CheckCircle className="h-4 w-4" />
                Aprovar
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {workout.sessions.map((session, si) => (
              <Card key={session.id}>
                <div className="mb-3">
                  <Input
                    value={session.name}
                    onChange={(e) => updateSession(si, "name", e.target.value)}
                    className="font-semibold text-white"
                    placeholder="Nome da sessão"
                  />
                </div>
                <div className="space-y-2">
                  {session.exercises.map((ex, ei) => (
                    <div key={ex.id} className="flex gap-2 items-start rounded-lg bg-[#0f0f0f] p-2.5">
                      <span className="text-xs text-gray-600 mt-2 w-4 text-right shrink-0">{ei + 1}</span>
                      <div className="flex-1 grid gap-1.5">
                        <Input
                          value={ex.name}
                          onChange={(e) => updateExercise(si, ei, "name", e.target.value)}
                          placeholder="Nome do exercício"
                          className="text-sm"
                        />
                        <div className="grid grid-cols-3 gap-1.5">
                          <div>
                            <label className="text-xs text-gray-600">Séries</label>
                            <Input
                              type="number"
                              value={ex.sets}
                              onChange={(e) => updateExercise(si, ei, "sets", parseInt(e.target.value) || 0)}
                              className="text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">Reps</label>
                            <Input
                              value={ex.reps}
                              onChange={(e) => updateExercise(si, ei, "reps", e.target.value)}
                              placeholder="10-12"
                              className="text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">Descanso (s)</label>
                            <Input
                              type="number"
                              value={ex.rest}
                              onChange={(e) => updateExercise(si, ei, "rest", parseInt(e.target.value) || 0)}
                              className="text-xs"
                            />
                          </div>
                        </div>
                        <Input
                          value={ex.notes ?? ""}
                          onChange={(e) => updateExercise(si, ei, "notes", e.target.value)}
                          placeholder="Observações técnicas..."
                          className="text-xs"
                        />
                      </div>
                      <button
                        onClick={() => removeExercise(si, ei)}
                        className="text-gray-600 hover:text-red-400 transition-colors mt-1.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 w-full text-gray-500"
                  onClick={() => addExercise(si)}
                >
                  <Plus className="h-4 w-4" />
                  Adicionar exercício
                </Button>
              </Card>
            ))}
          </div>
        </div>

        {/* Right - MFIT export */}
        <div className="col-span-12 lg:col-span-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Exportação MFIT</CardTitle>
                <Button variant="outline" size="sm" onClick={copyExport}>
                  <ClipboardCopy className="h-4 w-4" />
                  {copied ? "Copiado!" : "Copiar"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed bg-[#0f0f0f] rounded-lg p-4 max-h-[500px] overflow-y-auto">
                {exportText || "Adicione exercícios para ver o preview"}
              </pre>
              <label className="mt-4 flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={mfitDone}
                  onChange={(e) => handleMfitDone(e.target.checked)}
                  className="h-4 w-4 rounded accent-green-500"
                />
                <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                  ✅ Já cadastrei no MFIT
                </span>
              </label>
              {workout.mfitSyncedAt && (
                <p className="mt-1 text-xs text-gray-600">
                  Sincronizado em {formatDate(workout.mfitSyncedAt)}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
