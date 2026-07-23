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

const eventSchema = z.object({
  title: z.string().trim().min(3).max(160),
  kind: z.enum(["service", "event", "meeting"]),
  description: z.string().trim().max(2000).optional(),
  imageUrl: z.string().trim().max(500).refine((value) => !value || value.startsWith("events/") || value.startsWith("https://"), "Imagem invalida.").optional().or(z.literal("")),
  startsAt: z.string().min(10).max(40),
  endsAt: z.string().max(40).optional(),
  location: z.string().trim().max(160).optional(),
  visibility: z.enum(["public", "internal"]),
  capacity: z.coerce.number().int().min(1).max(100000).optional(),
  registrationRequired: z.enum(["on"]).optional(),
  recurrenceRule: z.enum(["", "weekly", "monthly"]).optional(),
});

export async function createAgendaEvent(formData: FormData) {
  const current = await requirePermission("eventos.gerenciar");
  const parsed = eventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/agenda/novo?erro=Confira os dados do compromisso.");
  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : null;
  if (Number.isNaN(startsAt.getTime()) || (endsAt && (Number.isNaN(endsAt.getTime()) || endsAt <= startsAt))) redirect("/agenda/novo?erro=Informe datas e horários válidos.");
  const [event] = await getDb().insert(agendaEvents).values({ title: parsed.data.title, kind: parsed.data.kind, description: parsed.data.description || null, imageUrl: parsed.data.imageUrl || null, startsAt, endsAt, location: parsed.data.location || null, visibility: parsed.data.visibility, capacity: parsed.data.capacity ?? null, registrationRequired: parsed.data.registrationRequired === "on", recurrenceRule: parsed.data.recurrenceRule || null, createdBy: current.userId }).returning({ id: agendaEvents.id });
  if (parsed.data.visibility === "public") {
    const recipients = await getDb().select({ id: users.id }).from(users).where(eq(users.status, "active"));
    await notifyUsers(recipients.map(({ id }) => id).filter((id) => id !== current.userId), { title: `Novo evento: ${parsed.data.title}`, body: startsAt.toLocaleString("pt-BR"), href: "/agenda" });
  }
  await writeAuditLog({ actorId: current.userId, action: "agenda.evento.criar", entityType: "agenda_event", entityId: event.id, metadata: { kind: parsed.data.kind, visibility: parsed.data.visibility, registrationRequired: parsed.data.registrationRequired === "on", capacity: parsed.data.capacity ?? null } });
  revalidatePath("/agenda");
  redirect("/agenda?criado=1");
}
