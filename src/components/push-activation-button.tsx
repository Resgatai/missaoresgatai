"use client";

import { useState } from "react";

function webConfig() {
  let parsed: Record<string, string> = {};
  const raw = process.env.NEXT_PUBLIC_FIREBASE_CONFIG;
  if (raw) {
    try { parsed = JSON.parse(raw) as Record<string, string>; } catch { parsed = {}; }
  }
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || parsed.apiKey || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || parsed.authDomain || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || parsed.projectId || "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || parsed.storageBucket || "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || parsed.messagingSenderId || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || parsed.appId || "",
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || parsed.measurementId,
  };
}

export function PushActivationButton() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function enable() {
    if (busy) return;
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
      setMessage("Este navegador não suporta notificações push.");
      return;
    }
    const config = webConfig();
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!config.apiKey || !config.projectId || !config.messagingSenderId || !config.appId || !vapidKey) {
      setMessage("Notificações serão ativadas após a configuração do Firebase.");
      return;
    }
    setBusy(true);
    setMessage("Solicitando permissão...");
    try {
      const { initializeApp, getApps } = await import("firebase/app");
      const { getMessaging, getToken } = await import("firebase/messaging");
      const app = getApps()[0] || initializeApp(config);
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage("Permissão de notificações não concedida.");
        return;
      }
      const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
      const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: registration });
      if (!token) throw new Error("Token FCM vazio");
      const result = await fetch("/api/notificacoes/dispositivo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
      setMessage(result.ok ? "Notificações ativadas neste dispositivo." : "Não foi possível salvar este dispositivo.");
    } catch {
      setMessage("Este navegador não suporta notificações ou o Firebase não está pronto.");
    } finally {
      setBusy(false);
    }
  }

  return <div>
    <button type="button" disabled={busy} onClick={enable} className="rounded-lg border border-[#7b4b2a] px-3 py-2 text-xs font-bold text-[#7b4b2a] disabled:cursor-wait disabled:opacity-60">{busy ? "Ativando..." : "Ativar notificações"}</button>
    {message && <p className="mt-2 text-xs text-slate-500" role="status">{message}</p>}
  </div>;
}
