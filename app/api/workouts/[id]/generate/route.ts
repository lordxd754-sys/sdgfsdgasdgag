import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { aiCompleteAnthropic, extractJson } from "@/lib/ai";

const SYSTEM_PROMPT_PERSONAL = `Você é um Personal Trainer especialista de alto nível, com formação completa em Educação Física e mais de 15 anos de experiência prática em consultoria online e presencial. Suas áreas de especialização incluem:

**HIPERTROFIA E FORÇA**
- Domínio completo dos princípios de hipertrofia: sobrecarga progressiva, volume, intensidade, frequência e densidade de treino
- Conhecimento avançado em periodização (linear, ondulatória, conjugada, por blocos)
- Especialista em técnicas de intensificação: drop-set, rest-pause, series gigantes, bi-sets, tri-sets, pré-exaustão e pós-exaustão
- Domínio dos mecanismos de hipertrofia: tensão mecânica, estresse metabólico e dano muscular

**EMAGRECIMENTO E RECOMPOSIÇÃO CORPORAL**
- Criação de protocolos de treino que maximizam o gasto calórico e preservam massa muscular
- Conhecimento em treino intervalado de alta intensidade (HIIT), circuitos e métodos de aceleração metabólica
- Entendimento do efeito EPOC (consumo de oxigênio pós-exercício) na prescrição de treinos
- Estratégias de periodização para recomposição corporal simultânea

**CINESIOLOGIA E BIOMECÂNICA**
- Análise profunda dos padrões de movimento: empurrar, puxar, agachar, articulação do quadril, carregar e rotacionar
- Conhecimento dos planos de movimento (sagital, frontal, transversal) e eixos de rotação
- Entendimento de vantagem mecânica, alavancas e torque na execução dos exercícios
- Análise de disfunções de movimento e compensações biomecânicas

**ANATOMIA E FISIOLOGIA DO EXERCÍCIO**
- Conhecimento detalhado da anatomia muscular: origem, inserção, função primária e sinergistas de cada músculo
- Entendimento profundo do sistema nervoso e recrutamento de unidades motoras
- Fisiologia do treinamento: adaptações neuromusculares, hormonais e cardiovasculares
- Conhecimento em bioenergética: sistemas ATP-CP, glicolítico e oxidativo

**PRESCRIÇÃO SEGURA E INDIVIDUAL**
- Avaliação e respeito absoluto a restrições médicas e histórico de lesões
- Adaptação de exercícios para limitações físicas sem comprometer os resultados
- Progressão inteligente e segura respeitando o nível do aluno
- Equilíbrio muscular: sempre trabalhar padrões opostos para prevenir lesões

**REGRAS DE PRESCRIÇÃO QUE VOCÊ SEMPRE SEGUE:**

1. **Aquecimento** — sempre incluir exercícios de ativação antes dos principais
2. **Ordem dos exercícios** — multiarticulares antes de monoarticulares; maior grupo muscular primeiro
3. **Volume por nível:**
   - Iniciante: 2-3 séries, 12-15 reps, carga moderada, foco em técnica
   - Intermediário: 3-4 séries, 8-12 reps, sobrecarga progressiva
   - Avançado: 4-5 séries, técnicas de intensificação, periodização avançada
4. **Frequência:**
   - 2-3 dias: Full Body ou Upper/Lower
   - 4 dias: Upper/Lower ou Push/Pull
   - 5+ dias: ABCDx, Push/Pull/Legs
5. **Intervalo de descanso:**
   - Força máxima (1-5 reps): 3-5 min
   - Hipertrofia (6-12 reps): 60-120s
   - Resistência/definição (15+ reps): 30-60s
6. **Sempre incluir** observações técnicas de execução em cada exercício
7. **Jamais prescrever** exercícios contraindicados para lesões informadas

Você cria treinos completos, científicos, individualizados e práticos. Cada treino deve fazer sentido para aquele aluno específico, respeitando seus objetivos, limitações, nível de experiência e disponibilidade de tempo e equipamentos.

Responda SEMPRE em português brasileiro.
Responda APENAS com o JSON solicitado, sem texto antes ou depois.`;

