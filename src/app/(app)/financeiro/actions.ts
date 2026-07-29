"use server";

import { randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/authorization";
import { writeAuditLog } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { brazilDateInputValue, parseBrazilDateTimeLocal } from "@/lib/timezone";
import { financialAccounts, financialCategories, financialTransactionApprovals, financialTransactions, roles, userRoles, users } from "@/lib/db/schema";
import { notifyUsers } from "@/lib/firebase-push";

const transactionSchema = z.object({ type: z.enum(["income", "expense"]), amount: z.string().trim().min(1).max(20), description: z.string().trim().min(3).max(500), accountId: z.string().uuid(), categoryId: z.string().uuid(), occurredAt: z.string().min(10).max(40) });
const idSchema = z.string().uuid();
const transactionEditSchema = transactionSchema.extend({ transactionId: idSchema });

function decimalFromBrazilianInput(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(normalized) || Number(normalized) <= 0) return null;
  return normalized.includes(".") ? normalized.padEnd(normalized.indexOf(".") + 3, "0") : `${normalized}.00`;
}

export async function createFinancialTransaction(formData: FormData) {
  const current = await requirePermission("financeiro.criar");
  const parsed = transactionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/financeiro/novo?erro=Confira os dados do lançamento.");
  const amount = decimalFromBrazilianInput(parsed.data.amount);
  if (!amount) redirect("/financeiro/novo?erro=Informe um valor válido.");
  const db = getDb();
  const [account, category] = await Promise.all([
    db.select().from(financialAccounts).where(and(eq(financialAccounts.id, parsed.data.accountId), eq(financialAccounts.active, true))).limit(1),
    db.select().from(financialCategories).where(and(eq(financialCategories.id, parsed.data.categoryId), eq(financialCategories.active, true))).limit(1),
  ]);
  if (!account[0] || !category[0] || category[0].type !== parsed.data.type) redirect("/financeiro/novo?erro=Conta ou categoria inválida.");
  const reference = `FIN-${brazilDateInputValue().replace(/-/g, "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const [transaction] = await db.insert(financialTransactions).values({ reference, type: parsed.data.type, amount, description: parsed.data.description, accountId: account[0].id, categoryId: category[0].id, createdBy: current.userId, occurredAt: parseBrazilDateTimeLocal(parsed.data.occurredAt), requiredApprovals: 1 }).returning({ id: financialTransactions.id });
  const approvers = await db.select({ id: users.id }).from(users).innerJoin(userRoles, eq(users.id, userRoles.userId)).innerJoin(roles, eq(userRoles.roleId, roles.id)).where(and(eq(users.status, "active"), inArray(roles.slug, ["superadministrador", "pastor_presidente", "pastor", "tesoureiro"])));
  await notifyUsers(approvers.map(({ id }) => id).filter((id) => id !== current.userId), { title: "Lançamento financeiro aguardando aprovação", body: `${parsed.data.description} · R$ ${amount}`, href: `/financeiro/${transaction.id}` });
  await writeAuditLog({ actorId: current.userId, action: "financeiro.lancamento.criar", entityType: "financial_transaction", entityId: transaction.id, metadata: { type: parsed.data.type, approvalPolicy: "single-authorized-approval" } });
  revalidatePath("/financeiro");
  redirect(`/financeiro/${transaction.id}?criado=1`);
}

export async function updateFinancialTransaction(formData: FormData) {
  const current = await requirePermission("financeiro.criar");
  const parsed = transactionEditSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/financeiro/${String(formData.get("transactionId") ?? "")}?erro=Confira os dados do lancamento.`);
  const amount = decimalFromBrazilianInput(parsed.data.amount);
  const occurredAt = parseBrazilDateTimeLocal(parsed.data.occurredAt);
  if (!amount || Number.isNaN(occurredAt.getTime())) redirect(`/financeiro/${parsed.data.transactionId}?erro=Valor ou data invalidos.`);
  const db = getDb();
  const transaction = (await db.select().from(financialTransactions).where(eq(financialTransactions.id, parsed.data.transactionId)).limit(1))[0];
  if (!transaction) redirect("/financeiro?erro=Lancamento nao encontrado.");
  const [approvalCount] = await db.select({ total: sql<number>`count(*)` }).from(financialTransactionApprovals).where(eq(financialTransactionApprovals.transactionId, transaction.id));
  if (Number(approvalCount.total) > 0) redirect(`/financeiro/${transaction.id}?erro=Lancamentos com aprovacao registrada nao podem ser editados. Use um estorno.`);
  const [account, category] = await Promise.all([
    db.select().from(financialAccounts).where(and(eq(financialAccounts.id, parsed.data.accountId), eq(financialAccounts.active, true))).limit(1),
    db.select().from(financialCategories).where(and(eq(financialCategories.id, parsed.data.categoryId), eq(financialCategories.active, true))).limit(1),
  ]);
  if (!account[0] || !category[0] || category[0].type !== parsed.data.type) redirect(`/financeiro/${transaction.id}?erro=Conta ou categoria invalida.`);
  await db.update(financialTransactions).set({ type: parsed.data.type, amount, description: parsed.data.description, accountId: account[0].id, categoryId: category[0].id, occurredAt }).where(eq(financialTransactions.id, transaction.id));
  await writeAuditLog({ actorId: current.userId, action: "financeiro.lancamento.editar", entityType: "financial_transaction", entityId: transaction.id, metadata: { type: parsed.data.type, amount, description: parsed.data.description } });
  revalidatePath("/financeiro");
  revalidatePath(`/financeiro/${transaction.id}`);
  redirect(`/financeiro/${transaction.id}?atualizado=1`);
}

