/**
 * Test script: validates Claude API + workout generation + follow-up message
 * Run with: node scripts/test-ai.mjs
 * Requires: ANTHROPIC_API_KEY set in environment
 */
import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-5";

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

async function run() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("❌ ANTHROPIC_API_KEY não está definida no ambiente.");
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });

  console.log("═══════════════════════════════════════════");
  console.log("  TESTE DE IA — PT Manager (Claude API)");
  console.log("═══════════════════════════════════════════\n");
  console.log(`Modelo: ${MODEL}`);
  console.log(`Aluno de teste: ${STUDENT.name}\n`);

  // --- TEST 1: Workout generation ---
  console.log("▶ Teste 1: Geração de treino com IA...");
  const t1start = Date.now();
  try {
    const msg1 = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      messages: [{ role: "user", content: WORKOUT_PROMPT }],
    });

    const text = msg1.content[0].text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("IA não retornou JSON válido");

    const workout = JSON.parse(jsonMatch[0]);
    const elapsed = ((Date.now() - t1start) / 1000).toFixed(1);

    console.log(`✅ Treino gerado em ${elapsed}s`);
    console.log(`   Título: "${workout.title}"`);
    console.log(`   Sessões: ${workout.sessions?.length ?? 0}`);
    workout.sessions?.forEach((s) => {
      console.log(`     • ${s.name}: ${s.exercises?.length ?? 0} exercícios`);
      s.exercises?.slice(0, 2).forEach((ex) => {
        console.log(`       - ${ex.name}: ${ex.sets}x${ex.reps} | ${ex.rest}s descanso`);
      });
      if (s.exercises?.length > 2) console.log(`       ... e mais ${s.exercises.length - 2} exercícios`);
    });
    console.log(`   Tokens usados: entrada=${msg1.usage.input_tokens} / saída=${msg1.usage.output_tokens}\n`);
  } catch (err) {
    console.error(`❌ Erro no teste 1: ${err.message}\n`);
  }

  // --- TEST 2: Follow-up message ---
  console.log("▶ Teste 2: Geração de mensagem de acompanhamento...");
  const t2start = Date.now();
  try {
    const msg2 = await client.messages.create({
      model: MODEL,
      max_tokens: 500,
      messages: [{ role: "user", content: FOLLOWUP_PROMPT }],
    });

    const message = msg2.content[0].text.trim();
    const elapsed = ((Date.now() - t2start) / 1000).toFixed(1);

    console.log(`✅ Mensagem gerada em ${elapsed}s`);
    console.log(`   Tokens: entrada=${msg2.usage.input_tokens} / saída=${msg2.usage.output_tokens}`);
    console.log("\n─── Mensagem gerada ──────────────────────");
    console.log(message);
    console.log("──────────────────────────────────────────\n");
  } catch (err) {
    console.error(`❌ Erro no teste 2: ${err.message}\n`);
  }

  console.log("✅ Testes concluídos.");
}

run().catch((e) => {
  console.error("Erro fatal:", e);
  process.exit(1);
});
