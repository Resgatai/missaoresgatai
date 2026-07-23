"use client";

import { Eye, EyeOff } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

export function LoginForm({ callbackUrl = "/painel" }: { callbackUrl?: string }) {
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  async function submit(data: FormData) {
    setError("");
    const result = await signIn("credentials", { identifier: data.get("identifier"), password: data.get("password"), callbackUrl, redirect: false });
    if (result?.error) { setError("Não foi possível entrar. Verifique suas credenciais."); return; }
    window.location.assign(callbackUrl);
  }
  return <form action={submit} className="mt-6 space-y-4"><label className="grid gap-2 text-xs font-bold text-slate-700">E-mail ou usuário<input name="identifier" required autoComplete="username" className="h-11 rounded-lg border border-slate-300 px-3 font-normal outline-none focus:border-[#1769aa]" placeholder="voce@igreja.org"/></label><label className="grid gap-2 text-xs font-bold text-slate-700">Senha<span className="relative"><input name="password" required type={showPassword ? "text" : "password"} autoComplete="current-password" className="h-11 w-full rounded-lg border border-slate-300 px-3 pr-11 font-normal outline-none focus:border-[#1769aa]" placeholder="Sua senha"/><button type="button" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-3 text-slate-500">{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></span></label><div className="text-right text-xs text-slate-500"><Link className="font-bold text-[#1769aa]" href="/recuperar-senha">Esqueci minha senha</Link></div><button className="block w-full rounded-lg bg-[#1769aa] py-3 text-center text-xs font-bold text-white">Entrar na plataforma</button>{error && <p className="text-xs text-red-700">{error}</p>}<p className="text-center text-[11px] leading-5 text-slate-500">Ao entrar, você concorda com a <a className="font-bold text-[#1769aa]" href="/privacidade">política de privacidade</a> e os <a className="font-bold text-[#1769aa]" href="/termos">termos de uso</a>.</p></form>;
}
