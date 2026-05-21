"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { cn, formatDate, levelLabel } from "@/lib/utils";

// ─── Common exercise suggestions ──────────────────────────────────────────────
const EXERCISE_SUGGESTIONS = [
  // Peito
  "Supino Reto com Barra","Supino Inclinado com Halteres","Supino Declinado",
  "Crucifixo com Halteres","Crucifixo Inclinado com Halteres",
  "Crossover Polia Alta","Crossover Polia Baixa","Peck Deck","Flexão de Braços",
  // Costas
  "Puxada Frontal","Puxada Fechada","Remada Curvada","Remada Unilateral",
  "Remada Cavalinho","Remada na Polia","Pulldown","Barra Fixa","Levantamento Terra",
  // Ombros
  "Desenvolvimento com Barra","Desenvolvimento com Halteres","Desenvolvimento no Smith",
  "Elevação Lateral com Halteres","Elevação Frontal com Anilha",
  "Elevação Posterior com Halteres","Encolhimento com Halteres","Arnold Press",
  // Bíceps
  "Rosca Direta com Barra","Rosca Alternada com Halteres","Rosca Martelo",
  "Rosca Scott","Rosca Concentrada","Rosca no Cabo",
  // Tríceps
  "Tríceps Testa","Tríceps Francês","Tríceps Pulley","Tríceps Corda",
  "Mergulho no Banco","Tríceps Coice",
  // Pernas
  "Agachamento Livre","Leg Press 45°","Agachamento no Smith",
  "Cadeira Extensora","Mesa Flexora","Stiff","Afundo com Halteres",
  "Avanço Alternado","Agachamento Sumô","Hip Thrust","Glúteo no Cabo",
  "Panturrilha em Pé","Panturrilha Sentado","Abdução de Quadril",
  // Abdome
  "Crunch Abdominal","Abdominal Remador","Abdominal Bicicleta","Prancha",
  "Elevação de Pernas",
  // Cardio
  "Esteira Caminhada","Esteira Corrida","Bicicleta Ergométrica","Elíptico",
  "Escada Rolante",
];

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isYoutube(url: string) {
  return url.includes("youtube.com") || url.includes("youtu.be");
}
function youtubeVideoId(url: string) {
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([^&?\s]+)/);
  return match?.[1] ?? "";
}

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

function newExercise(order: number): Exercise {
  return {
    id: `new-${Date.now()}-${Math.random()}`,
    name: "",
    sets: 3,
    reps: "10-12",
    rest: 60,
    notes: null,
    order,
    videoUrl: null,
  };
}

function newSession(order: number): Session {
  return {
    id: `new-session-${Date.now()}`,
    name: `Sessão ${order}`,
    order,
    exercises: [],
  };
}

