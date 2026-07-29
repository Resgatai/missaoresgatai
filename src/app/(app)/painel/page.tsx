import Link from "next/link";
import { and, asc, eq, gte, lte, or, sql } from "drizzle-orm";
import { CalendarPlus, CalendarDays, ClipboardList, UsersRound } from "lucide-react";
import { can } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db";
import { startOfBrazilDay } from "@/lib/timezone";
import { agendaEvents, members, serviceAssignments } from "@/lib/db/schema";

const labels = { service: "Culto", event: "Evento", meeting: "Reunião" } as const;

export default async function Dashboard() {
  const current = await requirePermission("painel.visualizar");
  const canViewMembers = can(current.roles, "membros.visualizar");
  const canViewSchedules = can(current.roles, "escalas.visualizar");
  const canManageEvents = can(current.roles, "eventos.gerenciar");
  const db = getDb();
  const now = new Date();
  const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);


  const beginningOfToday = startOfBrazilDay(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date()));

  const [activeMembers, recentVisitors, upcomingEvents, upcomingAssignments] = await Promise.all([
    canViewMembers ? db.select({ total: sql<number>`count(*)` }).from(members).where(eq(members.status, "active")) : Promise.resolve([{ total: 0 }]),
    canViewMembers ? db.select({ total: sql<number>`count(*)` }).from(members).where(and(or(eq(members.status, "visitor"), eq(members.status, "new_convert")), gte(members.createdAt, new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)))) : Promise.resolve([{ total: 0 }]),
    db.select().from(agendaEvents).where(canManageEvents ? and(gte(agendaEvents.startsAt, beginningOfToday), lte(agendaEvents.startsAt, inSevenDays)) : and(gte(agendaEvents.startsAt, beginningOfToday), lte(agendaEvents.startsAt, inSevenDays), eq(agendaEvents.visibility, "public"))).orderBy(asc(agendaEvents.startsAt)).limit(5),
    canViewSchedules ? db.select({ total: sql<number>`count(*)` }).from(serviceAssignments).where(and(gte(serviceAssignments.scheduledAt, beginningOfToday), lte(serviceAssignments.scheduledAt, inSevenDays))) : Promise.resolve([{ total: 0 }]),
  ]);

  const metrics = [
    ...(canViewMembers ? [["Membros ativos", String(activeMembers[0]?.total ?? 0), UsersRound, "bg-blue-50 text-blue-700"], ["Visitantes recentes", String(recentVisitors[0]?.total ?? 0), UsersRound, "bg-amber-50 text-amber-700"]] as const : []),
    ["Próximos compromissos", String(upcomingEvents.length), CalendarDays, "bg-violet-50 text-violet-700"] as const,
    ...(canViewSchedules ? [["Pessoas escaladas", String(upcomingAssignments[0]?.total ?? 0), ClipboardList, "bg-emerald-50 text-emerald-700"]] as const : []),
  ];

  return <main className="mx-auto max-w-[1440px] p-4 sm:p-7 lg:p-9"><div className="mb-7 flex items-end justify-between gap-4"><div><p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#1769aa]">Painel administrativo</p><h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-[28px]">Visão geral</h1><p className="mt-1.5 text-[13px] text-slate-500">Informações atualizadas da Missão Resgatai.</p></div>{canManageEvents && <Link href="/agenda/novo" className="inline-flex items-center gap-2 rounded-lg bg-[#1769aa] px-3.5 py-2.5 text-xs font-bold text-white"><CalendarPlus size={16}/><span className="hidden sm:inline">Novo compromisso</span></Link>}</div><section className={`mb-5 grid grid-cols-2 gap-3 ${metrics.length > 2 ? "lg:grid-cols-4" : "lg:grid-cols-2"}`}>{metrics.map(([title, value, Icon, tone]) => <article key={title} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-[18px]"><div className="flex items-center justify-between text-xs text-slate-500"><span>{title}</span><span className={`grid size-8 place-items-center rounded-lg ${tone}`}><Icon size={16}/></span></div><strong className="mt-3 block text-xl tracking-tight text-slate-800 sm:text-2xl">{value}</strong><span className="text-[11px] font-bold text-slate-500">Nos próximos 7 dias</span></article>)}</section><section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><header className="mb-4 flex justify-between"><div><h2 className="text-[15px] font-bold text-slate-800">Próximos cultos e eventos</h2><p className="mt-1 text-xs text-slate-500">Programação dos próximos sete dias</p></div><Link className="text-xs font-bold text-[#1769aa]" href="/agenda">Ver agenda</Link></header>{upcomingEvents.length === 0 ? <div className="grid min-h-40 place-items-center text-center"><div><CalendarDays className="mx-auto text-slate-300" size={28}/><p className="mt-3 text-sm text-slate-500">Nenhum compromisso previsto para os próximos sete dias.</p></div></div> : <div>{upcomingEvents.map((event) => <div key={event.id} className="grid grid-cols-[52px_1fr_auto] items-center gap-3 border-t border-slate-100 py-3 first:border-0 first:pt-0"><span className="rounded-lg bg-blue-50 p-2 text-center text-[10px] font-bold text-[#1769aa]">{new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "short" }).format(event.startsAt).replace(".", "")}</span><div><h3 className="text-xs font-bold text-slate-800">{event.title}</h3><p className="mt-1 text-[11px] text-slate-500">{new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", hour: "2-digit", minute: "2-digit" }).format(event.startsAt)}{event.location ? ` · ${event.location}` : ""}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${event.visibility === "internal" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{event.visibility === "internal" ? "Equipe" : labels[event.kind]}</span></div>)}</div>}</section></main>;
}
