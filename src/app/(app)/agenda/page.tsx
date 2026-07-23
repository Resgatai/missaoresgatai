import Link from "next/link";
import { and, asc, eq, gte } from "drizzle-orm";
import { CalendarDays, MapPin, Plus, ShieldCheck } from "lucide-react";
import { can } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db";
import { agendaEvents } from "@/lib/db/schema";

const labels = { service: "Culto", event: "Evento", meeting: "Reunião" } as const;

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ criado?: string }> }) {
  const current = await requirePermission("eventos.visualizar");
  const { criado } = await searchParams;
  const managesAgenda = can(current.roles, "eventos.gerenciar");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const db = getDb();
  const events = managesAgenda
    ? await db.select().from(agendaEvents).where(gte(agendaEvents.startsAt, today)).orderBy(asc(agendaEvents.startsAt)).limit(100)
    : await db.select().from(agendaEvents).where(and(gte(agendaEvents.startsAt, today), eq(agendaEvents.visibility, "public"))).orderBy(asc(agendaEvents.startsAt)).limit(100);

  return <main className="mx-auto max-w-5xl p-4 sm:p-7 lg:p-9"><div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#1769aa]">Vida da igreja</p><h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-[28px]">Agenda e cultos</h1><p className="mt-1.5 text-[13px] text-slate-500">Acompanhe os próximos cultos, reuniões e eventos.</p></div>{managesAgenda && <Link href="/agenda/novo" className="inline-flex items-center gap-2 rounded-lg bg-[#1769aa] px-4 py-3 text-sm font-bold text-white"><Plus size={16}/>Novo compromisso</Link>}</div>{criado && <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Compromisso incluído na agenda.</div>}{!managesAgenda && <div className="mb-5 flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900"><ShieldCheck size={18}/><span>Você vê somente os compromissos publicados para a igreja.</span></div>}<section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">{events.length === 0 ? <div className="grid min-h-64 place-items-center p-8 text-center"><div><CalendarDays className="mx-auto text-slate-300" size={36}/><h2 className="mt-3 font-bold text-slate-800">Nenhum compromisso próximo</h2><p className="mt-1 text-sm text-slate-500">Os próximos cultos e eventos aparecerão aqui.</p></div></div> : <div className="divide-y divide-slate-100">{events.map((event) => <article key={event.id} className="flex gap-4 p-5 sm:p-6"><div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-blue-50 text-center text-[#1769aa]"><span className="text-xl font-bold leading-none">{new Intl.DateTimeFormat("pt-BR", { day: "2-digit" }).format(event.startsAt)}</span><span className="text-[10px] font-bold uppercase">{new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(event.startsAt).replace(".", "")}</span></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">{labels[event.kind]}</span>{managesAgenda && event.visibility === "internal" && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">Interno</span>}</div><h2 className="mt-2 text-base font-bold text-slate-800">{event.title}</h2><p className="mt-1 text-sm text-slate-500">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeStyle: "short" }).format(event.startsAt)}</p>{event.location && <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600"><MapPin size={15}/>{event.location}</p>}{event.description && <p className="mt-3 text-sm leading-6 text-slate-600">{event.description}</p>}</div></article>)}</div>}</section></main>;
}
