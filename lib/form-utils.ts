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
  for (const k of keys) {
    if (data[k] !== undefined && data[k] !== "") return flattenField(data[k]);
  }
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

export function extractStudentFromRaw(rawData: string): ExtractedStudent {
  const data = parseRaw(rawData);
  return {
    name: find(data, "nome", "name", "nome_completo", "fullName", "full_name"),
    email: find(data, "email", "emailAddress", "e-mail", "email_address"),
    phone: find(data, "phone", "telefone", "whatsapp", "celular", "phoneNumber"),
    goal: find(data, "objetivo", "goal", "meta", "objetivo_principal"),
    level: find(data, "nivel", "level", "nível", "experiencia", "experiência"),
    daysPerWeek: find(data, "diasPorSemana", "dias_por_semana", "daysPerWeek", "dias_semana"),
    sessionDuration: find(data, "duracaoSessao", "duracao_sessao", "sessionDuration", "duracao"),
    restrictions: find(data, "restricoes", "restrictions", "restrições", "lesoes", "lesões"),
    equipment: find(data, "equipamentos", "equipment", "equipamento"),
    birthdate: find(data, "dataNascimento", "data_nascimento", "birthdate", "nascimento"),
    city: find(data, "cidade", "city", "municipio", "município"),
    notes: find(data, "observacoes", "observações", "notes", "anotacoes", "outros"),
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

  return [...new Set(urls)];
}
