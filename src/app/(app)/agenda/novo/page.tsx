import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ImageUpload } from "@/components/image-upload";
import { createAgendaEvent } from "../actions";

export default async function NewAgendaEventPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const now = new Date();
  const endsAt = new Date(now.getTime() + 90 * 60 * 1000);

  return <main className="mx-auto max-w-3xl p-4 sm:p-7 lg:p-9">
    <Link href="/agenda" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-[#1769aa]"><ArrowLeft size={16}/>Voltar à agenda</Link>
    <header className="mb-6"><p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#1769aa]">Agenda e cultos</p><h1 className="text-2xl font-bold tracking-tight text-slate-800">Novo compromisso</h1><p className="mt-1.5 text-[13px] text-slate-500">Publique um culto ou evento para a igreja, ou registre um compromisso interno.</p></header>
    {erro && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{erro}</div>}
    <form action={createAgendaEvent} className="space-y-5"><section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-2 text-xs font-bold text-slate-700 sm:col-span-2">Título<input name="title" required maxLength={160} className="h-11 rounded-lg border border-slate-300 px-3 font-normal" placeholder="Ex.: Culto de celebração"/></label>
      <label className="grid gap-2 text-xs font-bold text-slate-700">Tipo<select name="kind" defaultValue="service" className="h-11 rounded-lg border border-slate-300 px-3 font-normal"><option value="service">Culto</option><option value="event">Evento</option><option value="meeting">Reunião</option></select></label>
      <label className="grid gap-2 text-xs font-bold text-slate-700">Visibilidade<select name="visibility" defaultValue="public" className="h-11 rounded-lg border border-slate-300 px-3 font-normal"><option value="public">Para a igreja</option><option value="internal">Somente equipe</option></select></label>
      <label className="grid gap-2 text-xs font-bold text-slate-700">Início<input name="startsAt" type="datetime-local" required defaultValue={now.toISOString().slice(0, 16)} className="h-11 rounded-lg border border-slate-300 px-3 font-normal"/></label>
      <label className="grid gap-2 text-xs font-bold text-slate-700">Término<input name="endsAt" type="datetime-local" defaultValue={endsAt.toISOString().slice(0, 16)} className="h-11 rounded-lg border border-slate-300 px-3 font-normal"/></label>
      <label className="grid gap-2 text-xs font-bold text-slate-700 sm:col-span-2">Local<input name="location" maxLength={160} className="h-11 rounded-lg border border-slate-300 px-3 font-normal" placeholder="Ex.: Templo principal"/></label>
      <label className="grid gap-2 text-xs font-bold text-slate-700 sm:col-span-2">Banner ou imagem do evento<ImageUpload name="imageUrl" scope="event" /></label>
      <label className="grid gap-2 text-xs font-bold text-slate-700">Capacidade (opcional)<input name="capacity" type="number" min="1" max="100000" className="h-11 rounded-lg border border-slate-300 px-3 font-normal" placeholder="Ex.: 150"/></label>
      <label className="grid gap-2 text-xs font-bold text-slate-700">Repetição<select name="recurrenceRule" defaultValue="" className="h-11 rounded-lg border border-slate-300 px-3 font-normal"><option value="">Sem repetição</option><option value="weekly">Semanal</option><option value="monthly">Mensal</option></select></label>
      <label className="flex items-center gap-2 text-sm font-bold text-slate-700 sm:col-span-2"><input name="registrationRequired" type="checkbox" className="size-4"/>Exigir inscrição antecipada</label>
      <label className="grid gap-2 text-xs font-bold text-slate-700 sm:col-span-2">Descrição<textarea name="description" maxLength={2000} rows={4} className="rounded-lg border border-slate-300 px-3 py-2 font-normal" placeholder="Informações adicionais para quem vai participar"/></label>
    </div></section><div className="flex justify-end gap-3"><Link href="/agenda" className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700">Cancelar</Link><button className="rounded-lg bg-[#1769aa] px-4 py-3 text-sm font-bold text-white">Publicar compromisso</button></div></form>
  </main>;
}
