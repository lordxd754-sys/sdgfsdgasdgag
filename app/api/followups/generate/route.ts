import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { aiComplete } from "@/lib/ai";
import { daysSince } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studentId } = await req.json();

  const [studentResult, settingsResult] = await Promise.all([
    supabase
      .from("Student")
      .select("*, Workout(*), FollowUp(*)")
      .eq("id", studentId)
      .single(),
    supabase.from("Settings").select("*").limit(1).maybeSingle(),
  ]);

  if (!studentResult.data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const raw = studentResult.data as any;
  const student = {
    ...raw,
    workouts: raw.Workout
      ? [...raw.Workout].sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ).slice(0, 1)
      : [],
    followUps: raw.FollowUp
      ? [...raw.FollowUp].sort(
          (a: any, b: any) =>
            new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
        ).slice(0, 3)
      : [],
  };

  const settings = settingsResult.data;

  const template =
    settings?.followUpTemplate ??
    "Olá {nome}! Tudo bem? Passando para ver como está indo o {treino_atual}. Qualquer dúvida pode me chamar!";

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
    const message = await aiComplete(prompt, 500);
    return NextResponse.json({ message });
  } catch (e) {
    console.error("Generate follow-up error:", e);
    return NextResponse.json({ error: "Erro ao gerar mensagem" }, { status: 500 });
  }
}
