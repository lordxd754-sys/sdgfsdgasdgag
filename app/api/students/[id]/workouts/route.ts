import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await Promise.resolve(params);
  const workouts = await prisma.workout.findMany({
    where: { studentId: id },
    orderBy: { createdAt: "desc" },
    include: {
      sessions: {
        orderBy: { order: "asc" },
        include: { exercises: { orderBy: { order: "asc" } } },
      },
    },
  });

  return NextResponse.json(workouts);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await Promise.resolve(params);
  const body = await req.json();

  const student = await prisma.student.findUnique({
    where: { id },
    include: { photos: { take: 4 } },
  });
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  const settings = await prisma.settings.findFirst();

  if (body.generate) {
    // AI generation
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

    let workoutData: any;
    try {
      const msg = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      });

      const text = msg.content[0].type === "text" ? msg.content[0].text : "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      workoutData = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (e) {
      console.error("AI generation error:", e);
      return NextResponse.json({ error: "Erro ao gerar treino com IA" }, { status: 500 });
    }

    if (!workoutData) {
      return NextResponse.json({ error: "Resposta inválida da IA" }, { status: 500 });
    }

    const workout = await prisma.workout.create({
      data: {
        studentId: id,
        title: workoutData.title,
        content: JSON.stringify(workoutData),
        status: "rascunho",
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
        sessions: { include: { exercises: true }, orderBy: { order: "asc" } },
      },
    });

    return NextResponse.json(workout, { status: 201 });
  }

  // Manual creation
  const workout = await prisma.workout.create({
    data: {
      studentId: id,
      title: body.title ?? "Novo treino",
      content: "{}",
      status: "rascunho",
    },
  });

  return NextResponse.json(workout, { status: 201 });
}
