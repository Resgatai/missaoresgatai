"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export function SignOutButton() {
  return <button onClick={() => signOut({ callbackUrl: "/login" })} className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white"><LogOut size={15}/>Sair da conta</button>;
}
