"use client";

import Link from "next/link";
import { archiveAgendaEvent } from "@/app/(app)/agenda/actions";

export function AgendaEventActions({ eventId }: { eventId: string }) {
  return <div className="mt-4 flex flex-wrap gap-2"><Link href={`/agenda/${eventId}/editar`} className="rounded-lg border border-[#7b4b2a] px-3 py-2 text-xs font-bold text-[#7b4b2a]">Editar</Link><form action={archiveAgendaEvent} onSubmit={(event) => { if (!window.confirm("Arquivar este evento? Ele deixara de aparecer na agenda, mas permanecera no historico.")) event.preventDefault(); }}><input type="hidden" name="id" value={eventId}/><button type="submit" className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700">Excluir</button></form></div>;
}