export async function deleteFinancialTransaction(formData: FormData) {
  const current = await requirePermission("financeiro.criar");
  const parsed = z.object({ transactionId: idSchema, reason: z.string().trim().min(5).max(300) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/financeiro/${String(formData.get("transactionId") ?? "")}?erro=Informe um motivo com pelo menos 5 caracteres para excluir.`);
  const db = getDb();
  const transaction = (await db.select({ id: financialTransactions.id, reference: financialTransactions.reference }).from(financialTransactions).where(eq(financialTransactions.id, parsed.data.transactionId)).limit(1))[0];
  if (!transaction) redirect("/financeiro?erro=Lancamento nao encontrado.");
  const [approvalCount] = await db.select({ total: sql<number>`count(*)` }).from(financialTransactionApprovals).where(eq(financialTransactionApprovals.transactionId, transaction.id));
  const [reversal] = await db.select({ id: financialTransactions.id }).from(financialTransactions).where(eq(financialTransactions.reversesTransactionId, transaction.id)).limit(1);
  if (Number(approvalCount.total) > 0 || reversal) redirect(`/financeiro/${transaction.id}?erro=Este lancamento possui aprovacao ou estorno e nao pode ser excluido.`);
  await writeAuditLog({ actorId: current.userId, action: "financeiro.lancamento.excluir", entityType: "financial_transaction", entityId: transaction.id, metadata: { reference: transaction.reference, reason: parsed.data.reason } });
  try {
    await db.delete(financialTransactions).where(eq(financialTransactions.id, transaction.id));
  } catch {
    redirect(`/financeiro/${transaction.id}?erro=Nao foi possivel excluir o lancamento.`);
  }
  revalidatePath("/financeiro");
  redirect("/financeiro?excluido=1");
}

export async function approveFinancialTransaction(formData: FormData) {
  const current = await requirePermission("financeiro.aprovar");
  const transactionId = idSchema.safeParse(formData.get("transactionId"));
  if (!transactionId.success) redirect("/financeiro");
  const db = getDb();
  const transaction = (await db.select().from(financialTransactions).where(eq(financialTransactions.id, transactionId.data)).limit(1))[0];
  if (!transaction) redirect(`/financeiro/${transactionId.data}?erro=Lançamento não encontrado.`);
  const existing = (await db.select().from(financialTransactionApprovals).where(and(eq(financialTransactionApprovals.transactionId, transaction.id), eq(financialTransactionApprovals.approverId, current.userId))).limit(1))[0];
  if (existing) redirect(`/financeiro/${transaction.id}?erro=Você já aprovou este lançamento.`);
  const [count] = await db.select({ total: sql<number>`count(*)` }).from(financialTransactionApprovals).where(eq(financialTransactionApprovals.transactionId, transaction.id));
  if (Number(count.total) >= transaction.requiredApprovals) redirect(`/financeiro/${transaction.id}`);
  await db.insert(financialTransactionApprovals).values({ transactionId: transaction.id, approverId: current.userId });
  await writeAuditLog({ actorId: current.userId, action: "financeiro.lancamento.aprovar", entityType: "financial_transaction", entityId: transaction.id, metadata: { approvedByAuthorizedRole: true } });
  revalidatePath("/financeiro");
  revalidatePath(`/financeiro/${transaction.id}`);
  redirect(`/financeiro/${transaction.id}?aprovado=1`);
}

export async function reverseFinancialTransaction(formData: FormData) {
  const current = await requirePermission("financeiro.criar");
  const transactionId = idSchema.safeParse(formData.get("transactionId"));
  const reason = z.string().trim().min(5).max(300).safeParse(formData.get("reason"));
  if (!transactionId.success || !reason.success) redirect(`/financeiro/${String(formData.get("transactionId") ?? "")}?erro=Informe o motivo do estorno.`);
  const db = getDb(); const original = (await db.select().from(financialTransactions).where(eq(financialTransactions.id, transactionId.data)).limit(1))[0];
  if (!original) redirect("/financeiro?erro=Lançamento não encontrado.");
  const existing = (await db.select({ id: financialTransactions.id }).from(financialTransactions).where(eq(financialTransactions.reversesTransactionId, original.id)).limit(1))[0];
  if (existing) redirect(`/financeiro/${original.id}?erro=Este lançamento já possui estorno.`);
  const reference = `EST-${brazilDateInputValue().replace(/-/g, "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const [reversal] = await db.insert(financialTransactions).values({ reference, type: original.type === "income" ? "expense" : "income", amount: original.amount, description: `Estorno de ${original.reference}: ${reason.data}`, accountId: original.accountId, categoryId: original.categoryId, createdBy: current.userId, occurredAt: new Date(), requiredApprovals: 1, reversesTransactionId: original.id }).returning({ id: financialTransactions.id });
  await writeAuditLog({ actorId: current.userId, action: "financeiro.lancamento.estornar", entityType: "financial_transaction", entityId: reversal.id, metadata: { originalTransactionId: original.id, reason: reason.data } });
  revalidatePath("/financeiro"); revalidatePath(`/financeiro/${original.id}`); redirect(`/financeiro/${reversal.id}?criado=1`);
}

export async function createFinancialCategory(formData: FormData) {
  const current = await requirePermission("financeiro.criar");
  const parsed = z.object({ name: z.string().trim().min(2).max(120), type: z.enum(["income", "expense"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/financeiro/categorias?erro=Informe nome e tipo da categoria.");
  const db = getDb(); const existing = (await db.select({ id: financialCategories.id }).from(financialCategories).where(and(eq(financialCategories.name, parsed.data.name), eq(financialCategories.type, parsed.data.type))).limit(1))[0];
  if (existing) redirect("/financeiro/categorias?erro=Esta categoria já existe para o tipo selecionado.");
  const [category] = await db.insert(financialCategories).values(parsed.data).returning({ id: financialCategories.id });
  await writeAuditLog({ actorId: current.userId, action: "financeiro.categoria.criar", entityType: "financial_category", entityId: category.id, metadata: parsed.data });
  revalidatePath("/financeiro"); revalidatePath("/financeiro/novo"); redirect("/financeiro/categorias?criado=1");
}

export async function setFinancialCategoryActive(formData: FormData) {
  const current = await requirePermission("financeiro.criar"); const id = idSchema.safeParse(formData.get("id")); const active = z.enum(["yes", "no"]).safeParse(formData.get("active"));
  if (!id.success || !active.success) redirect("/financeiro/categorias?erro=Categoria inválida.");
  await getDb().update(financialCategories).set({ active: active.data === "yes" }).where(eq(financialCategories.id, id.data));
  await writeAuditLog({ actorId: current.userId, action: "financeiro.categoria.status", entityType: "financial_category", entityId: id.data, metadata: { active: active.data === "yes" } });
  revalidatePath("/financeiro"); revalidatePath("/financeiro/novo"); redirect("/financeiro/categorias?atualizado=1");
}
