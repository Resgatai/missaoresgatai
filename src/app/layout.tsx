import type { Metadata } from "next";
import { InstallAppPrompt } from "@/components/install-app-prompt";
import "./globals.css";

export const metadata: Metadata = {
  title: "Missao Resgatai | Gestao de Igreja",
  description: "Plataforma de gestao e comunicacao da Missao Resgatai.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Missao Resgatai" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full flex flex-col">{children}<InstallAppPrompt /></body>
    </html>
  );
}
