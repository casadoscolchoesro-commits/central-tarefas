import type { Metadata } from "next";
import "./globals.css";
import { getAppIconUrl } from "@/lib/app-settings";

export async function generateMetadata(): Promise<Metadata> {
  const iconUrl = await getAppIconUrl();
  return {
    title: "Central de Cancelamentos - WG Colchões & Estofados",
    description:
      "Controle de cancelamentos, trocas, devoluções e correções de vendas",
    icons: {
      icon: iconUrl,
      shortcut: iconUrl,
      apple: iconUrl,
    },
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-(--color-gray-50) text-(--color-graphite-900)">
        {children}
      </body>
    </html>
  );
}
