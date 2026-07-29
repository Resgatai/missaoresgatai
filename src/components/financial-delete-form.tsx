"use client";

type Action = (formData: FormData) => void | Promise<void>;

export function FinancialDeleteForm({ action, transactionId }: { action: Action; transactionId: string }) {
  return <form action={action} onSubmit={(event) => { if (!window.confirm("Excluir este lan?amento definitivamente? Esta a??o n?o pode ser desfeita.")) event.preventDefault(); }} className="grid gap-3 sm:grid-cols-[1fr_auto]"><input type="hidden" name="transactionId" value={transactionId}/><input name="reason" required minLength={5} maxLength={300} className="h-11 rounded-lg border border-red-200 bg-white px-3 text-sm" placeholder="Motivo da exclus?o"/><button className="rounded-lg bg-red-700 px-4 py-3 text-sm font-bold text-white">Excluir lan?amento</button></form>;
}
