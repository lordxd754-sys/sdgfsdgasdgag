import "dotenv/config";
import { defineConfig } from "prisma/config";

// Session mode pooler (port 5432) supports DDL for migrations
const migrationUrl =
  process.env["DIRECT_URL"] ??
  "postgresql://postgres.uqmooyyyitllwtwnphlt:Martins06%40623@aws-0-sa-east-1.pooler.supabase.com:5432/postgres";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: migrationUrl,
  },
});
