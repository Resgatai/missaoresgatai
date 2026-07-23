import { and, count, eq, gte, lte, sql } from "drizzle-orm";
import { BarChart3, CalendarDays, CheckCircle2, Download, UsersRound, type LucideIcon } from "lucide-react";
import { can } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db";
import { agendaEvents, attendanceRecords, financialTransactions, members } from "@/lib/db/schema";

function bounds(inicio?: string, fim?: string) {
  const start = inicio && /^\d{4}-\d{2}-\d{2}$/.test(inicio) ? new Date(`${inicio}T00:00:00`) : new Date("2000-01-01T00:00:00Z");
  const end = fim && /^\d{4}-\d{2}-\d{2}$/.test(fim) ? new Date(`${fim}T23:59:59.999`) : undefined;
  return { start, end };
}

function dateRange(column: Parameters<typeof gte>[0], start: Date, end?: Date) {
  return end ? and(gte(column, start), lte(column, end)) : gte(column, start);
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ inicio?: string; fim?: string }> }) {
  const current = await requirePermission("relatorios.visualizar");
  const { inicio = "", fim = "" } = await searchParams;
  const { start, end } = bounds(inicio, fim);
  const db = getDb();
  const canFinance = can(current.roles, "financeiro.visualizar");
  const [memberCount, eventCount, presenceCount, financial] = await Promise.all([
    db.select({ total: count() }).from(members).where(and(eq(members.status, "active"), dateRange(members.createdAt, start, end))),
    db.select({ total: count() }).from(agendaEvents).where(dateRange(agendaEvents.startsAt, start, end)),
    db.select({ total: count() }).from(attendanceRecords).where(dateRange(attendanceRecords.recordedAt, start, end)),
    canFinance
      ? db.select({ total: sql<string>`coalesce(sum(case when ${financialTransactions.type} = 'income' then ${financialTransactions.amount} else -${financialTransactions.amount} end), 0)` }).from(financialTransactions).where(dateRange(financialTransactions.occurredAt, start, end))
      : Promise.resolve([{ total: "0" }]),
  ]);
  const cards: { label: string; value: string; Icon: LucideIcon; tone: string }[] = [
    { label: "Membros ativos", value: String(memberCount[0]?.total ?? 0), Icon: UsersRound, tone: "text-blue-700" },
    { label: "Eventos no período", value: String(eventCount[0]?.total ?? 0), Icon: CalendarDays, tone: "text-violet-700" },
    { label: "Presenças registradas", value: String(presenceCount[0]?.total ?? 0), Icon: CheckCircle2, tone: "text-emerald-700" },
  ];
  if (canFinance) cards.push({ label: "Saldo de lançamentos", value: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(financial[0]?.total ?? 0)), Icon: BarChart3, tone: "text-[#7b4b2a]" });
  const query = new URLSearchParams();
  if (inicio) query.set("inicio", inicio);
  if (fim) query.set("fim", fim);
  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-7 lg:p-9">
      <header className="mb-6"><p className="text-xs font-bold uppercase tracking-widest text-[#7b4b2a]">Indicadores</p><h1 className="mt-1 text-2xl font-bold text-slate-800">Relatórios</h1><p className="mt-1 text-sm text-slate-500">Resumo operacional conforme o período selecionado.</p></header>
      <form className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="grid gap-1 text-xs font-bold text-slate-600">Data inicial<input name="inicio" type="date" defaultValue={inicio} className="h-10 rounded-lg border border-slate-300 px-3 font-normal" /></label>
        <label className="grid gap-1 text-xs font-bold text-slate-600">Data final<input name="fim" type="date" defaultValue={fim} className="h-10 rounded-lg border border-slate-300 px-3 font-normal" /></label>
        <button className="h-10 rounded-lg bg-[#7b4b2a] px-4 text-sm font-bold text-white">Filtrar</button>
        <a href={`/api/relatorios/exportar?${query.toString()}`} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#7b4b2a] px-4 text-sm font-bold text-[#7b4b2a]"><Download size={16} />Exportar Excel</a>
      </form>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(({ label, value, Icon, tone }) => <article key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm text-slate-500">{label}</span><Icon size={18} className={tone} /></div><strong className="mt-5 block text-2xl text-slate-800">{value}</strong></article>)}</section>
    </main>
  );
}
