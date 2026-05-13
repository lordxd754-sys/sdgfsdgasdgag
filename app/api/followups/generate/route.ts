import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import { daysSince } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studentId } = await req.json();

  const [student, settings] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      include: {
        workouts: { orderBy: { createdAt: "desc" }, take: 1 },
        followUps: { orderBy: { sentAt: "desc" }, take: 3 },
      },
    }),
    prisma.settings.findFirst(),
  ]);

  if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const template =
    settings?.followUpTemplate ??
    "Olá {nome}! Tudo bem? Passando para ver como está indo o {treino_atual}. Qualquer dúvida pode me chamar!";

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const lastWorkout = student.workouts[0]?.title ?? "treino atual";
  const dias = daysSince(student.lastContactAt ?? student.createdAt);

  const prompt = `Você é assistente de um personal trainer.
Escreva uma mensagem de acompanhamento personalizada para o aluno abaixo.
A mensagem deve ser natural, motivadora, e parecer escrita pelo personal.
Máximo de 3 parágrafos. Sem formalidade excessiva.

ALUNO: ${student.name}
OBJETIVO: ${student.goal ?? "Não especificado"}
TREINO ATUAL: ${lastWorkout}
DIAS DESDE O ÚLTIMO CONTATO: ${dias === Infinity ? "nunca contatado" : `${dias} dias`}

Template base do personal:
${template}

Retorne APENAS o texto da mensagem, sem aspas ou formatação extra.`;

  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const message = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    return NextResponse.json({ message });
  } catch (e) {
    console.error("Generate follow-up error:", e);
    return NextResponse.json({ error: "Erro ao gerar mensagem" }, { status: 500 });
  }
}
