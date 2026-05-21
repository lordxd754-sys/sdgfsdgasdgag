function flattenField(val: unknown): string {
  if (!val) return "";
  if (typeof val === "string") return val.trim();
  if (Array.isArray(val)) return val.filter(Boolean).join(", ");
  if (typeof val === "object") {
    const v = val as Record<string, string>;
    // Jotform name fields: { first, last }
    if (v.first || v.last) return `${v.first ?? ""} ${v.last ?? ""}`.trim();
    return Object.values(v).filter(Boolean).join(", ");
  }
  return String(val);
}

function parseRaw(rawData: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(rawData);
    if (typeof parsed.rawRequest === "string") {
      try {
        return { ...parsed, ...JSON.parse(parsed.rawRequest) };
      } catch {
        return parsed;
      }
    }
    return parsed;
  } catch {
    return {};
  }
}

function find(data: Record<string, unknown>, ...keys: string[]): string {
  // Exact key match first
  for (const k of keys) {
    if (data[k] !== undefined && data[k] !== "") return flattenField(data[k]);
  }
  // Partial key match (case-insensitive)
  for (const k of keys) {
    const match = Object.keys(data).find((dk) =>
      dk.toLowerCase().includes(k.toLowerCase())
    );
    if (match && data[match]) return flattenField(data[match]);
  }
  return "";
}

export interface ExtractedStudent {
  name: string;
  email: string;
  phone: string;
  goal: string;
  level: string;
  daysPerWeek: string;
  sessionDuration: string;
  restrictions: string;
  equipment: string;
  birthdate: string;
  city: string;
  notes: string;
}

// Name-like pattern: "João Silva" or "JOÃO SILVA" or "joão da silva" — 2+ words of letters
const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ]{2,}(?:\s+[A-Za-zÀ-ÖØ-öø-ÿ']{2,})+$/;

export function extractStudentFromRaw(rawData: string): ExtractedStudent {
  const data = parseRaw(rawData);

  let name = find(
    data,
    // Portuguese
    "nome", "nome_completo", "nomeCompleto", "nomeDoAluno", "seu_nome", "seuNome",
    // English / JotForm defaults
    "name", "fullName", "full_name", "yourName", "your_name",
    // First + last combined
    "firstName", "first_name", "lastName", "last_name",
  );

  // If first+last were found separately, try to combine them
  if (!name) {
    const first = find(data, "firstName", "first_name", "nome", "primeiro");
    const last = find(data, "lastName", "last_name", "sobrenome", "ultimo");
    if (first && last) name = `${first} ${last}`.trim();
  }

  // Last resort: scan all string values for something that looks like a full name
  if (!name) {
    for (const val of Object.values(data)) {
      const str = flattenField(val);
      if (str.length > 4 && str.length < 80 && NAME_RE.test(str)) {
        name = str;
        break;
      }
    }
  }

  return {
    name,
    email: find(data, "email", "emailAddress", "e-mail", "email_address", "emailDoAluno"),
    phone: find(data, "phone", "telefone", "whatsapp", "celular", "phoneNumber", "contato"),
    goal: find(data, "objetivo", "goal", "meta", "objetivo_principal", "seusObjetivos", "objetivos"),
    level: find(data, "nivel", "level", "nível", "experiencia", "experiência", "nivelDeExperiencia"),
    daysPerWeek: find(data, "diasPorSemana", "dias_por_semana", "daysPerWeek", "dias_semana", "quantosDias"),
    sessionDuration: find(data, "duracaoSessao", "duracao_sessao", "sessionDuration", "duracao", "tempoSessao"),
    restrictions: find(data, "restricoes", "restrictions", "restrições", "lesoes", "lesões", "restricaoMedica"),
    equipment: find(data, "equipamentos", "equipment", "equipamento", "materiais"),
    birthdate: find(data, "dataNascimento", "data_nascimento", "birthdate", "nascimento", "dataDeNascimento"),
    city: find(data, "cidade", "city", "municipio", "município", "localidade"),
    notes: find(data, "observacoes", "observações", "notes", "anotacoes", "outros", "informacoesAdicionais"),
  };
}

const IMAGE_URL_RE = /\.(jpg|jpeg|png|webp)(\?.*)?$/i;

export function extractPhotoUrlsFromRaw(rawData: string): string[] {
  const data = parseRaw(rawData);
  const urls: string[] = [];

  for (const val of Object.values(data)) {
    const candidates = Array.isArray(val) ? val : [val];
    for (const c of candidates) {
      if (typeof c !== "string") continue;
      const trimmed = c.trim();
      if (
        trimmed.startsWith("http") &&
        (IMAGE_URL_RE.test(trimmed) ||
          trimmed.includes("jotform.com/uploads") ||
          trimmed.includes("jotform.io/uploads"))
      ) {
        urls.push(trimmed);
      }
    }
  }

  return Array.from(new Set(urls));
}
