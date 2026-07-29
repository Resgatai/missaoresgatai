"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  CheckSquare,
  Church,
  ClipboardList,
  HeartHandshake,
  Landmark,
  LayoutDashboard,
  Megaphone,
  Menu,
  Radio,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SignOutButton } from "./sign-out-button";
import { ThemeToggle } from "./theme-toggle";

const links = [
  ["Visão geral", "/painel", LayoutDashboard, "painel.visualizar", "Principal"],
  ["Membros", "/membros", Users, "membros.visualizar", "Principal"],
  ["Famílias", "/familias", Users, "familias.gerenciar", "Principal"],
  ["Agenda e cultos", "/agenda", CalendarDays, "eventos.visualizar", "Principal"],
  ["Presenças", "/presencas", CheckSquare, "presenca.visualizar", "Principal"],
  ["Escalas", "/escalas", ClipboardList, "escalas.visualizar", "Principal"],
  ["Mural", "/mural", Megaphone, "painel.visualizar", "Comunicação"],
  ["Conteúdos", "/conteudos", BookOpen, "painel.visualizar", "Comunicação"],
  ["Rádio", "/radio", Radio, "painel.visualizar", "Comunicação"],
  ["Orações", "/oracoes", HeartHandshake, "oracao.gerenciar", "Comunicação"],
  ["Notificações", "/notificacoes", Bell, "painel.visualizar", "Comunicação"],
  ["Relatórios", "/relatorios", ChartNoAxesCombined, "relatorios.visualizar", "Administração"],
  ["Financeiro", "/financeiro", Landmark, "financeiro.visualizar", "Administração"],
  ["Usuários", "/usuarios", Users, "usuarios.gerenciar", "Administração"],
  ["Sessões e escopos", "/usuarios/escopos", ShieldCheck, "usuarios.gerenciar", "Administração"],
  ["Departamentos", "/departamentos", Church, "departamentos.visualizar", "Administração"],
  ["Auditoria", "/auditoria", ShieldCheck, "auditoria.visualizar", "Administração"],
  ["Configurações", "/configuracoes", Settings, "configuracoes.gerenciar", "Administração"],
] as const;

export function AppShell({ children, userName, roleName, permissions }: { children: React.ReactNode; userName: string; roleName: string; permissions: string[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const visible = links.filter(([, , , permission]) => permissions.includes("*") || permissions.includes(permission));

  return (
    <div className="min-h-screen bg-[#fffdf6] lg:grid lg:grid-cols-[268px_1fr]">
      <aside className={`fixed inset-y-0 left-0 z-30 w-[268px] overflow-y-auto bg-[#2d2926] px-3.5 py-6 text-stone-200 transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-8 flex items-center gap-3 px-2">
          <Image src="/logo-resgatai.png" alt="Missão Resgatai" width={46} height={46} className="size-11 rounded-full border border-[#e9d33b]/60 object-cover" />
          <div>
            <strong className="block text-[15px] text-white">Missão Resgatai</strong>
            <small className="text-[10px] tracking-widest text-[#e9d33b]">GESTÃO DE IGREJA</small>
          </div>
        </div>
        {["Principal", "Comunicação", "Administração"].map((section) => (
          <div key={section} className="mb-5">
            <p className="mb-2 px-2.5 text-[10px] font-bold uppercase tracking-[.12em] text-stone-500">{section}</p>
            {visible.filter(([, , , , group]) => group === section).map(([label, href, Icon]) => (
              <Link key={href} onClick={() => setOpen(false)} href={href} className={`mb-1 flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] transition ${pathname === href ? "bg-[#7b4b2a] text-white" : "text-stone-300 hover:bg-white/10 hover:text-white"}`}>
                <Icon size={17} />{label}
              </Link>
            ))}
          </div>
        ))}
        <div className="mt-8 border-t border-white/10 px-2 pt-5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-full bg-[#e9d33b] text-xs font-bold text-[#2d2926]">{userName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
            <div><strong className="block text-xs text-white">{userName}</strong><span className="text-[11px] text-stone-400">{roleName}</span></div>
          </div>
          <SignOutButton />
        </div>
      </aside>
      {open && <button aria-label="Fechar menu" onClick={() => setOpen(false)} className="fixed inset-0 z-20 bg-stone-950/45 lg:hidden" />}
      <section className="lg:col-start-2">
        <header className="flex h-[58px] items-center justify-between border-b border-[#eadfce] bg-white px-4 text-sm text-stone-500 lg:h-[74px] lg:px-9">
          <button onClick={() => setOpen(!open)} className="lg:hidden" aria-label="Abrir menu">{open ? <X /> : <Menu />}</button>
          <span className="hidden lg:block">Painel administrativo</span>
          <strong className="lg:hidden text-[#7b4b2a]">Missão Resgatai</strong>
          <div className="flex items-center gap-2"><ThemeToggle /><Link href="/notificacoes" aria-label="Notificações"><Bell size={19} /></Link></div>
        </header>
        {children}
      </section>
    </div>
  );
}
