import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { asc, eq } from "drizzle-orm";
import { FinancialForm } from "@/components/financial-form";
import { createFinancialTransaction } from "../actions";
import { requirePermission } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db";
import { financialAccounts, financialCategories } from "@/lib/db/schema";
export default async function NewFinancialTransactionPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) { await requirePermission("financeiro.criar"); const { erro } = await searchParams; const db = getDb(); const [accounts, categories] = await Promise.all([db.select({ id: financialAccounts.id, name: financialAccounts.name }).from(financialAccounts).where(eq(financialAccounts.active, true)).orderBy(asc(financialAccounts.name)), db.select({ id: financialCategories.id, name: financialCategories.name, type: financialCategories.type }).from(financialCategories).where(eq(financialCategories.active, true)).orderBy(asc(financialCategories.name))]); return <main className="mx-auto max-w-3xl p-4 sm:p-7 lg:p-9"><Link href="/financeiro" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-[#7b4b2a]"><ArrowLeft size={16}/>Voltar ao financeiro</Link><header className="mb-6"><p className="text-xs font-bold uppercase tracking-widest text-[#7b4b2a]">Novo lançamento</p><h1 className="mt-1 text-2xl font-bold text-slate-800">Registrar movimentação</h1></header>{erro && <p className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-800">{erro}</p>}<FinancialForm accounts={accounts} categories={categories} action={createFinancialTransaction}/></main>; }
