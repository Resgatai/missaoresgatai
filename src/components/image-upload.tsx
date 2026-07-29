"use client";

import { useState } from "react";
import Image from "next/image";

export function ImageUpload({ name, scope, currentValue = "" }: { name: string; scope: "logo" | "member" | "event"; currentValue?: string }) {
  const [value, setValue] = useState(currentValue);
  const [preview, setPreview] = useState(currentValue.startsWith("http") || currentValue.startsWith("/api/uploads/image/") ? currentValue : "");
  const [message, setMessage] = useState("");

  async function upload(file?: File) {
    if (!file) return;
    setMessage("Enviando imagem...");
    const data = new FormData();
    data.set("scope", scope);
    data.set("file", file);
    try {
      const result = await fetch("/api/uploads/image", { method: "POST", body: data });
      const body = await result.json() as { path?: string; url?: string; error?: string };
      if (!result.ok || !body.path || !body.url) {
        setMessage(body.error || "Não foi possível enviar.");
        return;
      }
      setValue(body.path);
      setPreview(body.url);
      setMessage("Imagem enviada.");
    } catch {
      setMessage("Não foi possível conectar ao serviço de imagens.");
    }
  }

  return <div className="grid gap-2">
    <input type="hidden" name={name} value={value}/>
    <input type="file" accept="image/png,image/jpeg" onChange={(event) => upload(event.target.files?.[0])} className="block text-sm"/>
    {preview && <Image src={preview} alt="Prévia" width={80} height={80} unoptimized className="size-20 rounded-lg border bg-[#fffdf6] object-contain"/>}
    <small className="text-xs text-slate-500">PNG ou JPEG, até 5 MB. {message}</small>
  </div>;
}
