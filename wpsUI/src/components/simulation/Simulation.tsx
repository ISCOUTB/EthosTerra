"use client";
import SimulationMap from "@/components/simulation/containerMap";
import TabContent from "@/components/charts/datatabs/TabContent";
import FarmInfoComponent from "./farmInfoComponents";
import { Button } from "../ui/button";
import { StopCircle, HelpCircle } from "lucide-react";
import { useState, useEffect } from "react";

const ToggleButton = () => {
  const handleButtonClick = async () => {
    try {
      await fetch("/api/simulator", { method: "DELETE" });
    } catch (error) {
      console.error("Error al detener el proceso Java:", error);
    }
  };

  return (
    <div className="flex items-center justify-center space-x-2 mt-2">
      <Button
        id="stop-button"
        onClick={handleButtonClick}
        className="flex items-center space-x-1 text-white bg-[#2664eb] hover:bg-[#1e4bbf] font-clash font-bold py-1"
      >
        <StopCircle className="w-6 h-6 font-clash" />
        <span>Stop</span>
      </Button>
    </div>
  );
};

export default function MapSimulator() {
  const [showTourButton, setShowTourButton] = useState(false);

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
          className="w-full md:w-2/5 bg-[#181c20] rounded-lg shadow-md p-2 scrollbar-hide overflow-auto"
        >
          <h2 className="text-xl font-bold font-clash mb-2 text-center text-white bg-[#2664eb] rounded-lg p-1">
            Farm Information
          </h2>
          <FarmInfoComponent />
        </div>
        {/* Sección de Mapa de Simulación + Contenido de Pestañas */}
        <div className="w-full bg-[#181c20] rounded-lg shadow-md p-2 overflow-auto">
          <div className="h-[400px] rounded-3xl">
            <div id="simulation-map">
              <SimulationMap />
            </div>

            {/* Botón con WebSocket */}
            <ToggleButton />

            <div id="tab-content">
              <TabContent />
            </div>
          </div>
        </div>
      </div>

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
