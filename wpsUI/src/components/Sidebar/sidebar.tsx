"use client";

import React, { useEffect, useState } from "react";
import { Home, PieChart, Settings, Mail, Download } from "lucide-react";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTheme } from "next-themes";
import Image from "next/image";
import { toast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useRouter } from "next/navigation";

const Sidebar: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);

  useEffect(() => {
    const handler = () => {
      toast({
        variant: "default",
        title: "Ended simulation",
        description: "The simulation has ended! .",
      });
    };
    if (window.electronAPI && window.electronAPI.on) {
      window.electronAPI.on("simulation-ended", handler);
    }
    return () => {
      if (window.electronAPI && window.electronAPI.removeListener) {
        window.electronAPI.removeListener("simulation-ended", handler);
      }
    };
  }, []);

  // Chequea el estado del proceso Java periódicamente
  useEffect(() => {
    const checkSimulationStatus = async () => {
      try {
        if (window.electronAPI && window.electronAPI.checkJavaProcess) {
          const result = await window.electronAPI.checkJavaProcess();
          setIsSimulationRunning(result.running);
        }
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
        title: "Data Simulation",
        description:
          "Wait until the end of the simulation to start another one .",
        action: <ToastAction altText="Got it">Got it</ToastAction>,
      });
      return;
    }
    router.push("/pages/settings");
  };

  const menuItems = [
    { icon: <Home size={20} />, label: "Home Page", href: "/pages/simulador" },
    {
      icon: <PieChart size={20} />,
      label: "Analytics",
      href: "/pages/analytics",
    },
    {
      icon: <Settings size={20} />,
      label: "Settings",
      href: "/#",
      onClick: handleSettingsClick,
    },
    { icon: <Mail size={20} />, label: "Contact Us", href: "/pages/contact" },
    {
      icon: <Download size={20} />,
      label: "Download",
      href: "/pages/dataExport",
    },
  ];

  return (
    <div className="bg-[#171c1f] text-foreground w-88 flex flex-col h-full">
      <div className="p-4">
        <h1 className="text-2xl font-clash font-bold bg-[#2664eb] rounded-lg p-4 flex items-center justify-center">
          WellProdSimulator
        </h1>
      </div>

      <nav className="flex-1  items-center border-t border-[#ffff] flex flex-col px-4 py-6 space-y-4">
        <TooltipProvider>
          {menuItems.map((item, index) => (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <a
                  href={item.href}
                  className="w-full flex items-center  bg-[#153c8f] border-[#2664eb] justify-center py-3 px-4 text-foreground hover:text-[##153c8f] rounded-lg transition-colors font-clash text-white hover:bg-[#2664eb] hover:shadow-lg"
                  onClick={item.onClick}
                >
                  {item.icon}
                  <span className="ml-2">{item.label}</span>
                </a>
              </TooltipTrigger>
            </Tooltip>
          ))}
        </TooltipProvider>
      </nav>

      {/* Imagen en la parte inferior */}
      <div className="mt-auto flex justify-center p-4">
        <Image
          src="/images/logo.svg"
          alt="WellProdSimulator"
          width={300}
          height={200}
          className="w-64 h-64 object-contain"
        />
      </div>
    </div>
  );
};

export default Sidebar;
