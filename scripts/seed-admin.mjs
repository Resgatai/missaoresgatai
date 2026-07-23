import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

const { DATABASE_URL, ADMIN_NAME, ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;
if (!DATABASE_URL || !ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_USERNAME || !ADMIN_PASSWORD) throw new Error("Defina DATABASE_URL, ADMIN_NAME, ADMIN_EMAIL, ADMIN_USERNAME e ADMIN_PASSWORD.");
if (ADMIN_PASSWORD.length < 12) throw new Error("ADMIN_PASSWORD precisa ter pelo menos 12 caracteres.");
const sql = neon(DATABASE_URL);
const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
const [user] = await sql`INSERT INTO users (name, username, email, password_hash) VALUES (${ADMIN_NAME}, ${ADMIN_USERNAME.toLowerCase()}, ${ADMIN_EMAIL.toLowerCase()}, ${passwordHash}) ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, username = EXCLUDED.username, password_hash = EXCLUDED.password_hash, status = 'active' RETURNING id`;
const [role] = await sql`INSERT INTO roles (name, slug, description) VALUES ('Superadministrador', 'superadministrador', 'Acesso completo ao sistema') ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`;
await sql`INSERT INTO user_roles (user_id, role_id) VALUES (${user.id}, ${role.id}) ON CONFLICT DO NOTHING`;
console.log(`Superadministrador criado: ${ADMIN_EMAIL}`);
