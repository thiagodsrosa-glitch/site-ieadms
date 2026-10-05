import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import { Cabecalho } from "@/components/Cabecalho";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "IEADMS — Igreja Evangélica Assembleia de Deus em MS",
    template: "%s | IEADMS",
  },
  description:
    "Encontre a igreja da IEADMS mais perto de você. Mapa interativo com os setores e congregações de Campo Grande/MS.",
};

export const viewport: Viewport = {
  themeColor: "#0a0e16",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${outfit.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <Cabecalho />
        {children}
      </body>
    </html>
  );
}