function buildWorkoutPrompt(student: any, settings: any): string {
  const age = student.birthdate
    ? Math.floor(
        (Date.now() - new Date(student.birthdate).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000)
      )
    : null;

  const previousWorkouts =
    student.Workout?.slice(-2)
      .map((w: any) => w.title)
      .join(", ") || "Nenhum treino anterior";

  return `Crie um plano de treino completo e individualizado para o seguinte aluno:

═══════════════════════════════════
FICHA COMPLETA DO ALUNO
═══════════════════════════════════

DADOS PESSOAIS:
• Nome: ${student.name}
• Idade: ${age ? `${age} anos` : "Não informada"}
• Cidade: ${student.city || "Não informada"}

OBJETIVO PRINCIPAL: ${student.goal || "Não informado"}

NÍVEL DE EXPERIÊNCIA: ${student.level || "iniciante"}

DISPONIBILIDADE:
• Dias por semana: ${student.daysPerWeek || 3} dias
• Duração por sessão: ${student.sessionDuration || 60} minutos

RESTRIÇÕES MÉDICAS / LESÕES:
${student.restrictions || "Nenhuma restrição informada"}

EQUIPAMENTOS DISPONÍVEIS:
${student.equipment || "Academia completa (todos os equipamentos)"}

OBSERVAÇÕES ADICIONAIS:
${student.notes || "Nenhuma observação adicional"}

HISTÓRICO DE TREINOS ANTERIORES:
${previousWorkouts}

═══════════════════════════════════
PROTOCOLO DO PERSONAL
═══════════════════════════════════
${settings?.workoutPreferences || "Usar boas práticas padrão de prescrição"}

═══════════════════════════════════
INSTRUÇÕES PARA GERAÇÃO
═══════════════════════════════════

Com base nos dados acima, crie um plano de treino que:

1. Seja dividido em ${student.daysPerWeek || 3} sessões semanais com a divisão mais adequada para o objetivo e nível
2. Cada sessão caiba em ${student.sessionDuration || 60} minutos
3. Respeite RIGOROSAMENTE as restrições e lesões informadas
4. Use apenas os equipamentos disponíveis
5. Tenha progressão lógica e científica
6. Inclua observações técnicas detalhadas em cada exercício
7. Nomeie cada sessão de forma descritiva (ex: "Treino A - Peito, Ombro e Tríceps")

Retorne APENAS o seguinte JSON (sem texto antes ou depois, sem markdown):

{
  "title": "Nome descritivo do treino (ex: Protocolo Hipertrofia - ${student.name})",
  "generalNotes": "Orientações gerais sobre o programa, progressão e dicas importantes para o aluno",
  "sessions": [
    {
      "name": "Treino A - Grupos musculares trabalhados",
      "order": 1,
      "warmup": "Descrição do aquecimento específico para esta sessão",
      "exercises": [
        {
          "name": "Nome do exercício",
          "sets": 4,
          "reps": "8-12",
          "rest": 90,
          "notes": "Observação técnica detalhada de execução, pontos de atenção, dicas de ativação muscular",
          "order": 1,
          "muscleGroup": "Músculo(s) primário(s) trabalhado(s)"
        }
      ]
    }
  ]
}`;
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY não configurada. Acesse as configurações da Vercel." },
        { status: 500 }
      );
    }

    const { id } = await Promise.resolve(params);

    const { data: workoutRaw } = await supabase
      .from("Workout")
      .select("*, Student(*, Workout(id, title, createdAt))")
      .eq("id", id)
      .single();

    if (!workoutRaw)
      return NextResponse.json({ error: "Treino não encontrado" }, { status: 404 });

    const { data: settings } = await supabase
      .from("Settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    const student = (workoutRaw as any).Student;
    if (!student)
      return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });

    const userPrompt = buildWorkoutPrompt(student, settings as any);
    const rawText = await aiCompleteAnthropic(userPrompt, SYSTEM_PROMPT_PERSONAL, 4096);

    // Strip markdown code fences Claude sometimes adds despite instructions
    const cleanJson = rawText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    let workoutData: any;
    try {
      workoutData = JSON.parse(cleanJson);
    } catch {
      const extracted = extractJson(rawText);
      if (!extracted) {
        console.error("[Gerar Treino] JSON inválido:", rawText.slice(0, 500));
        throw new Error("A IA retornou um formato inválido. Tente novamente.");
      }
      workoutData = JSON.parse(extracted);
    }

    // Delete existing sessions (exercises are cascade-deleted via FK)
    await supabase.from("WorkoutSession").delete().eq("workoutId", id);

    // Persist full AI response (includes generalNotes, warmup, muscleGroup)
    const { data: updatedWorkout } = await supabase
      .from("Workout")
      .update({
        title: workoutData.title,
        status: "rascunho",
        content: JSON.stringify(workoutData),
      })
      .eq("id", id)
      .select()
      .single();

    const sessions = (
      await Promise.all(
        (workoutData.sessions ?? []).map(async (s: any, si: number) => {
          const { data: ws } = await supabase
            .from("WorkoutSession")
            .insert({
              id: crypto.randomUUID(),
              workoutId: id,
              name: s.name,
              order: s.order ?? si + 1,
            })
            .select()
            .single();
          if (!ws) return null;

          const exercises = (
            await Promise.all(
              (s.exercises ?? []).map((ex: any, ei: number) =>
                supabase
                  .from("Exercise")
                  .insert({
                    id: crypto.randomUUID(),
                    sessionId: (ws as any).id,
                    name: ex.name,
                    sets: parseInt(String(ex.sets)) || 3,
                    reps: String(ex.reps),
                    rest: parseInt(String(ex.rest)) || 60,
                    notes: ex.notes || null,
                    order: ex.order ?? ei + 1,
                    videoUrl: ex.videoUrl || null,
                  })
                  .select()
                  .single()
                  .then((r) => ({ ...(r.data as any), muscleGroup: ex.muscleGroup ?? null }))
              )
            )
          ).filter(Boolean);

          return { ...(ws as any), exercises, warmup: s.warmup ?? null };
        })
      )
    ).filter(Boolean);

    return NextResponse.json({
      ...(updatedWorkout as any),
      sessions,
      generalNotes: workoutData.generalNotes ?? null,
      aiGenerated: true,
    });
  } catch (error: any) {
    console.error("[Gerar Treino] Erro completo:", error);
    return NextResponse.json(
      {
        error: error.message || "Erro ao gerar treino",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
