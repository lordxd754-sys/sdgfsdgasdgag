"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: string;
  rest: number;
  notes: string | null;
  order: number;
  videoUrl: string | null;
};

type SessionShape = {
  id: string;
  name: string;
  workoutId: string;
  exercises: Exercise[];
};

type LastExecution = {
  id: string;
  SetLog?: Array<{
    exerciseId: string;
    setNumber: number;
    reps: number;
    weight: number;
  }>;
} | null;

type SetEntry = { reps: string; weight: string; completed: boolean };
type AllSets = Record<string, SetEntry[]>;

interface Props {
  session: SessionShape;
  lastExecution: LastExecution;
  studentId: string;
  workoutId: string;
}

function isYoutube(url: string) {
  return url.includes("youtube.com") || url.includes("youtu.be");
}
function youtubeVideoId(url: string) {
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([^&?\s]+)/);
  return match?.[1] ?? "";
}
function youtubeEmbedUrl(url: string) {
  return `https://www.youtube.com/embed/${youtubeVideoId(url)}`;
}
function youtubeThumbnail(url: string) {
  return `https://img.youtube.com/vi/${youtubeVideoId(url)}/hqdefault.jpg`;
}

function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function initSets(ex: Exercise): SetEntry[] {
  const count = Math.max(1, Math.floor(ex.sets || 1));
  return Array.from({ length: count }, () => ({
    reps: String(ex.reps ?? ""),
    weight: "",
    completed: false,
  }));
}