// ─── ExerciseRow ──────────────────────────────────────────────────────────────
function ExerciseRow({
  ex,
  idx,
  total,
  expanded,
  muscleGroupFallback,
  onToggle,
  onChange,
  onMove,
  onRemove,
}: {
  ex: Exercise;
  idx: number;
  total: number;
  expanded: boolean;
  muscleGroupFallback: string | null;
  onToggle: () => void;
  onChange: (field: string, value: string | number) => void;
  onMove: (dir: "up" | "down") => void;
  onRemove: () => void;
}) {
  const muscleGroup = ex.muscleGroup ?? muscleGroupFallback;

  return (
    <div className="rounded-xl border border-outline-variant/50 bg-surface-container-lowest overflow-hidden">
      {/* Collapsed header — always visible */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none hover:bg-surface-container-high/40 transition-colors"
        onClick={onToggle}
      >
        <span className="material-symbols-outlined text-[18px] text-on-surface-variant/40 shrink-0">
          drag_indicator
        </span>
        <span className="text-xs text-on-surface-variant w-4 text-right shrink-0">{idx + 1}</span>
        <span className={cn("flex-1 text-sm font-medium truncate", ex.name ? "text-on-surface" : "text-on-surface-variant/50")}>
          {ex.name || "Exercício sem nome"}
        </span>
        {muscleGroup && !expanded && (
          <span className="hidden sm:inline text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0 whitespace-nowrap">
            {muscleGroup}
          </span>
        )}
        {!expanded && ex.name && (
          <span className="text-xs text-on-surface-variant shrink-0">
            {ex.sets}×{ex.reps}
          </span>
        )}
        {!expanded && (
          <span className="text-xs text-on-surface-variant/60 shrink-0">{ex.rest}s</span>
        )}
        <div className="flex items-center gap-0.5 shrink-0 ml-1" onClick={(e) => e.stopPropagation()}>
          <button
            disabled={idx === 0}
            onClick={() => onMove("up")}
            className="p-0.5 text-on-surface-variant hover:text-primary transition-colors disabled:opacity-20"
          >
            <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
          </button>
          <button
            disabled={idx === total - 1}
            onClick={() => onMove("down")}
            className="p-0.5 text-on-surface-variant hover:text-primary transition-colors disabled:opacity-20"
          >
            <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
          </button>
          <button
            onClick={onRemove}
            className="p-0.5 text-on-surface-variant hover:text-error transition-colors ml-0.5"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
        <span className={cn("material-symbols-outlined text-[18px] text-on-surface-variant transition-transform duration-200 shrink-0", expanded && "rotate-180")}>
          expand_more
        </span>
      </div>

      {/* Expanded form */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-outline-variant/30 space-y-2">
          {/* Name with datalist */}
          <div>
            <datalist id={`ex-suggestions-${ex.id}`}>
              {EXERCISE_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
            </datalist>
            <Input
              value={ex.name}
              onChange={(e) => onChange("name", e.target.value)}
              placeholder="Nome do exercício"
              list={`ex-suggestions-${ex.id}`}
              className="text-sm"
            />
          </div>

          {/* Séries × Reps × Descanso */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-on-surface-variant block mb-1">Séries</label>
              <Input
                type="number"
                min={1}
                value={ex.sets}
                onChange={(e) => onChange("sets", parseInt(e.target.value) || 1)}
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-on-surface-variant block mb-1">Reps</label>
              <Input
                value={ex.reps}
                onChange={(e) => onChange("reps", e.target.value)}
                placeholder="10-12"
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-on-surface-variant block mb-1">Descanso (s)</label>
              <Input
                type="number"
                min={0}
                value={ex.rest}
                onChange={(e) => onChange("rest", parseInt(e.target.value) || 0)}
                className="text-xs"
              />
            </div>
          </div>

          {/* Notes */}
          <Input
            value={ex.notes ?? ""}
            onChange={(e) => onChange("notes", e.target.value)}
            placeholder="Observações técnicas…"
            className="text-xs"
          />

          {/* Video */}
          <div>
            <label className="text-xs text-on-surface-variant block mb-1">Vídeo (YouTube ou MP4)</label>
            <div className="flex gap-2 items-center">
              <Input
                value={ex.videoUrl ?? ""}
                onChange={(e) => onChange("videoUrl", e.target.value)}
                placeholder="https://youtube.com/watch?v=…"
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

          {muscleGroup && (
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className="text-xs text-on-surface-variant">Grupo muscular:</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {muscleGroup}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SessionCard ──────────────────────────────────────────────────────────────
function SessionCard({
  session,
  sessionIdx,
  totalSessions,
  warmupFallback,
  muscleGroupByExercise,
  onUpdateSession,
  onUpdateExercise,
  onAddExercise,
  onRemoveExercise,
  onMoveExercise,
  onMoveSession,
  onRemoveSession,
}: {
  session: Session;
  sessionIdx: number;
  totalSessions: number;
  warmupFallback: string | null;
  muscleGroupByExercise: Record<string, string>;
  onUpdateSession: (field: string, value: string) => void;
  onUpdateExercise: (exIdx: number, field: string, value: string | number) => void;
  onAddExercise: () => void;
  onRemoveExercise: (exIdx: number) => void;
  onMoveExercise: (exIdx: number, dir: "up" | "down") => void;
  onMoveSession: (dir: "up" | "down") => void;
  onRemoveSession: () => void;
}) {
  const [expandedSet, setExpandedSet] = useState<Set<string>>(new Set());
  const [confirmRemove, setConfirmRemove] = useState(false);

  const warmup = session.warmup ?? warmupFallback;
  const allExpanded = session.exercises.length > 0 && session.exercises.every((ex) => expandedSet.has(ex.id));

  function toggleExercise(id: string) {
    setExpandedSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allExpanded) {
      setExpandedSet(new Set());
    } else {
      setExpandedSet(new Set(session.exercises.map((ex) => ex.id)));
    }
  }

  return (
    <>
      <Card className="p-4">
        {/* Session header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex flex-col gap-0.5 shrink-0">
            <button
              disabled={sessionIdx === 0}
              onClick={() => onMoveSession("up")}
              className="text-on-surface-variant hover:text-primary transition-colors disabled:opacity-20"
            >
              <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
            </button>
            <button
              disabled={sessionIdx === totalSessions - 1}
              onClick={() => onMoveSession("down")}
              className="text-on-surface-variant hover:text-primary transition-colors disabled:opacity-20"
            >
              <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
            </button>
          </div>

          <Input
            value={session.name}
            onChange={(e) => onUpdateSession("name", e.target.value)}
            className="font-semibold text-on-surface flex-1"
            placeholder="Ex: Segunda-Feira — Peito + Ombro"
          />

          {session.exercises.length > 0 && (
            <button
              onClick={toggleAll}
              className="text-xs text-primary hover:text-primary/70 transition-colors shrink-0 whitespace-nowrap"
            >
              {allExpanded ? "Recolher todos" : "Expandir todos"}
            </button>
          )}

          <button
            onClick={() => setConfirmRemove(true)}
            className="text-on-surface-variant hover:text-error transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
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

        {/* Exercises */}
        <div className="space-y-1.5">
          {session.exercises.length === 0 && (
            <p className="text-xs text-on-surface-variant text-center py-4">
              Nenhum exercício ainda. Clique em &quot;+ Exercício&quot; para começar.
            </p>
          )}
          {session.exercises.map((ex, ei) => (
            <ExerciseRow
              key={ex.id}
              ex={ex}
              idx={ei}
              total={session.exercises.length}
              expanded={expandedSet.has(ex.id)}
              muscleGroupFallback={muscleGroupByExercise[ex.name] ?? null}
              onToggle={() => toggleExercise(ex.id)}
              onChange={(field, value) => onUpdateExercise(ei, field, value)}
              onMove={(dir) => onMoveExercise(ei, dir)}
              onRemove={() => onRemoveExercise(ei)}
            />
          ))}
        </div>

        {/* Add exercise */}
        <Button
          variant="ghost"
          size="sm"
          className="mt-3 w-full text-on-surface-variant border border-dashed border-outline-variant hover:border-primary hover:text-primary"
          onClick={onAddExercise}
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Adicionar exercício
        </Button>
      </Card>

      {/* Confirm remove session */}
      <Modal
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title="Remover sessão?"
      >
        <p className="text-on-surface-variant mb-6">
          {session.exercises.length > 0
            ? `Esta sessão tem ${session.exercises.length} exercício(s). Ao remover, todos serão perdidos.`
            : "Tem certeza que quer remover esta sessão?"}
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setConfirmRemove(false)}>Cancelar</Button>
          <Button onClick={() => { setConfirmRemove(false); onRemoveSession(); }}>
            <span className="material-symbols-outlined text-[18px]">delete</span>
            Remover
          </Button>
        </div>
      </Modal>
    </>
  );
}

// ─── Main WorkoutEditor ───────────────────────────────────────────────────────
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

  const { generalNotes, warmupBySession, muscleGroupByExercise } = parseContentExtras(workout.content);

  // ── Session mutations ───────────────────────────────────────────────────────
  function updateSession(si: number, field: string, value: string) {
    setWorkout((w) => ({
      ...w,
      sessions: w.sessions.map((s, i) => i === si ? { ...s, [field]: value } : s),
    }));
  }

  function addSession() {
    setWorkout((w) => ({
      ...w,
      sessions: [...w.sessions, newSession(w.sessions.length + 1)],
    }));
  }

  function removeSession(si: number) {
    setWorkout((w) => ({
      ...w,
      sessions: w.sessions.filter((_, i) => i !== si).map((s, i) => ({ ...s, order: i + 1 })),
    }));
  }

  function moveSession(si: number, dir: "up" | "down") {
    setWorkout((w) => {
      const arr = [...w.sessions];
      const target = dir === "up" ? si - 1 : si + 1;
      if (target < 0 || target >= arr.length) return w;
      [arr[si], arr[target]] = [arr[target], arr[si]];
      return { ...w, sessions: arr.map((s, i) => ({ ...s, order: i + 1 })) };
    });
  }

  // ── Exercise mutations ──────────────────────────────────────────────────────
  function updateExercise(si: number, ei: number, field: string, value: string | number) {
    setWorkout((w) => ({
      ...w,
      sessions: w.sessions.map((s, i) =>
        i !== si ? s : {
          ...s,
          exercises: s.exercises.map((ex, j) => j === ei ? { ...ex, [field]: value } : ex),
        }
      ),
    }));
  }

  function addExercise(si: number) {
    setWorkout((w) => ({
      ...w,
      sessions: w.sessions.map((s, i) =>
        i !== si ? s : {
          ...s,
          exercises: [...s.exercises, newExercise(s.exercises.length + 1)],
        }
      ),
    }));
  }

  function removeExercise(si: number, ei: number) {
    setWorkout((w) => ({
      ...w,
      sessions: w.sessions.map((s, i) =>
        i !== si ? s : {
          ...s,
          exercises: s.exercises.filter((_, j) => j !== ei).map((ex, j) => ({ ...ex, order: j + 1 })),
        }
      ),
    }));
  }

  function moveExercise(si: number, ei: number, dir: "up" | "down") {
    setWorkout((w) => {
      const sessions = w.sessions.map((s, i) => {
        if (i !== si) return s;
        const arr = [...s.exercises];
        const target = dir === "up" ? ei - 1 : ei + 1;
        if (target < 0 || target >= arr.length) return s;
        [arr[ei], arr[target]] = [arr[target], arr[ei]];
        return { ...s, exercises: arr.map((ex, j) => ({ ...ex, order: j + 1 })) };
      });
      return { ...w, sessions };
    });
  }

  // ── Persistence ─────────────────────────────────────────────────────────────
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

  // ── Export ───────────────────────────────────────────────────────────────────
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

  const totalExercises = workout.sessions.reduce((acc, s) => acc + s.exercises.length, 0);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Header ── */}
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
            <Badge variant="success" className="text-xs whitespace-nowrap hidden sm:flex">
              <span className="material-symbols-outlined text-[14px] mr-1">verified</span>
              IA Especialista ✓
            </Badge>
          )}
          <Badge
            variant={
              workout.status === "aprovado" ? "success"
              : workout.status === "enviado_mfit" ? "secondary"
              : "outline"
            }
          >
            {workout.status === "rascunho" ? "Rascunho"
              : workout.status === "aprovado" ? "Aprovado"
              : "No MFIT"}
          </Badge>
        </div>
      </div>

      {/* ── AI Notes ── */}
      {generalNotes && (
        <Card className="mb-6 bg-primary/5 border-primary/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary text-[22px] shrink-0 mt-0.5">psychology</span>
              <div>
                <p className="text-label-sm font-semibold text-primary mb-1">Orientações do Personal IA</p>
                <p className="text-sm text-on-surface leading-relaxed">{generalNotes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* ── Left: Student info ── */}
        <div className="col-span-12 lg:col-span-3">
          <Card>
            <CardHeader><CardTitle>Aluno</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {workout.student ? (
                <>
                  <div>
                    <p className="text-base font-semibold text-on-surface">{workout.student.name}</p>
                    <p className="text-xs text-on-surface-variant">{levelLabel(workout.student.level)}</p>
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
                      <p className="text-xs text-on-surface-variant mb-1.5">Fotos de avaliação</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {workout.student.photos.slice(0, 4).map((p) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={p.id} src={p.url} alt={p.angle ?? "foto"} className="rounded-lg aspect-[3/4] object-cover w-full" />
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

        {/* ── Center: Editor ── */}
        <div className="col-span-12 lg:col-span-6">
          {/* Action bar */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRegenerateConfirm(true)}
              disabled={regenerating}
            >
              {regenerating ? (
                <><span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>Consultando IA…</>
              ) : (
                <><span className="material-symbols-outlined text-[18px]">auto_fix_high</span>Gerar com IA</>
              )}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleSave()} disabled={saving}>
              {saving
                ? <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                : <span className="material-symbols-outlined text-[18px]">save</span>}
              Salvar
            </Button>
            {workout.status !== "aprovado" && (
              <Button size="sm" onClick={() => handleSave("aprovado")} disabled={saving}>
                <span className="material-symbols-outlined text-[18px]">check</span>
                Aprovar
              </Button>
            )}
            <div className="ml-auto text-xs text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">fitness_center</span>
              {workout.sessions.length} sessão(ões) · {totalExercises} exercício(s)
            </div>
          </div>

          {/* Regeneration banner */}
          {regenerating && (
            <div className="mb-4 rounded-xl bg-primary/10 border border-primary/30 px-4 py-3 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-[20px] animate-spin">refresh</span>
              <p className="text-sm text-on-surface">Consultando Personal IA… isso pode levar alguns segundos</p>
            </div>
          )}

          {/* Error banner */}
          {regenerateError && !regenerating && (
            <div className="mb-4 rounded-xl bg-error/10 border border-error/30 px-4 py-3 flex items-start gap-3">
              <span className="material-symbols-outlined text-error text-[20px] shrink-0 mt-0.5">error</span>
              <p className="text-sm text-error">{regenerateError}</p>
            </div>
          )}

          {/* Sessions */}
          <div className="space-y-4">
            {workout.sessions.map((session, si) => (
              <SessionCard
                key={session.id}
                session={session}
                sessionIdx={si}
                totalSessions={workout.sessions.length}
                warmupFallback={warmupBySession[session.name] ?? null}
                muscleGroupByExercise={muscleGroupByExercise}
                onUpdateSession={(field, value) => updateSession(si, field, value)}
                onUpdateExercise={(ei, field, value) => updateExercise(si, ei, field, value)}
                onAddExercise={() => addExercise(si)}
                onRemoveExercise={(ei) => removeExercise(si, ei)}
                onMoveExercise={(ei, dir) => moveExercise(si, ei, dir)}
                onMoveSession={(dir) => moveSession(si, dir)}
                onRemoveSession={() => removeSession(si)}
              />
            ))}
          </div>

          {/* Add session */}
          <Button
            variant="ghost"
            size="sm"
            className="mt-4 w-full border border-dashed border-outline-variant hover:border-primary hover:text-primary text-on-surface-variant"
            onClick={addSession}
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nova sessão
          </Button>
        </div>

        {/* ── Right: MFIT Export ── */}
        <div className="col-span-12 lg:col-span-3">
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
        title="Gerar treino com IA?"
      >
        <p className="text-on-surface-variant mb-6">
          Isso vai substituir todas as sessões e exercícios do treino atual pelo que a IA
          Especialista gerar. O título também será atualizado.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setShowRegenerateConfirm(false)}>Cancelar</Button>
          <Button onClick={doRegenerate}>
            <span className="material-symbols-outlined text-[18px]">auto_fix_high</span>
            Gerar mesmo assim
          </Button>
        </div>
      </Modal>
    </div>
  );
}
