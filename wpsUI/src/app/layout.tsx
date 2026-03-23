import "./styles/global.css";
import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import NavDock from "@/components/navigation/NavDock";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});
export const metadata: Metadata = {
  title: "EthosTerra",
  description:
    "Multi-agent social simulator for Colombian peasant families — BDI + emotional reasoning",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={archivo.className}>
      <body className="font-archivo relative min-h-screen text-foreground antialiased">
        
        {/* Dock de Navegación Global */}
        <NavDock />

        <main>
          {children}
        </main>
        
        <Toaster />
      </body>
    </html>
  );
}
