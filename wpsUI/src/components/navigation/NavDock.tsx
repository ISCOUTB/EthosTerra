"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Map, Network } from "lucide-react";
import { cn } from "@/lib/utils";

export default function NavDock() {
  const pathname = usePathname();

  const isHome = pathname === "/";
  const isSim = pathname === "/pages/simulador";
  const isNet = pathname === "/pages/network";

  return (
    <div className="fixed top-1/2 -translate-y-1/2 left-4 z-50 flex flex-col items-center gap-3 bg-[#14181c]/90 backdrop-blur-md border border-[#272d34] p-2 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)]">
      <Link 
        href="/" 
        className={cn(
          "p-3 rounded-full transition-all group relative",
          isHome ? "text-blue-400 bg-blue-900/20 shadow-[0_0_10px_rgba(59,130,246,0.3)]" : "text-gray-400 hover:text-white hover:bg-gray-800"
        )}
      >
        <Settings className="w-5 h-5" />
        <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-gray-800">
          Diseño de Experimentos
        </span>
      </Link>
      
      <div className="w-6 h-[1px] bg-gray-700"></div>
      
      <Link 
        href="/pages/simulador" 
        className={cn(
          "p-3 rounded-full transition-all group relative",
          isSim ? "text-blue-400 bg-blue-900/20 shadow-[0_0_10px_rgba(59,130,246,0.3)]" : "text-gray-400 hover:text-white hover:bg-gray-800"
        )}
      >
        <Map className="w-5 h-5" />
        <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-gray-800">
          Geografía y Ecosistema
        </span>
      </Link>
      
      <div className="w-6 h-[1px] bg-gray-700"></div>
      
      <Link 
        href="/pages/network" 
        className={cn(
          "p-3 rounded-full transition-all group relative",
          isNet ? "text-blue-400 bg-blue-900/20 shadow-[0_0_10px_rgba(59,130,246,0.3)]" : "text-gray-400 hover:text-white hover:bg-gray-800"
        )}
      >
        <Network className="w-5 h-5" />
        <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-blue-900/90 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-blue-500 shadow-lg">
          Topología de Red BESA
        </span>
      </Link>
    </div>
  );
}
