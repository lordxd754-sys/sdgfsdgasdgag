import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PT Manager — Gestão de Consultoria Online",
  description: "Plataforma para personal trainer online gerenciar sua consultoria",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
