"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db";
import { agendaEvents, members, serviceAssignments, serviceTeams, users } from "@/lib/db/schema";
import { notifyUsers } from "@/lib/firebase-push";

const assignmentSchema = z.object({
  teamId: z.string().uuid(),
  memberId: z.string().uuid(),
  scheduledAt: z.string().min(10).max(40),
  eventId: z.string().uuid().optional().or(z.literal("")),
  functionName: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(500).optional(),
});

export async function createServiceAssignment(formData: FormData) {
  const current = await requirePermission("escalas.gerenciar");
  const parsed = assignmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/escalas/nova?erro=Confira os dados da escala.");

  const scheduledAt = new Date(parsed.data.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) redirect("/escalas/nova?erro=Informe uma data e hor%C3%A1rio v%C3%A1lidos.");

  const db = getDb();
  const [team, member] = await Promise.all([
    db.select({ id: serviceTeams.id }).from(serviceTeams).where(and(eq(serviceTeams.id, parsed.data.teamId), eq(serviceTeams.active, true))).limit(1),
    db.select({ id: members.id }).from(members).where(eq(members.id, parsed.data.memberId)).limit(1),
  ]);
  if (!team[0] || !member[0]) redirect("/escalas/nova?erro=Equipe ou membro n%C3%A3o encontrado.");
  if (parsed.data.eventId) {
    const event = await db.select({ id: agendaEvents.id }).from(agendaEvents).where(eq(agendaEvents.id, parsed.data.eventId)).limit(1);
    if (!event[0]) redirect("/escalas/nova?erro=Evento não encontrado.");
  }

  const [assignment] = await db.insert(serviceAssignments).values({
    teamId: parsed.data.teamId,
    memberId: parsed.data.memberId,
    eventId: parsed.data.eventId || null,
    functionName: parsed.data.functionName || null,
    scheduledAt,
    notes: parsed.data.notes || null,
    createdBy: current.userId,
  }).returning({ id: serviceAssignments.id });

  await writeAuditLog({
    actorId: current.userId,
    action: "escala.designacao.criar",
    entityType: "service_assignment",
    entityId: assignment.id,
    metadata: { teamId: parsed.data.teamId, memberId: parsed.data.memberId, eventId: parsed.data.eventId || null, scheduledAt: scheduledAt.toISOString() },
  });
  const linkedUser = (await db.select({ id: users.id }).from(users).where(and(eq(users.memberId, parsed.data.memberId), eq(users.status, "active"))).limit(1))[0];
  if (linkedUser) await notifyUsers([linkedUser.id], { title: "Nova escala atribuída", body: `Você foi escalado para ${scheduledAt.toLocaleString("pt-BR")}.`, href: "/escalas" });
  revalidatePath("/escalas");
  redirect("/escalas?criado=1");
}

export async function updateServiceAssignmentStatus(formData: FormData) {
  const current = await requirePermission("escalas.gerenciar");
  const parsed = z.object({ id: z.string().uuid(), status: z.enum(["pending", "confirmed", "canceled"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/escalas?erro=Designação inválida.");
  const existing = (await getDb().select({ id: serviceAssignments.id, memberId: serviceAssignments.memberId }).from(serviceAssignments).where(eq(serviceAssignments.id, parsed.data.id)).limit(1))[0];
  if (!existing) redirect("/escalas?erro=Designação não encontrada.");
  await getDb().update(serviceAssignments).set({ status: parsed.data.status, confirmedAt: parsed.data.status === "confirmed" ? new Date() : null }).where(eq(serviceAssignments.id, parsed.data.id));
  await writeAuditLog({ actorId: current.userId, action: "escala.designacao.status", entityType: "service_assignment", entityId: parsed.data.id, metadata: { status: parsed.data.status } });
  const linkedUser = (await getDb().select({ id: users.id }).from(users).where(and(eq(users.memberId, existing.memberId), eq(users.status, "active"))).limit(1))[0];
  if (linkedUser) await notifyUsers([linkedUser.id], { title: "Escala atualizada", body: `Sua escala foi marcada como ${parsed.data.status}.`, href: "/escalas" });
  revalidatePath("/escalas"); redirect("/escalas?atualizado=1");
}
