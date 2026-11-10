import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cancelamentos · WG Hub",
  description: "Controle de cancelamentos, trocas, devoluções e correções de vendas",
  icons: { icon: "/cancelamentos/logo-icon.png" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-(--color-gray-50) text-(--color-graphite-900)">
        {children}
      </body>
    </html>
  );
}
