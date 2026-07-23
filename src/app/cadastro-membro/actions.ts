"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { members } from "@/lib/db/schema";
import { encryptSensitiveText } from "@/lib/security/encryption";

const optional = (value: string | undefined) => value?.trim() || undefined;
const digits = (value: string | undefined) => value?.replace(/\D/g, "") || undefined;
const normalizeInstagram = (value: string | undefined) => {
  const raw = value?.trim();
  if (!raw) return undefined;
  const handle = raw.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/[/?#].*$/, "").replace(/^@/, "");
  return /^[a-zA-Z0-9._]{1,30}$/.test(handle) ? `@${handle}` : undefined;
};
const validCpf = (cpf: string) => {
  if (!/^\d{11}$/.test(cpf) || /^([0-9])\1+$/.test(cpf)) return false;
  let sum = 0;
  for (let index = 0; index < 9; index += 1) sum += Number(cpf[index]) * (10 - index);
  let check = (sum * 10) % 11;
  if (check === 10) check = 0;
  if (check !== Number(cpf[9])) return false;
  sum = 0;
  for (let index = 0; index < 10; index += 1) sum += Number(cpf[index]) * (11 - index);
  check = (sum * 10) % 11;
  return (check === 10 ? 0 : check) === Number(cpf[10]);
};

const schema = z.object({
  fullName: z.string().trim().min(3).max(160),
  preferredName: z.string().trim().max(160).optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  mobilePhone: z.string().trim().max(20).optional(),
  instagram: z.string().trim().max(300).optional().or(z.literal("")),
  cpf: z.string().trim().max(20).optional(),
  birthDate: z.string().optional(),
  maritalStatus: z.string().trim().max(40).optional(),
  occupation: z.string().trim().max(120).optional(),
  address: z.string().trim().max(300).optional(),
  neighborhood: z.string().trim().max(120).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().length(2).optional().or(z.literal("")),
  zipCode: z.string().trim().max(12).optional(),
  guardianName: z.string().trim().max(160).optional(),
  notes: z.string().trim().max(3000).optional(),
});

export async function selfRegisterMember(formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/cadastro-membro?erro=Confira os dados informados.");
  const data = parsed.data;
  const instagram = normalizeInstagram(data.instagram);
  if (data.instagram && !instagram) redirect("/cadastro-membro?erro=Informe o Instagram no formato @conta.");
  const cpf = digits(data.cpf);
  if (cpf && !validCpf(cpf)) redirect("/cadastro-membro?erro=CPF inválido.");
  const notes = optional(data.notes);
  const [member] = await getDb().insert(members).values({
    fullName: data.fullName,
    preferredName: optional(data.preferredName),
    email: optional(data.email),
    mobilePhone: digits(data.mobilePhone),
    instagram,
    cpfHash: cpf ? createHash("sha256").update(cpf).digest("hex") : undefined,
    cpfEncrypted: cpf ? encryptSensitiveText(cpf) : undefined,
    birthDate: optional(data.birthDate),
    maritalStatus: optional(data.maritalStatus),
    occupation: optional(data.occupation),
    address: optional(data.address),
    neighborhood: optional(data.neighborhood),
    city: optional(data.city),
    state: optional(data.state)?.toUpperCase(),
    zipCode: optional(data.zipCode),
    guardianName: optional(data.guardianName),
    notesEncrypted: notes ? encryptSensitiveText(notes) : undefined,
    status: "visitor",
    registrationStatus: "pending",
    consentAt: new Date(),
  }).returning({ id: members.id });
  await writeAuditLog({ action: "membros.auto_cadastro", entityType: "member", entityId: member.id, metadata: { pendingApproval: true } });
  revalidatePath("/membros");
  redirect("/cadastro-membro?enviado=1");
}
