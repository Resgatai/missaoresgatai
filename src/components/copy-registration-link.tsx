"use client";

import { Copy } from "lucide-react";
import { useState } from "react";

export function CopyRegistrationLink() {
  const [copied, setCopied] = useState(false);
  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/cadastro-membro`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }
  return <button type="button" onClick={copyLink} className="inline-flex items-center gap-2 rounded-lg border border-[#7b4b2a] px-3 py-2.5 text-sm font-bold text-[#7b4b2a]"><Copy size={16} />{copied ? "Link copiado" : "Copiar link de cadastro"}</button>;
}
