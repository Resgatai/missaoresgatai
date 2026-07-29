import Image from "next/image";
import Link from "next/link";
import { and, asc, desc, eq, gte, isNull } from "drizzle-orm";
import { CalendarDays, PlayCircle, Radio } from "lucide-react";
import { registerForEvent } from "./(app)/mvp/actions";
import { getDb } from "@/lib/db";
import { agendaEvents, churchSettings, contentItems, radioStations } from "@/lib/db/schema";
import { mapTemporaryImageUrls } from "@/lib/firebase-storage-url";
function getYouTubeThumbnail(url: string) {
  try {
    const parsed = new URL(url);
    let videoId = parsed.searchParams.get("v");
    if (!videoId && parsed.hostname === "youtu.be") videoId = parsed.pathname.slice(1);
    if (!videoId && parsed.pathname.startsWith("/shorts/")) videoId = parsed.pathname.split("/")[2];
    if (!videoId && parsed.pathname.startsWith("/embed/")) videoId = parsed.pathname.split("/")[2];
    return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null;
  } catch {
    return null;
  }
}

export default async function PublicHome({ searchParams }: { searchParams: Promise<{ inscrito?: string; erro?: string }> }) {
  const message = await searchParams;
  const db = getDb();
  const now = new Date();
  const [settings, events, contents, radio] = await Promise.all([
    (await db.select().from(churchSettings).limit(1))[0],
    db.select().from(agendaEvents).where(and(eq(agendaEvents.visibility, "public"), isNull(agendaEvents.canceledAt), gte(agendaEvents.startsAt, now))).orderBy(asc(agendaEvents.startsAt)).limit(6),
    db.select().from(contentItems).where(eq(contentItems.visible, true)).orderBy(desc(contentItems.publishedAt)).limit(6),
    (await db.select().from(radioStations).where(eq(radioStations.active, true)).limit(1))[0],
  ]);
  const name = settings?.churchName || "Missao Resgatai";
  const upcomingEvents = events;
  const imageUrls = await mapTemporaryImageUrls(upcomingEvents);

  return <main className="min-h-screen bg-[#fffdf6] text-[#2d2926]">
    <header className="border-b border-[#eadfce] bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <Link href="/" className="flex items-center gap-3"><Image src="/logo-resgatai.png" alt="Missao Resgatai" width={48} height={48} className="size-12 rounded-full object-cover"/><span className="font-bold text-[#7b4b2a]">{name}</span></Link>
        <nav className="flex flex-wrap items-center justify-end gap-3 text-sm font-bold text-stone-600"><Link href="#agenda">Agenda</Link><Link href="#conteudos">Conteudos</Link><Link href="/cadastro-membro">Cadastro</Link><Link href="/login" className="rounded-lg bg-[#7b4b2a] px-3 py-2 text-white">Entrar</Link></nav>
      </div>
    </header>

    <section className="bg-[radial-gradient(circle_at_top,#f8ef83,#e9d33b_35%,#7b4b2a_130%)] px-5 py-20">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-[#7b4b2a]">Cuidar, conectar e servir</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-[#2d2926] sm:text-6xl">{settings?.slogan || "Uma igreja mais proxima de cada pessoa."}</h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-[#5d402b]">Acompanhe nossa programacao, ouca conteudos e faca seu cadastro.</p>
        <div className="mt-8 flex flex-wrap gap-3"><Link href="#agenda" className="rounded-lg bg-[#7b4b2a] px-5 py-3 text-sm font-bold text-white">Ver programacao</Link><Link href="/cadastro-membro" className="rounded-lg border border-[#7b4b2a] px-5 py-3 text-sm font-bold text-[#7b4b2a]">Fazer cadastro</Link></div>
      </div>
    </section>

    {message.inscrito && <p className="mx-auto mt-5 max-w-6xl rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Inscricao recebida com sucesso.</p>}
    {message.erro && <p className="mx-auto mt-5 max-w-6xl rounded-lg bg-red-50 p-3 text-sm text-red-800">{message.erro}</p>}

    <section id="agenda" className="mx-auto max-w-6xl px-5 py-14">
      <div className="flex items-center gap-3"><CalendarDays className="text-[#7b4b2a]"/><div><p className="text-xs font-bold uppercase tracking-widest text-[#7b4b2a]">Programacao</p><h2 className="mt-1 text-3xl font-bold">Proximos eventos</h2></div></div>
      <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {upcomingEvents.map((event) => { const imageUrl = imageUrls.get(event.id); return <article key={event.id} className="overflow-hidden rounded-xl border border-[#eadfce] bg-white shadow-sm">
          {imageUrl && <Image src={imageUrl} alt={event.title} width={640} height={360} unoptimized className="h-40 w-full bg-[#fffdf6] object-contain" />}
          <div className="p-5">
            <p className="text-sm font-bold text-[#7b4b2a]">{new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "full", timeStyle: "short" }).format(event.startsAt)}</p>
            <h3 className="mt-3 text-lg font-bold">{event.title}</h3>
            {event.location && <p className="mt-2 text-sm text-stone-500">{event.location}</p>}
            {event.description && <p className="mt-3 text-sm leading-6 text-stone-600">{event.description}</p>}
            {event.registrationRequired && <form action={registerForEvent} className="mt-4 space-y-2 border-t border-stone-100 pt-4"><input type="hidden" name="eventId" value={event.id}/><input name="visitorName" required className="h-9 w-full rounded-md border border-stone-300 px-2 text-xs" placeholder="Seu nome"/><input name="visitorEmail" type="email" className="h-9 w-full rounded-md border border-stone-300 px-2 text-xs" placeholder="Seu e-mail"/><button className="w-full rounded-md bg-[#7b4b2a] py-2 text-xs font-bold text-white">Inscrever-se</button></form>}
          </div>
        </article>; })}
        {!upcomingEvents.length && <p className="text-sm text-stone-500">Em breve divulgaremos os proximos eventos.</p>}
      </div>
    </section>

    <section id="conteudos" className="border-y border-[#eadfce] bg-white px-5 py-14">
      <div className="mx-auto max-w-6xl"><div className="flex items-center gap-3"><PlayCircle className="text-[#7b4b2a]"/><div><p className="text-xs font-bold uppercase tracking-widest text-[#7b4b2a]">Edificacao</p><h2 className="mt-1 text-3xl font-bold">Conteudos recentes</h2></div></div><div className="mt-7 grid gap-4 md:grid-cols-3">{contents.map((content) => { const thumbnail = content.type === "video" ? getYouTubeThumbnail(content.url) : null; return <a key={content.id} href={content.url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl border border-[#eadfce] bg-white transition hover:border-[#7b4b2a]">{thumbnail && <Image src={thumbnail} alt={`Capa do vídeo: ${content.title}`} width={640} height={360} unoptimized className="h-40 w-full object-cover" />}<div className="p-5"><p className="text-xs font-bold uppercase text-[#7b4b2a]">{content.type}</p><h3 className="mt-2 font-bold">{content.title}</h3>{content.description && <p className="mt-2 text-sm leading-6 text-stone-500">{content.description}</p>}</div></a>; })}</div>{radio && <div className="mt-8 rounded-xl bg-[#2d2926] p-5 text-white"><div className="flex items-center gap-3"><Radio className="text-[#e9d33b]"/><div><h3 className="font-bold">{radio.name}</h3><p className="text-sm text-stone-300">Ouca nossa radio.</p></div></div><audio controls preload="none" className="mt-4 w-full"><source src={radio.streamUrl}/></audio></div>}</div>
    </section>

    <footer className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 px-5 py-8 text-sm text-stone-500"><span>{name}</span><span>{settings?.address || settings?.phone || settings?.email || ""}</span><span><Link href="/privacidade">Privacidade</Link> · <Link href="/termos">Termos</Link></span></footer>
  </main>;
}
