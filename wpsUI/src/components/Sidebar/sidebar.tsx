"use client";

import React, { useEffect, useState } from "react";
import { Home, PieChart, Settings, Mail, Download, Network, BarChartIcon } from "lucide-react";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Image from "next/image";
import Link from "next/link";
import { toast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useRouter, usePathname } from "next/navigation";

const Sidebar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);

  useEffect(() => {
    let prevRunning: boolean | null = null;
    const checkSimulationStatus = async () => {
      try {
        const res = await fetch("/api/simulator");
        const data = await res.json();
        const running = Boolean(data.running);
        if (prevRunning === true && !running) {
          toast({ variant: "default", title: "Simulation ended", description: "The simulation has finished." });
        }
        prevRunning = running;
        setIsSimulationRunning(running);
      } catch {
        setIsSimulationRunning(false);
      }
    };
    checkSimulationStatus();
    const interval = setInterval(checkSimulationStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isSimulationRunning) {
      toast({
        variant: "destructive",
        title: "Simulation in progress",
        description: "Wait for the simulation to finish before starting another one.",
        action: <ToastAction altText="Got it">Got it</ToastAction>,
      });
      return;
    }
    router.push("/pages/settings");
  };

  const menuItems = [
    { icon: <Home size={20} />, label: "Simulator", href: "/pages/simulador" },
    { icon: <PieChart size={20} />, label: "Analytics", href: "/pages/analytics" },
    { icon: <BarChartIcon size={20} />, label: "Statistics", href: "/pages/statistics" },
    { icon: <Network size={20} />, label: "Network", href: "/pages/network" },
    { icon: <Settings size={20} />, label: "Settings", href: "/pages/settings", onClick: handleSettingsClick },
    { icon: <Mail size={20} />, label: "Contact", href: "/pages/contact" },
    { icon: <Download size={20} />, label: "Export Data", href: "/pages/dataExport" },
  ];

  return (
    <div className="bg-[#171c1f] text-foreground w-52 flex flex-col h-full shrink-0">
      <div className="p-4">
        <h1 className="text-xl font-clash font-bold bg-[#2664eb] rounded-lg p-3 flex items-center justify-center">
          EthosTerra
        </h1>
      </div>

      <nav className="flex-1 border-t border-white/10 flex flex-col px-3 py-4 space-y-2">
        <TooltipProvider>
          {menuItems.map((item, index) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={`w-full flex items-center gap-2 justify-start py-2.5 px-3 rounded-lg transition-colors font-clash text-sm ${
                      isActive
                        ? "bg-[#2664eb] text-white shadow-lg"
                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                    }`}
                    onClick={item.onClick}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                </TooltipTrigger>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </nav>

      <div className="mt-auto flex justify-center p-4">
        <Image
          src="/images/logo.svg"
          alt="EthosTerra"
          width={160}
          height={120}
          className="w-40 h-auto object-contain opacity-80"
        />
      </div>
    </div>
  );
};

export default Sidebar;
