/**
 * Test script: validates Gemini API + workout generation + follow-up message
 * Run with: node --env-file=.env scripts/test-ai.mjs
 */

const MODEL = "gemini-2.5-flash";

const STUDENT = {
  name: "João Silva",
  goal: "Hipertrofia muscular",
  level: "intermediario",
  daysPerWeek: 4,
  sessionDuration: 60,
  restrictions: "Nenhuma",
  equipment: "Academia completa com halteres, barras, máquinas e cabos",
  notes: "Prefere treinos de força com volume moderado",
};

const WORKOUT_PROMPT = `Você é um personal trainer especializado com 10 anos de experiência em consultoria online.
Analise os dados abaixo e gere um plano de treino completo e detalhado.

DADOS DO ALUNO:
Nome: ${STUDENT.name}
Objetivo: ${STUDENT.goal}
Nível: ${STUDENT.level}
Disponibilidade: ${STUDENT.daysPerWeek} dias/semana, ${STUDENT.sessionDuration} min por sessão
Restrições: ${STUDENT.restrictions}
Equipamentos disponíveis: ${STUDENT.equipment}
Observações: ${STUDENT.notes}

PROTOCOLO DO PERSONAL:
Periodização linear. Foco em exercícios compostos. Progressão de carga semanal.

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

const FOLLOWUP_PROMPT = `Você é assistente de um personal trainer.
Escreva uma mensagem de acompanhamento personalizada para o aluno abaixo.
A mensagem deve ser natural, motivadora, e parecer escrita pelo personal.
Máximo de 3 parágrafos. Sem formalidade excessiva.

ALUNO: ${STUDENT.name}
OBJETIVO: ${STUDENT.goal}
TREINO ATUAL: Hipertrofia 4x - Intermediário
DIAS DESDE O ÚLTIMO CONTATO: 15 dias

Template base do personal:
Olá {nome}! Tudo bem? Passando para ver como está indo o treino. Qualquer dúvida me chama!

Retorne APENAS o texto da mensagem, sem aspas ou formatação extra.`;

async function gemini(prompt, maxTokens) {
  const apiKey = process.env.GEMINI_API_KEY;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API ${res.status}: ${err}`);
  }
  const data = await res.json();
  return {
    text: data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "",
    tokensIn: data.usageMetadata?.promptTokenCount ?? 0,
    tokensOut: data.usageMetadata?.candidatesTokenCount ?? 0,
  };
}

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY não está definida no ambiente.");
    process.exit(1);
  }

  console.log("═══════════════════════════════════════════");
  console.log("  TESTE DE IA — PT Manager (Gemini API)");
  console.log("═══════════════════════════════════════════\n");
  console.log(`Modelo: ${MODEL}`);
  console.log(`Aluno de teste: ${STUDENT.name}\n`);

  // --- TESTE 1: Geração de treino ---
  console.log("▶ Teste 1: Geração de treino com IA...");
  const t1 = Date.now();
  try {
    const { text, tokensIn, tokensOut } = await gemini(WORKOUT_PROMPT, 4096);
    // Strip markdown code fences if present (Gemini 2.5 wraps JSON in ```json...```)
    const fenced = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
    const jsonStr = fenced
      ? fenced[1].trim()
      : text.match(/\{[\s\S]*\}/)?.[0] ?? null;
    if (!jsonStr) throw new Error("Resposta não contém JSON válido:\n" + text.slice(0, 300));

    const workout = JSON.parse(jsonStr);
    const elapsed = ((Date.now() - t1) / 1000).toFixed(1);

    console.log(`✅ Treino gerado em ${elapsed}s`);
    console.log(`   Título: "${workout.title}"`);
    console.log(`   Sessões: ${workout.sessions?.length ?? 0}`);
    workout.sessions?.forEach((s) => {
      console.log(`     • ${s.name} — ${s.exercises?.length ?? 0} exercícios`);
      s.exercises?.slice(0, 3).forEach((ex) => {
        console.log(`       - ${ex.name}: ${ex.sets}x${ex.reps} | ${ex.rest}s descanso`);
        if (ex.notes) console.log(`         Obs: ${ex.notes}`);
      });
      if ((s.exercises?.length ?? 0) > 3)
        console.log(`       ... e mais ${s.exercises.length - 3} exercício(s)`);
    });
    console.log(`   Tokens: entrada=${tokensIn} / saída=${tokensOut}\n`);
  } catch (err) {
    console.error(`❌ Erro no teste 1: ${err.message}\n`);
  }

  // --- TESTE 2: Mensagem de acompanhamento ---
  console.log("▶ Teste 2: Geração de mensagem de acompanhamento...");
  const t2 = Date.now();
  try {
    const { text, tokensIn, tokensOut } = await gemini(FOLLOWUP_PROMPT, 500);
    const elapsed = ((Date.now() - t2) / 1000).toFixed(1);

    console.log(`✅ Mensagem gerada em ${elapsed}s`);
    console.log(`   Tokens: entrada=${tokensIn} / saída=${tokensOut}`);
    console.log("\n─── Mensagem gerada ──────────────────────");
    console.log(text);
    console.log("──────────────────────────────────────────\n");
  } catch (err) {
    console.error(`❌ Erro no teste 2: ${err.message}\n`);
  }

  console.log("✅ Testes concluídos.");
}

run().catch((e) => {
  console.error("Erro fatal:", e.message);
  process.exit(1);
});
