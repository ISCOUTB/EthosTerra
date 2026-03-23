import "./styles/global.css";
import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import Link from "next/link";
import { Settings, Map, Network } from "lucide-react";

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
      <body className="font-archivo relative min-h-screen">
        
        {/* Dock de Navegación Global */}
        <div className="fixed top-1/2 -translate-y-1/2 left-4 z-50 flex flex-col items-center gap-3 bg-[#14181c]/90 backdrop-blur-md border border-[#272d34] p-2 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)]">
          <Link href="/" className="p-3 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-all group relative">
            <Settings className="w-5 h-5" />
            <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-gray-800">
              Diseño de Experimentos
            </span>
          </Link>
          <div className="w-6 h-[1px] bg-gray-700"></div>
          
          <Link href="/pages/simulador" className="p-3 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-all group relative">
            <Map className="w-5 h-5" />
            <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-gray-800">
              Geografía y Ecosistema
            </span>
          </Link>
          <div className="w-6 h-[1px] bg-gray-700"></div>
          
          <Link href="/pages/network" className="p-3 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 rounded-full transition-all group relative">
            <Network className="w-5 h-5" />
            <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-blue-900/90 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-blue-500 shadow-lg">
              Topología de Red BESA
            </span>
          </Link>
        </div>

{children}
        <Toaster />
      </body>
    </html>
  );
}
