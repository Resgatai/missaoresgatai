"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const dismissedKey = "resgatai-install-prompt-dismissed";

export function InstallAppPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || localStorage.getItem(dismissedKey) === "1") return;
    const standaloneFlag = "standalone" in navigator ? Boolean((navigator as Navigator & { standalone?: boolean }).standalone) : false;
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || standaloneFlag;
    const mobile = window.matchMedia("(max-width: 768px)").matches;
    if (isStandalone || !mobile) return;

    const fallback = window.setTimeout(() => setVisible(true), 1200);
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      window.clearTimeout(fallback);
      setPromptEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => {
      window.clearTimeout(fallback);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") {
      localStorage.setItem(dismissedKey, "1");
      setVisible(false);
    }
  }

  function dismiss() {
    localStorage.setItem(dismissedKey, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return <aside className="fixed inset-x-3 bottom-3 z-50 rounded-lg border border-[#e9d33b] bg-[#fff6c8] p-3 shadow-lg sm:hidden">
    <p className="text-sm font-bold text-[#2d2926]">Baixe o app da Missao Resgatai no seu celular.</p>
    <p className="mt-1 text-xs text-[#5d402b]">Instale para abrir mais rapido e receber avisos da igreja.</p>
    <div className="mt-3 flex gap-2">
      {promptEvent && <button type="button" onClick={install} className="rounded-lg bg-[#e9d33b] px-3 py-2 text-xs font-bold text-[#2d2926]">Baixar app</button>}
      <button type="button" onClick={dismiss} className="rounded-lg border border-[#7b4b2a] px-3 py-2 text-xs font-bold text-[#7b4b2a]">{promptEvent ? "Agora nao" : "Entendi"}</button>
    </div>
  </aside>;
}
