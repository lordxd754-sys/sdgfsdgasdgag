"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { formatDate, levelLabel } from "@/lib/utils";

type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: string;
  rest: number;
  notes: string | null;
  order: number;
  videoUrl?: string | null;
  muscleGroup?: string | null;
};

function isYoutube(url: string) {
  return url.includes("youtube.com") || url.includes("youtu.be");
}
function youtubeVideoId(url: string) {
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([^&?\s]+)/);
  return match?.[1] ?? "";
}

type Session = {
  id: string;
  name: string;
  order: number;
  exercises: Exercise[];
  warmup?: string | null;
};

type Student = {
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

type Workout = {
  id: string;
  title: string;
  status: string;
  createdAt: Date;
  mfitSyncedAt: Date | null;
  content?: string | null;
  sessions: Session[];
  student: Student | null;
};

function parseContentExtras(content?: string | null): {
  generalNotes: string | null;
  warmupBySession: Record<string, string>;
  muscleGroupByExercise: Record<string, string>;
} {
  if (!content) return { generalNotes: null, warmupBySession: {}, muscleGroupByExercise: {} };
  try {
    const parsed = JSON.parse(content);
    const warmupBySession: Record<string, string> = {};
    const muscleGroupByExercise: Record<string, string> = {};
    for (const s of parsed.sessions ?? []) {
      if (s.warmup) warmupBySession[s.name] = s.warmup;
      for (const ex of s.exercises ?? []) {
        if (ex.muscleGroup) muscleGroupByExercise[ex.name] = ex.muscleGroup;
      }
    }
    return { generalNotes: parsed.generalNotes ?? null, warmupBySession, muscleGroupByExercise };
  } catch {
    return { generalNotes: null, warmupBySession: {}, muscleGroupByExercise: {} };
  }
}

export function WorkoutEditor({ workout: initial }: { workout: Workout }) {
  const { toast } = useToast();
  const [workout, setWorkout] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mfitDone, setMfitDone] = useState(!!initial.mfitSyncedAt);

  const { generalNotes, warmupBySession, muscleGroupByExercise } = parseContentExtras(
    workout.content
  );

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
                  videoUrl: null,
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

  async function doRegenerate() {
    setShowRegenerateConfirm(false);
    setRegenerating(true);
    setRegenerateError(null);
    setAiGenerated(false);
    const res = await fetch(`/api/workouts/${workout.id}/generate`, { method: "POST" });
    if (res.ok) {
      const updated = await res.json();
      setWorkout((w) => ({
        ...w,
        title: updated.title ?? w.title,
        status: updated.status ?? w.status,
        sessions: updated.sessions ?? w.sessions,
        content: updated.content ?? w.content,
      }));
      setAiGenerated(true);
      toast("Treino gerado pela IA Especialista!");
    } else {
      const data = await res.json().catch(() => ({}));
      const msg = data.error || "Erro ao gerar treino. Tente novamente.";
      setRegenerateError(msg);
      toast(msg, "error");
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
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link href={workout.student ? `/alunos/${workout.student.id}` : "/alunos"}>
          <Button variant="ghost" size="icon">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </Button>
        </Link>
        <div className="flex-1">
          <Input
            value={workout.title}
            onChange={(e) => setWorkout((w) => ({ ...w, title: e.target.value }))}
            className="text-xl font-bold bg-transparent border-transparent hover:border-outline-variant focus:border-primary/50 px-2"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {aiGenerated && (
            <Badge variant="success" className="text-xs whitespace-nowrap">
              <span className="material-symbols-outlined text-[14px] mr-1">verified</span>
              IA Especialista ✓
            </Badge>
          )}
          <Badge
            variant={
              workout.status === "aprovado"
                ? "success"
                : workout.status === "enviado_mfit"
                  ? "secondary"
                  : "outline"
            }
          >
            {workout.status === "rascunho"
              ? "Rascunho"
              : workout.status === "aprovado"
                ? "Aprovado"
                : "No MFIT"}
          </Badge>
        </div>
      </div>

      {/* General notes from AI */}
      {generalNotes && (
        <Card className="mb-6 bg-primary/5 border-primary/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary text-[22px] shrink-0 mt-0.5">
                psychology
              </span>
              <div>
                <p className="text-label-sm font-semibold text-primary mb-1">
                  Orientações do Personal IA
                </p>
                <p className="text-sm text-on-surface leading-relaxed">{generalNotes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Left - Student info */}
        <div className="col-span-12 lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Aluno</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {workout.student ? (
                <>
                  <div>
                    <p className="text-base font-semibold text-on-surface">
                      {workout.student.name}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {levelLabel(workout.student.level)}
                    </p>
                  </div>
                  {workout.student.goal && (
                    <div>
                      <p className="text-xs text-on-surface-variant mb-0.5">Objetivo</p>
                      <p className="text-sm text-on-surface">{workout.student.goal}</p>
                    </div>
                  )}
                  {workout.student.restrictions && (
                    <div>
                      <p className="text-xs text-on-surface-variant mb-0.5">Restrições</p>
                      <p className="text-sm text-on-surface">{workout.student.restrictions}</p>
                    </div>
                  )}
                  <div className="flex gap-2 text-xs text-on-surface-variant">
                    <span>{workout.student.daysPerWeek}x/sem</span>
                    <span>·</span>
                    <span>{workout.student.sessionDuration}min</span>
                  </div>
                  {workout.student.photos.length > 0 && (
                    <div>
                      <p className="text-xs text-on-surface-variant mb-1.5">
                        Fotos de avaliação
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {workout.student.photos.slice(0, 4).map((p) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={p.id}
                            src={p.url}
                            alt={p.angle ?? "foto"}
                            className="rounded-lg aspect-[3/4] object-cover w-full"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-on-surface-variant">Aluno não encontrado</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Center - Workout editor */}
        <div className="col-span-12 lg:col-span-5">
          <div className="flex gap-2 mb-4 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRegenerateConfirm(true)}
              disabled={regenerating}
            >
              {regenerating ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">
                    refresh
                  </span>
                  Consultando IA…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">auto_fix_high</span>
                  Regenerar com IA
                </>
              )}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleSave()}
              disabled={saving}
            >
              {saving ? (
                <span className="material-symbols-outlined text-[18px] animate-spin">
                  refresh
                </span>
              ) : (
                <span className="material-symbols-outlined text-[18px]">save</span>
              )}
              Salvar
            </Button>
            {workout.status !== "aprovado" && (
              <Button
                size="sm"
                onClick={() => handleSave("aprovado")}
                disabled={saving}
              >
                <span className="material-symbols-outlined text-[18px]">check</span>
                Aprovar
              </Button>
            )}
          </div>

          {/* Regeneration loading state */}
          {regenerating && (
            <div className="mb-4 rounded-xl bg-primary/10 border border-primary/30 px-4 py-3 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-[20px] animate-spin">
                refresh
              </span>
              <p className="text-sm text-on-surface">
                Consultando Personal IA… isso pode levar alguns segundos
              </p>
            </div>
          )}

          {/* Error state */}
          {regenerateError && !regenerating && (
            <div className="mb-4 rounded-xl bg-error/10 border border-error/30 px-4 py-3 flex items-start gap-3">
              <span className="material-symbols-outlined text-error text-[20px] shrink-0 mt-0.5">
                error
              </span>
              <p className="text-sm text-error">{regenerateError}</p>
            </div>
          )}

          <div className="space-y-4">
            {workout.sessions.map((session, si) => {
              const warmup = session.warmup ?? warmupBySession[session.name];
              return (
                <Card key={session.id}>
                  <div className="mb-3">
                    <Input
                      value={session.name}
                      onChange={(e) => updateSession(si, "name", e.target.value)}
                      className="font-semibold text-on-surface"
                      placeholder="Nome da sessão"
                    />
                  </div>

                  {/* Warmup */}
                  {warmup && (
                    <div className="mb-3 flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                      <span className="text-amber-500 text-[16px] shrink-0 mt-0.5">🔥</span>
                      <div>
                        <p className="text-xs font-semibold text-amber-500 mb-0.5">Aquecimento</p>
                        <p className="text-xs text-on-surface leading-relaxed">{warmup}</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {session.exercises.map((ex, ei) => {
                      const muscleGroup =
                        ex.muscleGroup ?? muscleGroupByExercise[ex.name] ?? null;
                      return (
                        <div
                          key={ex.id}
                          className="flex gap-2 items-start rounded-lg bg-surface-container-lowest p-2.5"
                        >
                          <span className="text-xs text-on-surface-variant mt-2 w-4 text-right shrink-0">
                            {ei + 1}
                          </span>
                          <div className="flex-1 grid gap-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Input
                                value={ex.name}
                                onChange={(e) =>
                                  updateExercise(si, ei, "name", e.target.value)
                                }
                                placeholder="Nome do exercício"
                                className="text-sm flex-1 min-w-0"
                              />
                              {muscleGroup && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0 whitespace-nowrap">
                                  {muscleGroup}
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                              <div>
                                <label className="text-xs text-on-surface-variant">Séries</label>
                                <Input
                                  type="number"
                                  value={ex.sets}
                                  onChange={(e) =>
                                    updateExercise(
                                      si,
                                      ei,
                                      "sets",
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-on-surface-variant">Reps</label>
                                <Input
                                  value={ex.reps}
                                  onChange={(e) =>
                                    updateExercise(si, ei, "reps", e.target.value)
                                  }
                                  placeholder="10-12"
                                  className="text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-on-surface-variant">
                                  Descanso (s)
                                </label>
                                <Input
                                  type="number"
                                  value={ex.rest}
                                  onChange={(e) =>
                                    updateExercise(
                                      si,
                                      ei,
                                      "rest",
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="text-xs"
                                />
                              </div>
                            </div>
                            <Input
                              value={ex.notes ?? ""}
                              onChange={(e) =>
                                updateExercise(si, ei, "notes", e.target.value)
                              }
                              placeholder="Observações técnicas..."
                              className="text-xs"
                            />
                            <div>
                              <label className="text-xs text-on-surface-variant">
                                URL do vídeo (YouTube ou MP4)
                              </label>
                              <div className="flex gap-2 items-center">
                                <Input
                                  value={ex.videoUrl ?? ""}
                                  onChange={(e) =>
                                    updateExercise(si, ei, "videoUrl", e.target.value)
                                  }
                                  placeholder="https://youtube.com/watch?v=..."
                                  className="text-xs"
                                />
                                {ex.videoUrl && isYoutube(ex.videoUrl) && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={`https://img.youtube.com/vi/${youtubeVideoId(ex.videoUrl)}/default.jpg`}
                                    alt="thumb"
                                    className="h-8 w-12 object-cover rounded shrink-0"
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => removeExercise(si, ei)}
                            className="text-on-surface-variant hover:text-error transition-colors mt-1.5"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 w-full text-on-surface-variant"
                    onClick={() => addExercise(si)}
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Adicionar exercício
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Right - MFIT export */}
        <div className="col-span-12 lg:col-span-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Exportação MFIT</CardTitle>
                <Button variant="outline" size="sm" onClick={copyExport}>
                  <span className="material-symbols-outlined text-[18px]">content_copy</span>
                  {copied ? "Copiado!" : "Copiar"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="text-xs text-on-surface whitespace-pre-wrap font-mono leading-relaxed bg-surface-container-lowest rounded-lg p-4 max-h-[500px] overflow-y-auto">
                {exportText || "Adicione exercícios para ver o preview"}
              </pre>
              <label className="mt-4 flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={mfitDone}
                  onChange={(e) => handleMfitDone(e.target.checked)}
                  className="h-4 w-4 rounded accent-primary"
                />
                <span className="text-sm text-on-surface-variant group-hover:text-on-surface transition-colors">
                  ✅ Já cadastrei no MFIT
                </span>
              </label>
              {workout.mfitSyncedAt && (
                <p className="mt-1 text-xs text-on-surface-variant">
                  Sincronizado em {formatDate(workout.mfitSyncedAt)}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Regenerate confirmation modal */}
      <Modal
        open={showRegenerateConfirm}
        onClose={() => setShowRegenerateConfirm(false)}
        title="Regenerar treino com IA?"
      >
        <p className="text-on-surface-variant mb-6">
          Isso vai substituir todas as sessões e exercícios do treino atual pelo que a IA
          Especialista gerar. O título também será atualizado.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setShowRegenerateConfirm(false)}>
            Cancelar
          </Button>
          <Button onClick={doRegenerate}>
            <span className="material-symbols-outlined text-[18px]">auto_fix_high</span>
            Regenerar mesmo assim
          </Button>
        </div>
      </Modal>
    </div>
  );
}
