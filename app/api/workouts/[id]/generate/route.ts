import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { aiComplete } from "@/lib/ai";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await Promise.resolve(params);

  const { data: workoutRaw } = await supabase
    .from("Workout")
    .select("*, Student(*)")
    .eq("id", id)
    .single();

  if (!workoutRaw) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: settings } = await supabase.from("Settings").select("*").limit(1).maybeSingle();

  const student = (workoutRaw as any).Student;
  const prompt = `Você é um personal trainer especializado com 10 anos de experiência em consultoria online.
Analise os dados abaixo e gere um plano de treino completo e detalhado.

DADOS DO ALUNO:
Nome: ${student.name}
Objetivo: ${student.goal ?? "Não especificado"}
Nível: ${student.level}
Disponibilidade: ${student.daysPerWeek} dias/semana, ${student.sessionDuration} min por sessão
Restrições: ${student.restrictions ?? "Nenhuma"}
Equipamentos disponíveis: ${student.equipment ?? "Não especificado"}
Observações: ${student.notes ?? "Nenhuma"}

PROTOCOLO DO PERSONAL:
${(settings as any)?.workoutPreferences ?? "Seguir boas práticas gerais de treinamento."}

Gere um plano de treino retornando APENAS um JSON válido com esta estrutura:
{
  "title": "Nome do treino",
  "sessions": [
    {
      "name": "Treino A - Nome dos músculos",
      "order": 1,
      "exercises": [
        {
          "name": "Nome do exercício",
          "sets": 4,
          "reps": "8-12",
          "rest": 90,
          "notes": "Observação técnica",
          "order": 1
        }
      ]
    }
  ]
}`;

  try {
    const text = await aiComplete(prompt, 4096);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const workoutData = JSON.parse(jsonMatch[0]);

    // Delete existing sessions (exercises are cascade deleted)
    await supabase.from("WorkoutSession").delete().eq("workoutId", id);

    // Update the workout title and content
    const { data: updatedWorkout } = await supabase
      .from("Workout")
      .update({
        title: workoutData.title,
        content: JSON.stringify(workoutData),
      })
      .eq("id", id)
      .select()
      .single();

    // Insert sessions and exercises sequentially
    const sessions: any[] = [];
    for (const s of workoutData.sessions) {
      const { data: ws } = await supabase
        .from("WorkoutSession")
        .insert({ id: crypto.randomUUID(), workoutId: id, name: s.name, order: s.order })
        .select()
        .single();

      if (ws) {
        const exercises: any[] = [];
        for (const ex of s.exercises) {
          const { data: exercise } = await supabase
            .from("Exercise")
            .insert({
              id: crypto.randomUUID(),
              sessionId: (ws as any).id,
              name: ex.name,
              sets: ex.sets,
              reps: String(ex.reps),
              rest: ex.rest ?? 60,
              notes: ex.notes || null,
              order: ex.order,
            })
            .select()
            .single();
          if (exercise) exercises.push(exercise);
        }
        sessions.push({ ...(ws as any), exercises });
      }
    }

    return NextResponse.json({ ...(updatedWorkout as any), sessions });
  } catch (e) {
    console.error("Generate error:", e);
    return NextResponse.json({ error: "Erro ao gerar treino" }, { status: 500 });
  }
}
