"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { writeAuditLog } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db";
import { agendaEvents, users } from "@/lib/db/schema";
import { notifyUsers } from "@/lib/firebase-push";

const optionalNumber = z.preprocess((value) => value === "" || value === undefined ? undefined : value, z.coerce.number().int().min(1).max(100000).optional());
const eventSchema = z.object({
  title: z.string().trim().min(3).max(160),
  kind: z.enum(["service", "event", "meeting"]),
  description: z.string().trim().max(2000).optional(),
  imageUrl: z.string().trim().max(500).refine((value) => !value || value.startsWith("events/") || value.startsWith("/api/uploads/image/") || value.startsWith("https://"), "Imagem invalida.").optional().or(z.literal("")),
  startsAt: z.string().min(10).max(40),
  endsAt: z.string().max(40).optional(),
  location: z.string().trim().max(160).optional(),
  visibility: z.enum(["public", "internal"]),
  capacity: optionalNumber,
  registrationRequired: z.enum(["on"]).optional(),
  recurrenceRule: z.enum(["", "weekly", "monthly"]).optional(),
});

function parseDates(parsed: z.infer<typeof eventSchema>) {
  const startsAt = new Date(parsed.startsAt);
  const endsAt = parsed.endsAt ? new Date(parsed.endsAt) : null;
  return { startsAt, endsAt, valid: !Number.isNaN(startsAt.getTime()) && (!endsAt || (!Number.isNaN(endsAt.getTime()) && endsAt > startsAt)) };
}

export async function createAgendaEvent(formData: FormData) {
  const current = await requirePermission("eventos.gerenciar");
  const parsed = eventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/agenda/novo?erro=Confira os dados do compromisso.");
  const { startsAt, endsAt, valid } = parseDates(parsed.data);
  if (!valid) redirect("/agenda/novo?erro=Informe datas e horarios validos.");
  const [event] = await getDb().insert(agendaEvents).values({ title: parsed.data.title, kind: parsed.data.kind, description: parsed.data.description || null, imageUrl: parsed.data.imageUrl || null, startsAt, endsAt, location: parsed.data.location || null, visibility: parsed.data.visibility, capacity: parsed.data.capacity ?? null, registrationRequired: parsed.data.registrationRequired === "on", recurrenceRule: parsed.data.recurrenceRule || null, createdBy: current.userId }).returning({ id: agendaEvents.id });
  if (parsed.data.visibility === "public") {
    const recipients = await getDb().select({ id: users.id }).from(users).where(eq(users.status, "active"));
    await notifyUsers(recipients.map(({ id }) => id).filter((id) => id !== current.userId), { title: `Novo evento: ${parsed.data.title}`, body: startsAt.toLocaleString("pt-BR"), href: "/agenda" });
  }
  await writeAuditLog({ actorId: current.userId, action: "agenda.evento.criar", entityType: "agenda_event", entityId: event.id, metadata: { kind: parsed.data.kind, visibility: parsed.data.visibility, registrationRequired: parsed.data.registrationRequired === "on", capacity: parsed.data.capacity ?? null } });
  revalidatePath("/agenda");
  redirect("/agenda?criado=1");
}

export async function updateAgendaEvent(formData: FormData) {
  const current = await requirePermission("eventos.gerenciar");
  const id = z.string().uuid().safeParse(formData.get("id"));
  const parsed = eventSchema.safeParse(Object.fromEntries(formData));
  if (!id.success || !parsed.success) redirect(`/agenda/${String(formData.get("id") ?? "")}/editar?erro=Confira os dados do compromisso.`);
  const { startsAt, endsAt, valid } = parseDates(parsed.data);
  if (!valid) redirect(`/agenda/${id.data}/editar?erro=Informe datas e horarios validos.`);
  const db = getDb();
  const existing = (await db.select().from(agendaEvents).where(eq(agendaEvents.id, id.data)).limit(1))[0];
  if (!existing || existing.canceledAt) redirect("/agenda?erro=Evento nao encontrado ou ja arquivado.");
  await db.update(agendaEvents).set({ title: parsed.data.title, kind: parsed.data.kind, description: parsed.data.description || null, imageUrl: parsed.data.imageUrl || null, startsAt, endsAt, location: parsed.data.location || null, visibility: parsed.data.visibility, capacity: parsed.data.capacity ?? null, registrationRequired: parsed.data.registrationRequired === "on", recurrenceRule: parsed.data.recurrenceRule || null }).where(eq(agendaEvents.id, id.data));
  await writeAuditLog({ actorId: current.userId, action: "agenda.evento.atualizar", entityType: "agenda_event", entityId: id.data, previousData: { title: existing.title, startsAt: existing.startsAt.toISOString(), visibility: existing.visibility }, newData: { title: parsed.data.title, startsAt: startsAt.toISOString(), visibility: parsed.data.visibility } });
  revalidatePath("/agenda");
  revalidatePath(`/agenda/${id.data}/editar`);
  redirect("/agenda?atualizado=1");
}

export async function archiveAgendaEvent(formData: FormData) {
  const current = await requirePermission("eventos.gerenciar");
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) redirect("/agenda?erro=Evento invalido.");
  const db = getDb();
  const existing = (await db.select({ id: agendaEvents.id, title: agendaEvents.title, canceledAt: agendaEvents.canceledAt }).from(agendaEvents).where(eq(agendaEvents.id, id.data)).limit(1))[0];
  if (!existing || existing.canceledAt) redirect("/agenda?erro=Evento nao encontrado ou ja arquivado.");
  const archivedAt = new Date();
  await db.update(agendaEvents).set({ canceledAt: archivedAt }).where(eq(agendaEvents.id, id.data));
  await writeAuditLog({ actorId: current.userId, action: "agenda.evento.arquivar", entityType: "agenda_event", entityId: id.data, previousData: { title: existing.title, canceledAt: null }, newData: { canceledAt: archivedAt.toISOString() } });
  revalidatePath("/agenda");
  redirect("/agenda?arquivado=1");
}