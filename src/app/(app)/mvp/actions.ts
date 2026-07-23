"use server";

import { and, count, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireDepartmentScope, requirePermission } from "@/lib/auth/authorization";
import { writeAuditLog } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { agendaEvents, attendanceRecords, churchSettings, contentItems, departmentMembers, departmentTasks, eventRegistrations, memberFamilies, members, notifications, prayerRequests, radioStations, roles, userRoles, users, wallPosts } from "@/lib/db/schema";
import { encryptSensitiveText } from "@/lib/security/encryption";
import { notifyUsers } from "@/lib/firebase-push";

const optional = (value: FormDataEntryValue | string | undefined | null) => typeof value === "string" && value.trim() ? value.trim() : null;
const url = z.string().trim().url().max(2000);

export async function createFamily(formData: FormData) {
  const current = await requirePermission("familias.gerenciar");
  const parsed = z.object({ name: z.string().trim().min(3).max(160), phone: z.string().trim().max(30).optional(), email: z.string().trim().email().optional().or(z.literal("")), address: z.string().trim().max(300).optional(), notes: z.string().trim().max(3000).optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/familias?erro=Confira os dados da família.");
  const [family] = await getDb().insert(memberFamilies).values({ name: parsed.data.name, phone: optional(parsed.data.phone), email: optional(parsed.data.email), address: optional(parsed.data.address), notesEncrypted: parsed.data.notes ? encryptSensitiveText(parsed.data.notes) : null }).returning({ id: memberFamilies.id });
  await writeAuditLog({ actorId: current.userId, action: "familias.criar", entityType: "family", entityId: family.id });
  revalidatePath("/familias"); redirect("/familias?criado=1");
}

export async function addMemberToDepartment(formData: FormData) {
  const departmentId = z.string().uuid().safeParse(formData.get("departmentId"));
  const memberId = z.string().uuid().safeParse(formData.get("memberId"));
  if (!departmentId.success || !memberId.success) redirect("/departamentos?erro=Selecione o departamento e o membro.");
  const current = await requireDepartmentScope(departmentId.data, "departamentos.gerenciar");
  await getDb().insert(departmentMembers).values({ departmentId: departmentId.data, memberId: memberId.data, role: optional(formData.get("role")) ?? "integrante", isLeader: formData.get("isLeader") === "on" }).onConflictDoNothing();
  await writeAuditLog({ actorId: current.userId, action: "departamentos.integrante.adicionar", entityType: "department", entityId: departmentId.data, metadata: { memberId: memberId.data } });
  revalidatePath("/departamentos"); revalidatePath(`/departamentos/${departmentId.data}`); redirect(`/departamentos/${departmentId.data}?integrante=1`);
}

export async function createDepartmentTask(formData: FormData) {
  const departmentId = z.string().uuid().safeParse(formData.get("departmentId"));
  const parsed = z.object({ title: z.string().trim().min(3).max(180), description: z.string().trim().max(3000).optional(), dueAt: z.string().optional(), assignedMemberId: z.string().uuid().optional().or(z.literal("")) }).safeParse(Object.fromEntries(formData));
  if (!departmentId.success || !parsed.success) redirect("/departamentos?erro=Confira os dados da tarefa.");
  const current = await requireDepartmentScope(departmentId.data, "departamentos.gerenciar");
  const dueAt = parsed.data.dueAt ? new Date(parsed.data.dueAt) : null;
  if (dueAt && Number.isNaN(dueAt.getTime())) redirect(`/departamentos/${departmentId.data}?erro=Data da tarefa inválida.`);
  if (parsed.data.assignedMemberId) {
    const member = await getDb().select({ id: members.id }).from(members).where(eq(members.id, parsed.data.assignedMemberId)).limit(1);
    if (!member[0]) redirect(`/departamentos/${departmentId.data}?erro=Membro não encontrado.`);
  }
  const [task] = await getDb().insert(departmentTasks).values({ departmentId: departmentId.data, title: parsed.data.title, description: optional(parsed.data.description), dueAt, assignedMemberId: parsed.data.assignedMemberId || null, createdBy: current.userId }).returning({ id: departmentTasks.id });
  await writeAuditLog({ actorId: current.userId, action: "departamentos.tarefa.criar", entityType: "department_task", entityId: task.id, metadata: { departmentId: departmentId.data } });
  revalidatePath(`/departamentos/${departmentId.data}`); redirect(`/departamentos/${departmentId.data}?tarefa=1`);
}

export async function registerAttendance(formData: FormData) {
  const current = await requirePermission("presenca.criar");
  const parsed = z.object({ eventId: z.string().uuid(), memberId: z.string().uuid(), present: z.enum(["yes", "no"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/presencas?erro=Selecione um evento e um membro.");
  await getDb().insert(attendanceRecords).values({ eventId: parsed.data.eventId, memberId: parsed.data.memberId, present: parsed.data.present === "yes", recordedBy: current.userId }).onConflictDoUpdate({ target: [attendanceRecords.eventId, attendanceRecords.memberId], set: { present: parsed.data.present === "yes", recordedBy: current.userId, recordedAt: new Date() } });
  await writeAuditLog({ actorId: current.userId, action: "presenca.registrar", entityType: "attendance", metadata: { eventId: parsed.data.eventId, memberId: parsed.data.memberId, present: parsed.data.present === "yes" } });
  revalidatePath("/presencas"); redirect("/presencas?registrado=1");
}

export async function saveAttendanceBulk(formData: FormData) {
  const current = await requirePermission("presenca.criar"); const eventId = z.string().uuid().safeParse(formData.get("eventId"));
  let rawEntries: unknown = [];
  try { rawEntries = JSON.parse(String(formData.get("entries") || "[]")); } catch { rawEntries = []; }
  const entries = z.array(z.object({ memberId: z.string().uuid(), present: z.boolean() })).safeParse(rawEntries);
  if (!eventId.success || !entries.success || !entries.data.length) redirect("/presencas?erro=Selecione um evento e membros.");
  const db = getDb(); for (const item of entries.data) await db.insert(attendanceRecords).values({ eventId: eventId.data, memberId: item.memberId, present: item.present, recordedBy: current.userId }).onConflictDoUpdate({ target: [attendanceRecords.eventId, attendanceRecords.memberId], set: { present: item.present, recordedBy: current.userId, recordedAt: new Date() } });
  await writeAuditLog({ actorId: current.userId, action: "presenca.registrar_lote", entityType: "agenda_event", entityId: eventId.data, metadata: { total: entries.data.length } }); revalidatePath("/presencas"); redirect(`/presencas?evento=${eventId.data}&registrado=1`);
}

export async function createWallPost(formData: FormData) {
  const current = await requirePermission("comunicacao.publicar");
  const parsed = z.object({ title: z.string().trim().min(3).max(180), body: z.string().trim().min(3).max(8000), audience: z.enum(["all", "members", "leaders", "department"]), departmentId: z.string().uuid().optional().or(z.literal("")), expiresAt: z.string().optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success || (parsed.data.audience === "department" && !parsed.data.departmentId)) redirect("/mural?erro=Confira o aviso e o público.");
  if (parsed.data.departmentId) await requireDepartmentScope(parsed.data.departmentId, "comunicacao.publicar");
  const expiry = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;
  if (expiry && Number.isNaN(expiry.getTime())) redirect("/mural?erro=Data de expiração inválida.");
  const [post] = await getDb().insert(wallPosts).values({ title: parsed.data.title, body: parsed.data.body, audience: parsed.data.audience, departmentId: parsed.data.departmentId || null, expiresAt: expiry, createdBy: current.userId }).returning({ id: wallPosts.id });
  const audienceUsers = await getDb().select({ id: users.id }).from(users).where(eq(users.status, "active"));
  await notifyUsers(audienceUsers.map(({ id }) => id).filter((id) => id !== current.userId), { title: `Novo aviso: ${parsed.data.title}`, body: parsed.data.body.slice(0, 180), href: "/mural" });
  await writeAuditLog({ actorId: current.userId, action: "mural.publicar", entityType: "wall_post", entityId: post.id, metadata: { audience: parsed.data.audience } });
  revalidatePath("/mural"); revalidatePath("/"); redirect("/mural?publicado=1");
}

export async function createContent(formData: FormData) {
  const current = await requirePermission("conteudos.publicar");
  const parsed = z.object({ type: z.enum(["sermon", "video", "podcast"]), title: z.string().trim().min(3).max(180), description: z.string().trim().max(4000).optional(), url, speaker: z.string().trim().max(160).optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/conteudos?erro=Confira os dados e informe uma URL válida.");
  const [content] = await getDb().insert(contentItems).values({ ...parsed.data, description: optional(parsed.data.description), speaker: optional(parsed.data.speaker), createdBy: current.userId }).returning({ id: contentItems.id });
  await writeAuditLog({ actorId: current.userId, action: "conteudos.publicar", entityType: "content_item", entityId: content.id, metadata: { type: parsed.data.type } });
  revalidatePath("/conteudos"); revalidatePath("/"); redirect("/conteudos?publicado=1");
}

export async function createRadioStation(formData: FormData) {
  const current = await requirePermission("conteudos.publicar");
  const parsed = z.object({ name: z.string().trim().min(3).max(120), streamUrl: url }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/radio?erro=Informe um nome e uma URL de streaming válida.");
  const [station] = await getDb().insert(radioStations).values({ ...parsed.data, createdBy: current.userId }).returning({ id: radioStations.id });
  await writeAuditLog({ actorId: current.userId, action: "radio.criar", entityType: "radio_station", entityId: station.id });
  revalidatePath("/radio"); revalidatePath("/"); redirect("/radio?criado=1");
}

export async function createPrayerRequest(formData: FormData) {
  const parsed = z.object({ requesterName: z.string().trim().max(160).optional(), requesterEmail: z.string().trim().email().max(255).optional().or(z.literal("")), body: z.string().trim().min(5).max(5000), confidential: z.enum(["yes", "no"]).default("no") }).safeParse(Object.fromEntries(formData));
  const returnTo = formData.get("returnTo") === "/pedido-de-oracao" ? "/pedido-de-oracao" : "/oracoes";
  if (!parsed.success) redirect(`${returnTo}?erro=Escreva um pedido de oração válido.`);
  const [request] = await getDb().insert(prayerRequests).values({ requesterName: optional(parsed.data.requesterName), requesterEmail: optional(parsed.data.requesterEmail), bodyEncrypted: encryptSensitiveText(parsed.data.body), confidential: parsed.data.confidential === "yes" }).returning({ id: prayerRequests.id });
  const prayerManagers = await getDb().select({ id: users.id }).from(users).innerJoin(userRoles, eq(users.id, userRoles.userId)).innerJoin(roles, eq(userRoles.roleId, roles.id)).where(and(eq(users.status, "active"), inArray(roles.slug, ["superadministrador", "pastor_presidente", "pastor"])));
  await notifyUsers(prayerManagers.map(({ id }) => id), { title: "Novo pedido de oração", body: "Um novo pedido aguarda acompanhamento.", href: "/oracoes" });
  await writeAuditLog({ actorId: undefined, action: "oracao.criar", entityType: "prayer_request", entityId: request.id, metadata: { confidential: parsed.data.confidential === "yes" } });
  revalidatePath("/oracoes"); redirect(`${returnTo}?enviado=1`);
}

export async function updatePrayerStatus(formData: FormData) {
  const current = await requirePermission("oracao.gerenciar");
  const parsed = z.object({ id: z.string().uuid(), status: z.enum(["open", "praying", "answered", "archived"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/oracoes?erro=Pedido inválido.");
  await getDb().update(prayerRequests).set({ status: parsed.data.status, assignedTo: current.userId, answeredAt: parsed.data.status === "answered" ? new Date() : null }).where(eq(prayerRequests.id, parsed.data.id));
  await writeAuditLog({ actorId: current.userId, action: "oracao.atualizar", entityType: "prayer_request", entityId: parsed.data.id, metadata: { status: parsed.data.status } });
  revalidatePath("/oracoes"); redirect("/oracoes?atualizado=1");
}

export async function markNotificationRead(formData: FormData) {
  const current = await requirePermission("painel.visualizar");
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) redirect("/notificacoes");
  await getDb().update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, id.data), eq(notifications.userId, current.userId)));
  await writeAuditLog({ actorId: current.userId, action: "notificacao.ler", entityType: "notification", entityId: id.data });
  revalidatePath("/notificacoes"); redirect("/notificacoes");
}

export async function updateChurchSettings(formData: FormData) {
  const current = await requirePermission("configuracoes.gerenciar");
  const parsed = z.object({ churchName: z.string().trim().min(3).max(160), slogan: z.string().trim().max(240).optional(), address: z.string().trim().max(300).optional(), phone: z.string().trim().max(30).optional(), email: z.string().trim().email().optional().or(z.literal("")), instagramUrl: z.string().trim().url().optional().or(z.literal("")), youtubeUrl: z.string().trim().url().optional().or(z.literal("")), logoUrl: z.string().trim().max(500).refine((value) => !value || value.startsWith("branding/") || value.startsWith("https://"), "Logotipo inválido.").optional().or(z.literal("")) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/configuracoes?erro=Confira os dados e URLs informadas.");
  const db = getDb(); const existing = (await db.select({ id: churchSettings.id }).from(churchSettings).limit(1))[0];
  const values = { ...parsed.data, slogan: optional(parsed.data.slogan), address: optional(parsed.data.address), phone: optional(parsed.data.phone), email: optional(parsed.data.email), instagramUrl: optional(parsed.data.instagramUrl), youtubeUrl: optional(parsed.data.youtubeUrl), logoUrl: optional(parsed.data.logoUrl), updatedBy: current.userId, updatedAt: new Date() };
  if (existing) await db.update(churchSettings).set(values).where(eq(churchSettings.id, existing.id)); else await db.insert(churchSettings).values(values);
  await writeAuditLog({ actorId: current.userId, action: "configuracoes.atualizar", entityType: "church_settings", entityId: existing?.id });
  revalidatePath("/configuracoes"); revalidatePath("/"); redirect("/configuracoes?salvo=1");
}

export async function registerForEvent(formData: FormData) {
  const parsed = z.object({ eventId: z.string().uuid(), visitorName: z.string().trim().min(3).max(160), visitorEmail: z.string().trim().email().optional().or(z.literal("")) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/?erro=Confira sua inscrição.");
  const db = getDb();
  const event = (await db.select({ id: agendaEvents.id, capacity: agendaEvents.capacity, registrationRequired: agendaEvents.registrationRequired, visibility: agendaEvents.visibility, canceledAt: agendaEvents.canceledAt, startsAt: agendaEvents.startsAt }).from(agendaEvents).where(eq(agendaEvents.id, parsed.data.eventId)).limit(1))[0];
  if (!event || event.visibility !== "public" || !event.registrationRequired || event.canceledAt || event.startsAt <= new Date()) redirect("/?erro=As inscrições para este evento não estão disponíveis.");
  if (event.capacity) {
    const [{ total }] = await db.select({ total: count() }).from(eventRegistrations).where(eq(eventRegistrations.eventId, event.id));
    if (total >= event.capacity) redirect("/?erro=Este evento já atingiu a capacidade máxima.");
  }
  await db.insert(eventRegistrations).values({ eventId: parsed.data.eventId, visitorName: parsed.data.visitorName, visitorEmail: optional(parsed.data.visitorEmail) });
  revalidatePath("/"); redirect("/?inscrito=1");
}

export async function selfRegisterMember(formData: FormData) {
  const parsed = z.object({ fullName: z.string().trim().min(3).max(160), email: z.string().trim().email().optional().or(z.literal("")), mobilePhone: z.string().trim().max(20).optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/cadastro-membro?erro=Confira os dados informados.");
  const [member] = await getDb().insert(members).values({ fullName: parsed.data.fullName, email: optional(parsed.data.email), mobilePhone: optional(parsed.data.mobilePhone), status: "visitor", registrationStatus: "pending", consentAt: new Date() }).returning({ id: members.id });
  await writeAuditLog({ action: "membros.auto_cadastro", entityType: "member", entityId: member.id, metadata: { pendingApproval: true } });
  revalidatePath("/membros"); redirect("/cadastro-membro?enviado=1");
}

export async function approveSelfRegisteredMember(formData: FormData) {
  const current = await requirePermission("membros.editar"); const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) redirect("/membros"); await getDb().update(members).set({ registrationStatus: "approved", updatedAt: new Date() }).where(eq(members.id, id.data));
  await getDb().update(users).set({ status: "active", sessionVersion: sql`${users.sessionVersion} + 1` }).where(eq(users.memberId, id.data));
  await writeAuditLog({ actorId: current.userId, action: "membros.auto_cadastro.aprovar", entityType: "member", entityId: id.data }); revalidatePath("/membros"); redirect("/membros?aprovado=1");
}
