import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MapPin, MessageCircle, UserRound } from "lucide-react";
import { eq } from "drizzle-orm";
import { archiveMember } from "../actions";
import { can } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/authorization";
import { getDb } from "@/lib/db";
import { members } from "@/lib/db/schema";
import { decryptSensitiveText } from "@/lib/security/encryption";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";

const labels: Record<string, string> = { visitor: "Visitante", new_convert: "Novo convertido", congregant: "Congregado", active: "Membro ativo", inactive: "Afastado", transferred: "Transferido", dismissed: "Desligado", deceased: "Falecido", follow_up: "Em acompanhamento" };

export default async function MemberDetails({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ atualizado?: string; erro?: string }> }) {
  const current = await requirePermission("membros.visualizar");
  const { id } = await params;
  const message = await searchParams;
  const member = (await getDb().select().from(members).where(eq(members.id, id)).limit(1))[0];
  if (!member) notFound();
  const notes = member.notesEncrypted ? decryptSensitiveText(member.notesEncrypted) : member.notes;
  const initials = member.fullName.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  const canEdit = current.permissions.includes("*") || current.permissions.includes("membros.editar") || can(current.roles, "membros.editar");
  const mobile = member.mobilePhone || member.whatsapp;
  return <main className="mx-auto max-w-4xl p-4 sm:p-7 lg:p-9"><Link href="/membros" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-[#1769aa]"><ArrowLeft size={16}/>Voltar para membros</Link>{message.atualizado && <p className="mb-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Cadastro atualizado.</p>}{message.erro && <p className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-800">{message.erro}</p>}<section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-4"><span className="grid size-16 place-items-center rounded-full bg-blue-50 text-lg font-bold text-[#1769aa]">{initials}</span><div><p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#1769aa]">Cadastro de membro</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800">{member.fullName}</h1><span className="mt-2 inline-block rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-[#1769aa]">{labels[member.status]}</span></div></div>{canEdit && <div className="flex gap-2"><Link href={`/membros/${member.id}/editar`} className="rounded-lg border border-[#1769aa] px-3 py-2 text-sm font-bold text-[#1769aa]">Editar</Link><form action={archiveMember}><input type="hidden" name="id" value={member.id}/><ConfirmSubmitButton message="Arquivar este membro? O histórico será preservado." className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-700">Arquivar</ConfirmSubmitButton></form></div>}</div><div className="mt-8 grid gap-6 border-t border-slate-100 pt-6 sm:grid-cols-2"><section><h2 className="mb-4 text-sm font-bold text-slate-800">Contato</h2><div className="space-y-3 text-sm text-slate-600"><p className="flex items-center gap-3"><Mail size={16} className="text-slate-400"/>{member.email || "E-mail não informado"}</p><p className="flex items-center gap-3"><MessageCircle size={16} className="text-slate-400"/>{mobile || "Celular não informado"}</p></div></section><section><h2 className="mb-4 text-sm font-bold text-slate-800">Informações</h2><div className="space-y-3 text-sm text-slate-600"><p className="flex items-center gap-3"><MapPin size={16} className="text-slate-400"/>{[member.city, member.state].filter(Boolean).join(" · ") || "Cidade não informada"}</p><p className="flex items-center gap-3"><UserRound size={16} className="text-slate-400"/>Nascimento: {member.birthDate || "Não informado"}</p><p>Entrada: {member.entryDate || "Não informada"}</p></div></section></div>{notes && <section className="mt-6 border-t border-slate-100 pt-6"><h2 className="mb-3 text-sm font-bold text-slate-800">Observações</h2><p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">{notes}</p></section>}</section></main>;
}
