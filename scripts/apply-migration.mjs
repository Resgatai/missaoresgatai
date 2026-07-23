import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não configurada.");
const sql = neon(process.env.DATABASE_URL);
const content = await readFile(new URL("../drizzle/0000_initial_foundation.sql", import.meta.url), "utf8");
const statements = content.split(";").map((statement) => statement.trim()).filter(Boolean);

for (const statement of statements) await sql.query(statement);
console.log(`Migração aplicada: ${statements.length} comandos executados.`);
