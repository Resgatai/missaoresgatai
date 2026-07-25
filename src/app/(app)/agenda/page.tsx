import Image from "next/image";
import Link from "next/link";
import { and, asc, eq, gte, isNull } from "drizzle-orm";
import { CalendarDays, MapPin, Plus, ShieldCheck } from "lucide-react";
import { AgendaEventActions } from "@/components/agenda-event-actions";
import { can } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db";
import { agendaEvents } from "@/lib/db/schema";
import { mapTemporaryImageUrls } from "@/lib/firebase-storage-url";

const labels = { service: "Culto", event: "Evento", meeting: "Reuniao" } as const;

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ criado?: string; atualizado?: string; arquivado?: string; erro?: string }> }) {
  const current = await requirePermission("eventos.visualizar");
  const messages = await searchParams;
  const managesAgenda = can(current.roles, "eventos.gerenciar");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const db = getDb();
  const events = managesAgenda
    ? await db.select().from(agendaEvents).where(and(gte(agendaEvents.startsAt, today), isNull(agendaEvents.canceledAt))).orderBy(asc(agendaEvents.startsAt)).limit(100)
    : await db.select().from(agendaEvents).where(and(gte(agendaEvents.startsAt, today), eq(agendaEvents.visibility, "public"), isNull(agendaEvents.canceledAt))).orderBy(asc(agendaEvents.startsAt)).limit(100);
  const imageUrls = await mapTemporaryImageUrls(events);

  return <main className="mx-auto max-w-5xl p-4 sm:p-7 lg:p-9"><div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#7b4b2a]">Vida da igreja</p><h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-[28px]">Agenda e cultos</h1><p className="mt-1.5 text-[13px] text-slate-500">Acompanhe os proximos cultos, reunioes e eventos.</p></div>{managesAgenda && <Link href="/agenda/novo" className="inline-flex items-center gap-2 rounded-lg bg-[#7b4b2a] px-4 py-3 text-sm font-bold text-white"><Plus size={16}/>Novo compromisso</Link>}</div>{messages.criado && <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Compromisso incluido na agenda.</div>}{messages.atualizado && <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Compromisso atualizado.</div>}{messages.arquivado && <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Evento excluido da agenda.</div>}{messages.erro && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{messages.erro}</div>}{!managesAgenda && <div className="mb-5 flex items-center gap-3 rounded-xl border border-[#e9d33b] bg-[#fff6c8] px-4 py-3 text-sm text-[#5d402b]"><ShieldCheck size={18}/><span>Voce ve somente os compromissos publicados para a igreja.</span></div>}<section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">{events.length === 0 ? <div className="grid min-h-64 place-items-center p-8 text-center"><div><CalendarDays className="mx-auto text-slate-300" size={36}/><h2 className="mt-3 font-bold text-slate-800">Nenhum compromisso proximo</h2><p className="mt-1 text-sm text-slate-500">Os proximos cultos e eventos aparecerao aqui.</p></div></div> : <div className="divide-y divide-slate-100">{events.map((event) => { const imageUrl = imageUrls.get(event.id); return <article key={event.id} className="grid gap-4 p-5 sm:grid-cols-[160px_1fr] sm:p-6">{imageUrl ? <Image src={imageUrl} alt={event.title} width={320} height={180} unoptimized className="h-36 w-full rounded-lg bg-[#fffdf6] object-contain sm:h-full" /> : <div className="grid h-36 place-items-center rounded-lg bg-[#fff6c8] text-[#7b4b2a]"><CalendarDays size={28}/></div>}<div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">{labels[event.kind]}</span>{managesAgenda && event.visibility === "internal" && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">Interno</span>}</div><h2 className="mt-2 text-base font-bold text-slate-800">{event.title}</h2><p className="mt-1 text-sm text-slate-500">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeStyle: "short" }).format(event.startsAt)}</p>{event.location && <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600"><MapPin size={15}/>{event.location}</p>}{event.description && <p className="mt-3 text-sm leading-6 text-slate-600">{event.description}</p>}{managesAgenda && <AgendaEventActions eventId={event.id}/>}</div></article>; })}</div>}</section></main>;
}