import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Missão Resgatai | Gestão de Igreja",
  description: "Plataforma de gestão e comunicação da Missão Resgatai.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