export function WorkoutExecution({
  session,
  lastExecution,
  studentId,
  workoutId,
}: Props) {
  const router = useRouter();
  const exercises = session.exercises;
  const exerciseCount = exercises.length;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [allSets, setAllSets] = useState<AllSets>(() => {
    const initial: AllSets = {};
    for (const ex of exercises) initial[ex.id] = initSets(ex);
    return initial;
  });
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [initialRest, setInitialRest] = useState<number>(0);
  const [isResting, setIsResting] = useState(false);
  const [workoutSeconds, setWorkoutSeconds] = useState(0);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [videoModal, setVideoModal] = useState<string | null>(null);

  const beepPlayedRef = useRef(false);
  const executionRequestedRef = useRef(false);

  // Reference cargas map from last execution
  const refByExerciseSet = useMemo(() => {
    const map = new Map<string, { weight: number; reps: number }>();
    const sets = lastExecution?.SetLog ?? [];
    for (const s of sets) {
      const key = `${s.exerciseId}:${s.setNumber}`;
      map.set(key, { weight: s.weight, reps: s.reps });
    }
    return map;
  }, [lastExecution]);

  // Create execution record once on mount
  useEffect(() => {
    if (executionRequestedRef.current) return;
    executionRequestedRef.current = true;
    if (exerciseCount === 0) return;
    fetch("/api/executions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        workoutId: session.workoutId || workoutId,
        sessionId: session.id,
      }),
    })
      .then(async (r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (data?.id) setExecutionId(data.id);
      })
      .catch(() => {
        // best-effort
      });
  }, [exerciseCount, session.id, session.workoutId, studentId, workoutId]);

  // Workout timer
  useEffect(() => {
    if (finished) return;
    const interval = setInterval(() => {
      setWorkoutSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [finished]);

  // Rest timer countdown
  useEffect(() => {
    if (!isResting || restTimer === null) return;
    if (restTimer <= 0) return;
    const id = setInterval(() => {
      setRestTimer((t) => (t === null ? null : t - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [isResting, restTimer]);

  // When restTimer hits 0, play beep + reset
  useEffect(() => {
    if (restTimer === 0 && isResting && !beepPlayedRef.current) {
      beepPlayedRef.current = true;
      try {
        const AudioCtx =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 800;
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.5);
        }
      } catch {
        // best-effort beep
      }
      // Auto-clear after small delay
      const t = setTimeout(() => {
        setIsResting(false);
        setRestTimer(null);
        beepPlayedRef.current = false;
      }, 600);
      return () => clearTimeout(t);
    }
  }, [restTimer, isResting]);

  const currentExercise: Exercise | undefined = exercises[currentIdx];
  const isLastExercise = currentIdx === exerciseCount - 1;
  const currentSets = currentExercise ? allSets[currentExercise.id] ?? [] : [];

  const updateSet = useCallback(
    (exId: string, setIdx: number, field: "reps" | "weight", value: string) => {
      setAllSets((prev) => {
        const arr = prev[exId] ? [...prev[exId]] : [];
        const item = { ...(arr[setIdx] ?? { reps: "", weight: "", completed: false }) };
        item[field] = value;
        arr[setIdx] = item;
        return { ...prev, [exId]: arr };
      });
    },
    []
  );

  const completeSet = useCallback(
    (exId: string, setIdx: number, restSeconds: number) => {
      setAllSets((prev) => {
        const arr = prev[exId] ? [...prev[exId]] : [];
        const item = { ...(arr[setIdx] ?? { reps: "", weight: "", completed: false }) };
        item.completed = !item.completed;
        arr[setIdx] = item;
        return { ...prev, [exId]: arr };
      });
      if (restSeconds > 0) {
        beepPlayedRef.current = false;
        setInitialRest(restSeconds);
        setRestTimer(restSeconds);
        setIsResting(true);
      }
    },
    []
  );

  const skipRest = useCallback(() => {
    setIsResting(false);
    setRestTimer(null);
    beepPlayedRef.current = false;
  }, []);

  const goNext = useCallback(() => {
    if (isLastExercise) {
      setFinished(true);
      return;
    }
    setCurrentIdx((i) => Math.min(exerciseCount - 1, i + 1));
  }, [isLastExercise, exerciseCount]);

  const goPrev = useCallback(() => {
    setCurrentIdx((i) => Math.max(0, i - 1));
  }, []);

  const totals = useMemo(() => {
    let totalSets = 0;
    let totalWeight = 0;
    for (const ex of exercises) {
      const sets = allSets[ex.id] ?? [];
      for (const s of sets) {
        if (s.completed) {
          totalSets++;
          const w = Number(s.weight);
          const r = Number(s.reps);
          if (Number.isFinite(w) && Number.isFinite(r)) {
            totalWeight += w * r;
          }
        }
      }
    }
    return { totalSets, totalWeight };
  }, [allSets, exercises]);

  const saveWorkout = useCallback(async () => {
    if (!executionId) {
      setSaveError("Execução não foi criada. Tente novamente em alguns segundos.");
      return;
    }
    setSaving(true);
    setSaveError(null);

    const sets: Array<{
      exerciseId: string;
      setNumber: number;
      reps: number;
      weight: number;
    }> = [];

    for (const ex of exercises) {
      const arr = allSets[ex.id] ?? [];
      arr.forEach((s, idx) => {
        if (s.completed) {
          const reps = parseInt(s.reps, 10);
          const weight = parseFloat(s.weight);
          sets.push({
            exerciseId: ex.id,
            setNumber: idx + 1,
            reps: Number.isFinite(reps) ? reps : 0,
            weight: Number.isFinite(weight) ? weight : 0,
          });
        }
      });
    }

    try {
      const res = await fetch(`/api/executions/${executionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sets,
          finishedAt: new Date().toISOString(),
          duration: workoutSeconds,
        }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP ${res.status}`);
      }
      // Success → navigate back to workout
      router.push(`/treino/${workoutId}?studentId=${studentId}`);
      router.refresh();
    } catch (err: any) {
      setSaveError(err?.message ?? "Erro ao salvar o treino.");
      setSaving(false);
    }
  }, [
    allSets,
    executionId,
    exercises,
    router,
    studentId,
    workoutId,
    workoutSeconds,
  ]);

  // Empty state
  if (exerciseCount === 0) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <span className="material-symbols-outlined text-on-surface-variant text-[48px]">
            list
          </span>
          <p className="mt-3 text-body-md text-on-surface">
            Esta sessão não possui exercícios.
          </p>
          <Button
            onClick={() => router.push(`/treino/${workoutId}?studentId=${studentId}`)}
            className="mt-6"
          >
            Voltar
          </Button>
        </div>
      </main>
    );
  }

  const progressPct = Math.round(((currentIdx + 1) / exerciseCount) * 100);
  const dashArray = 2 * Math.PI * 80;
  const dashOffset =
    initialRest > 0 && restTimer !== null
      ? dashArray * (1 - restTimer / initialRest)
      : 0;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-on-surface flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-outline-variant/20">
        <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
          <button
            onClick={() => setShowExitConfirm(true)}
            className="w-10 h-10 rounded-full hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant"
            aria-label="Sair do treino"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          <p className="text-label-md text-on-surface-variant">
            Exercício {currentIdx + 1} de {exerciseCount}
          </p>
          <div className="font-mono text-body-md text-on-surface tabular-nums">
            {formatTime(workoutSeconds)}
          </div>
        </div>
        <div className="h-1 bg-surface-container/50">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 max-w-lg w-full mx-auto px-4 pb-32 pt-6">
        {currentExercise && (
          <>
            <h1 className="text-headline-lg font-bold text-on-surface text-center">
              {currentExercise.name}
            </h1>

            {currentExercise.videoUrl && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => setVideoModal(currentExercise.videoUrl)}
                  className="relative w-full max-w-md aspect-video rounded-2xl overflow-hidden group bg-surface-container-high border border-outline-variant"
                >
                  {isYoutube(currentExercise.videoUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={youtubeThumbnail(currentExercise.videoUrl)}
                      alt={currentExercise.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-surface-container-highest" />
                  )}
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-primary/90 text-on-primary flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-[32px]">
                        play_arrow
                      </span>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* Sets × Reps highlight */}
            <div className="my-6 py-5 px-6 rounded-2xl bg-surface-container border border-outline-variant text-center">
              <p className="text-4xl font-bold text-primary">
                {currentExercise.sets} × {currentExercise.reps}
              </p>
              <p className="text-label-md text-on-surface-variant mt-1">
                séries × repetições
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-label-md text-on-surface-variant mb-4">
              <span className="material-symbols-outlined text-[18px]">timer</span>
              Descanso: {currentExercise.rest}s
            </div>

            {currentExercise.notes && (
              <div className="mb-4 rounded-xl bg-surface-container-lowest border border-outline-variant/50 p-3 text-label-md text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px] align-middle mr-1">
                  info
                </span>
                {currentExercise.notes}
              </div>
            )}

            {/* Sets table */}
            <div className="mt-2 rounded-2xl bg-surface-container border border-outline-variant overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-4 py-2 text-label-sm text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/40">
                <div className="col-span-2">Série</div>
                <div className="col-span-4">Reps</div>
                <div className="col-span-4">Carga (kg)</div>
                <div className="col-span-2 text-right">Feito</div>
              </div>

              <div className="divide-y divide-outline-variant/30">
                {currentSets.map((s, idx) => {
                  const ref = refByExerciseSet.get(`${currentExercise.id}:${idx + 1}`);
                  const firstUncompleted = currentSets.findIndex((x) => !x.completed);
                  const isCurrent = !s.completed && idx === firstUncompleted;
                  return (
                    <div
                      key={idx}
                      className={`grid grid-cols-12 gap-2 items-center px-3 py-2.5 transition-colors ${
                        s.completed
                          ? "bg-primary/10 border-l-2 border-primary"
                          : isCurrent
                            ? "bg-surface-container-high"
                            : ""
                      }`}
                    >
                      <div className="col-span-2 text-body-md font-semibold text-on-surface">
                        {idx + 1}
                      </div>
                      <div className="col-span-4">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={s.reps}
                          disabled={s.completed}
                          onChange={(e) =>
                            updateSet(currentExercise.id, idx, "reps", e.target.value)
                          }
                          placeholder={ref ? `${ref.reps}` : currentExercise.reps}
                          className="w-full rounded-lg bg-surface-container-lowest border border-outline-variant px-2 py-1.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none disabled:opacity-70"
                        />
                      </div>
                      <div className="col-span-4">
                        <input
                          type="number"
                          step="0.5"
                          inputMode="decimal"
                          value={s.weight}
                          disabled={s.completed}
                          onChange={(e) =>
                            updateSet(currentExercise.id, idx, "weight", e.target.value)
                          }
                          placeholder={ref ? `Últ: ${ref.weight}` : "0"}
                          className="w-full rounded-lg bg-surface-container-lowest border border-outline-variant px-2 py-1.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none disabled:opacity-70"
                        />
                      </div>
                      <div className="col-span-2 flex justify-end">
                        <button
                          onClick={() =>
                            completeSet(currentExercise.id, idx, currentExercise.rest)
                          }
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                            s.completed
                              ? "bg-primary text-on-primary"
                              : "border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary"
                          }`}
                          aria-label={s.completed ? "Desmarcar série" : "Marcar série"}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            check
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 flex gap-3 p-4 bg-[#0a0a0a]/90 backdrop-blur-sm border-t border-outline-variant/30 z-20">
        <div className="max-w-lg w-full mx-auto flex gap-3">
          <Button
            variant="outline"
            onClick={goPrev}
            disabled={currentIdx === 0}
            className="flex-1"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Anterior
          </Button>
          <Button onClick={goNext} className="flex-1">
            {isLastExercise ? (
              <>
                <span className="material-symbols-outlined text-[18px]">flag</span>
                Finalizar
              </>
            ) : (
              <>
                Próximo
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Rest timer overlay */}
      {isResting && restTimer !== null && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
          <div className="text-center">
            <div className="relative w-[200px] h-[200px] mx-auto">
              <svg width="200" height="200" viewBox="0 0 200 200">
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  fill="none"
                  stroke="#1a1a1a"
                  strokeWidth="8"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  fill="none"
                  stroke="#4edea3"
                  strokeWidth="8"
                  strokeDasharray={dashArray}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  style={{
                    transform: "rotate(-90deg)",
                    transformOrigin: "center",
                    transition: "stroke-dashoffset 1s linear",
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-5xl font-bold text-on-surface tabular-nums">
                  {formatTime(restTimer)}
                </p>
                <p className="text-label-md text-on-surface-variant mt-1">Descanso</p>
              </div>
            </div>
            <Button onClick={skipRest} variant="outline" className="mt-8">
              Pular descanso
            </Button>
          </div>
        </div>
      )}

      {/* Completion modal */}
      <Modal
        open={finished}
        onClose={() => {
          /* keep open */
        }}
        title="Treino Concluído!"
      >
        <div className="text-center space-y-4">
          <p className="text-4xl font-bold text-primary tabular-nums">
            {formatTime(workoutSeconds)}
          </p>
          <p className="text-label-md text-on-surface-variant">Duração total</p>
          <div className="grid grid-cols-3 gap-4 mt-2">
            <div className="text-center">
              <p className="text-2xl font-bold text-on-surface">{exerciseCount}</p>
              <p className="text-label-sm text-on-surface-variant">Exercícios</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-on-surface">{totals.totalSets}</p>
              <p className="text-label-sm text-on-surface-variant">Séries</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-on-surface">
                {totals.totalWeight.toFixed(0)}kg
              </p>
              <p className="text-label-sm text-on-surface-variant">Carga total</p>
            </div>
          </div>
          {saveError && (
            <p className="text-label-md text-error mt-2">{saveError}</p>
          )}
          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setFinished(false)}
              disabled={saving}
              className="flex-1"
            >
              Voltar
            </Button>
            <Button
              onClick={saveWorkout}
              disabled={saving}
              className="flex-1"
            >
              {saving ? "Salvando..." : "Salvar treino"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Video modal */}
      <Modal
        open={!!videoModal}
        onClose={() => setVideoModal(null)}
        title="Vídeo do exercício"
        className="max-w-2xl"
      >
        {videoModal &&
          (isYoutube(videoModal) ? (
            <iframe
              src={youtubeEmbedUrl(videoModal)}
              title="Vídeo do exercício"
              className="w-full aspect-video rounded-xl"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={videoModal} controls className="w-full rounded-xl" />
          ))}
      </Modal>

      {/* Exit confirm */}
      <Modal
        open={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        title="Sair do treino?"
      >
        <p className="text-on-surface-variant mb-4">
          O progresso será perdido se sair sem salvar.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setShowExitConfirm(false)}>
            Continuar treino
          </Button>
          <Button
            variant="destructive"
            onClick={() => router.push(`/treino/${workoutId}?studentId=${studentId}`)}
          >
            Sair
          </Button>
        </div>
      </Modal>
    </main>
  );
}
