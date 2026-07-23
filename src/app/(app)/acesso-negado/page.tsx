import Link from "next/link";

export default function AccessDeniedPage() {
  return <main className="mx-auto grid min-h-[70vh] max-w-xl place-items-center p-6 text-center"><div><p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#1769aa]">Acesso protegido</p><h1 className="mt-2 text-2xl font-bold text-slate-800">Você não tem permissão para esta área</h1><p className="mt-3 text-sm leading-6 text-slate-500">Se precisar acessar este recurso, solicite a liberação ao administrador da igreja.</p><Link href="/painel" className="mt-6 inline-block rounded-lg bg-[#1769aa] px-4 py-3 text-sm font-bold text-white">Voltar ao painel</Link></div></main>;
}
