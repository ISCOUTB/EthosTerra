"use client";
import SimulationMap from "@/components/simulation/containerMap";
import FarmInfoComponent from "./farmInfoComponents";
import { Button } from "../ui/button";
import { StopCircle, HelpCircle, TrendingUp } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import TabContent from "@/components/charts/datatabs/TabContent";
import SimulationReport from "./SimulationReport";
import { cn } from "@/lib/utils";

interface ToggleButtonProps {
  isRunning: boolean;
  setShowReport: (show: boolean) => void;
}

const ToggleButton = ({ isRunning, setShowReport }: ToggleButtonProps) => {
  const [stopping, setStopping] = useState(false);

  const handleStop = async () => {
    setStopping(true);
    try {
      if (isRunning) {
        await fetch("/api/simulator", { method: "DELETE" });
      }
    } catch (error) {
      console.error("Error al gestionar el proceso Java:", error);
    } finally {
      // No reseteamos stopping aquí inmediatamente porque el poller
      // eventualmente verá que ya no corre y cambiará el UI
      setTimeout(() => setStopping(false), 2000);
    }
  };

  return (
    <div className="flex items-center gap-4">
      {isRunning ? (
        <button
          onClick={handleStop}
          disabled={stopping}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95",
            stopping
              ? "bg-gray-600 cursor-not-allowed opacity-50"
              : "bg-red-600 hover:bg-red-700 shadow-red-900/20 shadow-lg"
          )}
        >
          <div className={cn("w-2 h-2 rounded-full bg-white", !stopping && "animate-pulse")} />
          {stopping ? "Stopping..." : "Stop Simulation"}
        </button>
      ) : (
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 border border-gray-700 text-gray-400 rounded-lg text-sm font-medium">
            <div className="w-2 h-2 rounded-full bg-gray-500" />
            Simulation Stopped
          </span>
          <button
            onClick={() => setShowReport(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/40 active:scale-95 border border-emerald-500/30"
          >
            <TrendingUp className="w-4 h-4" />
            View Results Report
          </button>
        </div>
      )}
    </div>
  );
};

export default function MapSimulator() {
  const [showTourButton, setShowTourButton] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const prevRunningRef = useRef(false);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/simulator");
        const data = await res.json();
        
        // Detección de fin de simulación
        if (prevRunningRef.current === true && data.running === false) {
          setShowReport(true);
        }
        
        setIsRunning(data.running);
        prevRunningRef.current = data.running;
      } catch (e) {
        console.error("Error polling simulator status", e);
      }
    };

    const interval = setInterval(checkStatus, 3000);
    checkStatus(); // Inicial
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Import dinámico: driver.js accede a window/document y falla en SSR si se importa estáticamente
    import("@/components/drive/tour").then(({ shouldShowTourThisSession, startSimulationTour }) => {
      if (shouldShowTourThisSession()) {
        const timer = setTimeout(() => {
          startSimulationTour();
        }, 1000);
        return () => clearTimeout(timer);
      }
    });
  }, []);

  const handleStartTour = () => {
    import("@/components/drive/tour").then(({ startSimulationTour }) => {
      startSimulationTour(true);
    });
  };

  return (
    <div className="flex h-screen bg-[#0f1417] text-[#ffffff] font-archivo overflow-hidden pl-20 lg:pl-24">
      <div className="flex-1 flex flex-col md:flex-row gap-2 p-2 relative w-full">
        {/* Sección de Información de la Finca */}
        <div
          id="farm-info"
          className="w-full md:w-[30%] bg-[#181c20] rounded-lg shadow-md p-2 scrollbar-hide overflow-auto"
        >
          <h2 className="text-lg font-bold font-clash mb-1 text-center text-white bg-[#2664eb] rounded-lg p-1">
            Farm Information
          </h2>
          <FarmInfoComponent />
        </div>
        {/* Sección de Mapa de Simulación + Contenido de Pestañas */}
        <div className="w-full bg-[#181c20] rounded-lg shadow-md p-2 overflow-auto scrollbar-hide">
          <div className="flex flex-col gap-4">
            <div id="simulation-map" className="aspect-square h-[350px] mx-auto rounded-2xl overflow-hidden bg-[#1a232b] mb-1">
              <SimulationMap />
            </div>

            <ToggleButton isRunning={isRunning} setShowReport={setShowReport} />

            {/* Estadísticas integradas debajo del mapa */}
            <div id="simulation-stats" className="mt-4 border-t border-[#2664eb]/30 pt-4">
              <TabContent />
            </div>
          </div>
        </div>
      </div>

      {/* Reporte Final */}
      <SimulationReport isOpen={showReport} onClose={() => setShowReport(false)} />

      {/* Botón de ayuda flotante */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <Button
          className="bg-[#2664eb] text-white hover:bg-[#1e4bbf] rounded-full p-2"
          onClick={() => setShowTourButton(!showTourButton)}
        >
          <HelpCircle className="w-5 h-5" />
        </Button>

        {/* Botón para iniciar el tour manualmente */}
        {showTourButton && (
          <Button
            className="bg-[#181c20] text-white border border-[#2664eb] hover:bg-[#232830]"
            onClick={handleStartTour}
          >
            Watch Tour
          </Button>
        )}
      </div>
    </div>
  );
}
