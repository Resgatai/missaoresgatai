"use client";

import { useState } from "react";
import { brazilDateTimeInputValue } from "@/lib/timezone";

type Category = { id: string; name: string; type: "income" | "expense" };
type InitialValues = { transactionId?: string; type?: "income" | "expense"; amount?: string; description?: string; accountId?: string; categoryId?: string; occurredAt?: string };

export function FinancialForm({ accounts, categories, action, initial, submitLabel = "Criar lan?amento" }: { accounts: { id: string; name: string }[]; categories: Category[]; action: (formData: FormData) => void | Promise<void>; initial?: InitialValues; submitLabel?: string }) {
  const [type, setType] = useState<"income" | "expense">(initial?.type ?? "income");
  const filtered = categories.filter((category) => category.type === type);
  return <form action={action} className="space-y-5">
    {initial?.transactionId && <input type="hidden" name="transactionId" value={initial.transactionId}/>}
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-2 text-xs font-bold text-slate-700">Tipo<select name="type" value={type} onChange={(event) => setType(event.target.value as "income" | "expense")} className="h-11 rounded-lg border border-slate-300 px-3 font-normal"><option value="income">Entrada</option><option value="expense">Sa?da</option></select></label>
      <label className="grid gap-2 text-xs font-bold text-slate-700">Valor (R$)<input name="amount" required inputMode="decimal" defaultValue={initial?.amount ?? ""} className="h-11 rounded-lg border border-slate-300 px-3 font-normal" placeholder="0,00"/></label>
      <label className="grid gap-2 text-xs font-bold text-slate-700 sm:col-span-2">Descri??o<input name="description" required maxLength={500} defaultValue={initial?.description ?? ""} className="h-11 rounded-lg border border-slate-300 px-3 font-normal" placeholder="Resumo administrativo do lan?amento"/></label>
      <label className="grid gap-2 text-xs font-bold text-slate-700">Conta<select name="accountId" required defaultValue={initial?.accountId ?? ""} className="h-11 rounded-lg border border-slate-300 px-3 font-normal">{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
      <label className="grid gap-2 text-xs font-bold text-slate-700">Categoria<select name="categoryId" required defaultValue={initial?.categoryId ?? ""} className="h-11 rounded-lg border border-slate-300 px-3 font-normal" key={type}>{filtered.length ? filtered.map((category) => <option key={category.id} value={category.id}>{category.name}</option>) : <option value="">Cadastre uma categoria</option>}</select></label>
      <label className="grid gap-2 text-xs font-bold text-slate-700">Data e hor?rio<input name="occurredAt" type="datetime-local" required defaultValue={initial?.occurredAt ?? brazilDateTimeInputValue()} className="h-11 rounded-lg border border-slate-300 px-3 font-normal"/></label>
    </div></section><div className="flex justify-end gap-3"><button className="rounded-lg bg-[#7b4b2a] px-4 py-3 text-sm font-bold text-white">{submitLabel}</button></div>
  </form>;
}
