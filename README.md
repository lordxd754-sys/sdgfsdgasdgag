# PT Manager

Plataforma de gestão de consultoria online para personal trainers. Hub central entre Jotform, análise de treinos com IA e acompanhamento automático de alunos — com exportação formatada para o MFIT.

## Funcionalidades

- **Intake** — Recebe formulários do Jotform via webhook automaticamente
- **Alunos (CRM)** — Gerencia todos os alunos com perfis completos
- **Treinos com IA** — Gera treinos personalizados usando Claude AI
- **Exportação MFIT** — Formata os treinos para cadastro manual no MFIT
- **Acompanhamento automático** — Envia mensagens de 15 em 15 dias

## Instalação

```bash
npm install
cp .env.example .env
# Configure .env com suas chaves
npx prisma migrate dev
npm run db:seed
npm run dev
```

Login padrão: `admin@ptmanager.com` / `admin123`

## Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | `file:./dev.db` |
| `NEXTAUTH_SECRET` | String aleatória segura |
| `NEXTAUTH_URL` | URL da aplicação |
| `ANTHROPIC_API_KEY` | Chave da API Claude |
| `ZAPI_TOKEN` / `ZAPI_INSTANCE` | WhatsApp via Zapi |
| `SMTP_HOST/PORT/USER/PASS/FROM` | Configurações SMTP |
| `CRON_SECRET` | Segurança do cron job |

## Integrações

### Jotform
Configure o webhook no Jotform para: `{APP_URL}/api/webhooks/jotform`

### WhatsApp (Zapi)
Crie conta em z-api.io, conecte o WhatsApp e copie Token + Instance ID.

### Gmail SMTP
Use uma Senha de App (Conta Google > Segurança > Senhas de Aplicativo).
- Host: `smtp.gmail.com`, Porta: `587`

## Deploy na Vercel

1. Push para GitHub
2. Importe na Vercel e configure as variáveis de ambiente
3. O cron de acompanhamento roda diariamente às 08h BRT via `vercel.json`

> **Nota:** SQLite não persiste entre deploys na Vercel. Em produção use [Turso](https://turso.tech) ou migre para PostgreSQL.

## Stack

Next.js 14 · TypeScript · Tailwind CSS · Prisma/SQLite · NextAuth.js v5 · Anthropic Claude · Nodemailer · Zapi
