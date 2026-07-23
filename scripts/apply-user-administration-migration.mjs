import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não configurada.");
const sql = neon(process.env.DATABASE_URL);
const content = await readFile(new URL("../drizzle/0004_user_administration.sql", import.meta.url), "utf8");
for (const statement of content.split(";").map((value) => value.trim()).filter(Boolean)) await sql.query(statement);
console.log("Migração de usuários aplicada.");
