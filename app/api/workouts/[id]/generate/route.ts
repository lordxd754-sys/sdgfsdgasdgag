import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { aiComplete } from "@/lib/ai";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await Promise.resolve(params);

  const workout = await prisma.workout.findUnique({
    where: { id },
    include: { student: true },
  });
  if (!workout) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const settings = await prisma.settings.findFirst();

  const student = workout.student;
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
${settings?.workoutPreferences ?? "Seguir boas práticas gerais de treinamento."}

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

    await prisma.workoutSession.deleteMany({ where: { workoutId: id } });

    const updated = await prisma.workout.update({
      where: { id },
      data: {
        title: workoutData.title,
        content: JSON.stringify(workoutData),
        sessions: {
          create: workoutData.sessions.map((s: any) => ({
            name: s.name,
            order: s.order,
            exercises: {
              create: s.exercises.map((ex: any) => ({
                name: ex.name,
                sets: ex.sets,
                reps: String(ex.reps),
                rest: ex.rest ?? 60,
                notes: ex.notes || null,
                order: ex.order,
              })),
            },
          })),
        },
      },
      include: {
        sessions: {
          orderBy: { order: "asc" },
          include: { exercises: { orderBy: { order: "asc" } } },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("Generate error:", e);
    return NextResponse.json({ error: "Erro ao gerar treino" }, { status: 500 });
  }
}
