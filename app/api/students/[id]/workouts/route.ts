import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { aiComplete, extractJson } from "@/lib/ai";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await Promise.resolve(params);
  const { data: workoutsRaw } = await supabase
    .from("Workout")
    .select("*, WorkoutSession(*, Exercise(*))")
    .eq("studentId", id)
    .order("createdAt", { ascending: false });

  const workouts = (workoutsRaw ?? []).map((w: any) => ({
    ...w,
    sessions: w.WorkoutSession
      ? [...w.WorkoutSession]
          .sort((a: any, b: any) => a.order - b.order)
          .map((s: any) => ({
            ...s,
            exercises: s.Exercise
              ? [...s.Exercise].sort((a: any, b: any) => a.order - b.order)
              : [],
          }))
      : [],
  }));

  return NextResponse.json(workouts);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await Promise.resolve(params);

  try {
    const body = await req.json();

    const { data: studentRaw } = await supabase
      .from("Student")
      .select("*, Photo(*)")
      .eq("id", id)
      .single();

    if (!studentRaw) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const student = {
      ...(studentRaw as any),
      photos: (studentRaw as any).Photo ? [...(studentRaw as any).Photo].slice(0, 4) : [],
    };

    const { data: settings } = await supabase.from("Settings").select("*").limit(1).maybeSingle();

    if (body.generate) {
      if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json(
          { error: "GEMINI_API_KEY não configurada nas variáveis de ambiente." },
          { status: 500 }
        );
      }

      const prompt = `Crie um plano de treino completo e individualizado para o seguinte aluno:

DADOS DO ALUNO:
Nome: ${student.name}
Objetivo: ${student.goal ?? "Não especificado"}
Nível: ${student.level}
Disponibilidade: ${student.daysPerWeek} dias/semana, ${student.sessionDuration} min por sessão
Restrições médicas/lesões: ${student.restrictions ?? "Nenhuma"}
Equipamentos disponíveis: ${student.equipment ?? "Academia completa"}
Observações: ${student.notes ?? "Nenhuma"}

PROTOCOLO DO PERSONAL:
${(settings as any)?.workoutPreferences ?? "Seguir boas práticas gerais de treinamento."}

Gere um plano de treino retornando APENAS um JSON válido com esta estrutura (sem texto antes ou depois, sem markdown):
{
  "title": "Nome descritivo do treino",
  "generalNotes": "Orientações gerais importantes para o aluno",
  "sessions": [
    {
      "name": "Treino A - Grupos musculares",
      "order": 1,
      "warmup": "Aquecimento específico desta sessão",
      "exercises": [
        {
          "name": "Nome do exercício",
          "sets": 4,
          "reps": "8-12",
          "rest": 90,
          "notes": "Observação técnica de execução",
          "order": 1,
          "muscleGroup": "Músculo primário trabalhado"
        }
      ]
    }
  ]
}`;

      let workoutData: any;
      try {
        const text = await aiComplete(prompt, 4096);
        const cleanJson = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        try {
          workoutData = JSON.parse(cleanJson);
        } catch {
          const jsonStr = extractJson(text);
          if (!jsonStr) throw new Error("A IA retornou um formato inválido. Tente novamente.");
          workoutData = JSON.parse(jsonStr);
        }
      } catch (e: any) {
        console.error("[Gerar Treino - Perfil] Erro IA:", e);
        return NextResponse.json(
          { error: e.message || "Erro ao gerar treino com IA" },
          { status: 500 }
        );
      }

      if (!workoutData?.sessions) {
        return NextResponse.json({ error: "Resposta inválida da IA — sem sessões" }, { status: 500 });
      }

      const { data: workout } = await supabase
        .from("Workout")
        .insert({
          id: crypto.randomUUID(),
          studentId: id,
          title: workoutData.title,
          content: JSON.stringify(workoutData),
          status: "rascunho",
        })
        .select()
        .single();

      if (!workout) return NextResponse.json({ error: "Erro ao criar treino no banco" }, { status: 500 });

      const sessions: any[] = [];
      for (const s of workoutData.sessions) {
        const { data: ws } = await supabase
          .from("WorkoutSession")
          .insert({
            id: crypto.randomUUID(),
            workoutId: (workout as any).id,
            name: s.name,
            order: s.order,
          })
          .select()
          .single();

        if (ws) {
          const exercises: any[] = [];
          for (const ex of s.exercises ?? []) {
            const { data: exercise } = await supabase
              .from("Exercise")
              .insert({
                id: crypto.randomUUID(),
                sessionId: (ws as any).id,
                name: ex.name,
                sets: parseInt(String(ex.sets)) || 3,
                reps: String(ex.reps),
                rest: parseInt(String(ex.rest)) || 60,
                notes: ex.notes || null,
                order: ex.order,
                videoUrl: ex.videoUrl || null,
              })
              .select()
              .single();
            if (exercise) exercises.push(exercise);
          }
          sessions.push({ ...(ws as any), exercises });
        }
      }

      return NextResponse.json({ ...(workout as any), sessions }, { status: 201 });
    }

    // Manual creation (no generate flag)
    const { data: workout } = await supabase
      .from("Workout")
      .insert({
        id: crypto.randomUUID(),
        studentId: id,
        title: body.title ?? "Novo treino",
        content: "{}",
        status: "rascunho",
      })
      .select()
      .single();

    return NextResponse.json(workout, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/students/workouts] Erro:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno ao processar treino" },
      { status: 500 }
    );
  }
}
