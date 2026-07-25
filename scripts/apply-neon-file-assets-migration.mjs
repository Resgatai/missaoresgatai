import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL nao configurada.");
const sql = neon(process.env.DATABASE_URL);
const content = await readFile(new URL("../drizzle/0016_neon_file_assets.sql", import.meta.url), "utf8");
for (const statement of content.split(";").map((value) => value.trim()).filter(Boolean)) await sql.query(statement);
console.log("Migracao de arquivos no Neon aplicada.");