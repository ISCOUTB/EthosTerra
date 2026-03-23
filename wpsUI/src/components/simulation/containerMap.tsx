"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface AgentData {
  name_agent: string;
  lands: LandData[];
  contractor?: string;
}

interface LandData {
  name: string;
  current_season: string;
}

const SimulationMap: React.FC = () => {
  const socketRef = useRef<WebSocket | null>(null);
  const [agentData, setAgentData] = useState<AgentData[]>([]);
  const [specificLandNames, setSpecificLandNames] = useState<string[]>([]);
  const [specificSeason, setSpecificSeason] = useState<string[]>([]);
  const [isSimulationActive, setIsSimulationActive] = useState<boolean>(false);
  const [mapSize, setMapSize] = useState<number>(400);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedSize = parseInt(localStorage.getItem("map_size") || "400");
      setMapSize(storedSize);
    }
    connectWebSocket();
    return () => {
      if (socketRef.current) socketRef.current.close();
    };
  }, []);

  const connectWebSocket = () => {
    const url = "ws://localhost:8000/wpsViewer";
    socketRef.current = new WebSocket(url);

    socketRef.current.onerror = function () {
      console.error("Error en la conexión a la dirección: " + url);
      setTimeout(connectWebSocket, 2000);
    };

    socketRef.current.onopen = function () {
      function sendMessage() {
        try {
          socketRef.current?.send("setup");
        } catch (error) {
          setTimeout(sendMessage, 2000);
        }
      }
      sendMessage();
    };

    socketRef.current.onmessage = function (event) {
      let prefix = event.data.substring(0, 2);
      let data = event.data.substring(2);
      switch (prefix) {
        case "q=":
          setIsSimulationActive(true);
          setAgentData([]);
          break;
        case "j=":
          try {
            let jsonData = JSON.parse(data);
            const { name, state } = jsonData;
            const parsedState = JSON.parse(state);
            const lands_number = parsedState.assignedLands?.length || 0;
            const contractor = parsedState.contractor || "";
            const newLands: LandData[] = [];
            for (let j = 0; j < lands_number; j++) {
              const land_name = parsedState.assignedLands[j].landName;
              const land_name_short = land_name.split("_")[1];
              newLands.push({
                name: "land_" + land_name_short,
                current_season: parsedState.assignedLands[j].currentSeason,
              });
            }
            setAgentData((prev) => {
              const exists = prev.some((a) => a.name_agent === name);
              if (exists) {
                return prev.map((a) =>
                  a.name_agent === name ? { ...a, lands: newLands, contractor } : a
                );
              }
              return [...prev, { name_agent: name, lands: newLands, contractor }];
            });
          } catch (error) {
            console.error(error);
          }
          break;
        case "e=":
          if (data === "end") {
            setIsSimulationActive(false);
            setSpecificLandNames([]);
            setSpecificSeason([]);
          }
          break;
      }
    };
  };

  useEffect(() => {
    if (isSimulationActive) {
      const interval = setInterval(() => {
        const landNames: string[] = [];
        const seasonNames: string[] = [];
        agentData.forEach((agent) => {
          agent.lands.forEach((land) => {
            landNames.push(land.name);
            seasonNames.push(land.current_season);
          });
        });
        setSpecificLandNames(landNames);
        setSpecificSeason(seasonNames);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [agentData, isSimulationActive]);

  const getAgentColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 80%, 60%)`;
  };

  const cols = mapSize === 100 ? 10 : mapSize === 800 ? 40 : 20;
  const rows = mapSize / cols;

  // Render SVG contract lines
  const renderContractLines = () => {
    return agentData.map((agent) => {
      if (!agent.contractor || agent.contractor === "") return null;
      const workerLand = agent.lands[0]?.name;
      
      // Encontrar al granjero que lo contrató
      const contractorAgent = agentData.find(a => a.name_agent === agent.contractor);
      if (!contractorAgent) return null;
      const contractorLand = contractorAgent.lands[0]?.name;

      if (!workerLand || !contractorLand) return null;

      // Calcular posiciones basadas en el ID ej. "land_5"
      const wIdx = parseInt(workerLand.split("_")[1]) - 1;
      const cIdx = parseInt(contractorLand.split("_")[1]) - 1;

      const wRow = Math.floor(wIdx / cols);
      const wCol = wIdx % cols;
      const cRow = Math.floor(cIdx / cols);
      const cCol = cIdx % cols;

      const wX = ((wCol + 0.5) / cols) * 100;
      const wY = ((wRow + 0.5) / rows) * 100;
      const cX = ((cCol + 0.5) / cols) * 100;
      const cY = ((cRow + 0.5) / rows) * 100;

      return (
        <line
          key={`contract-${agent.name_agent}`}
          x1={`${wX}%`}
          y1={`${wY}%`}
          x2={`${cX}%`}
          y2={`${cY}%`}
          stroke="#38bdf8"
          strokeWidth="2"
          strokeDasharray="4 4"
          className="opacity-70 animate-pulse"
        />
      );
    });
  };

  return (
    <div className="w-full h-full flex justify-center items-center overflow-hidden rounded-lg">
      <div 
        className="w-full h-full max-w-[850px] max-h-full bg-[#1a232b] rounded-2xl border-2 border-[#ffff] shadow-2xl p-1 md:p-2 overflow-hidden relative flex flex-col"
      >
        {/* SVG Wrapper for Contracts */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 px-4 py-4" style={{ top: 0, left: 0 }}>
          {renderContractLines()}
        </svg>

        <div 
          className="w-full h-full grid gap-[1px]"
          style={{ 
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` 
          }}
        >
          {Array.from({ length: mapSize }).map((_, idx) => {
            const landId = `land_${idx + 1}`;
            let bgColor = "#2b343c"; // Unoccupied/default simulated soil
            let borderColor = "transparent";
            let ownerName = "";
            let typeLabel = "Reserva Natural";
            
            // Apply slight organic noise based on index to differentiate soil
            if (idx % 17 === 0) { bgColor = "#1d3a4d"; typeLabel = "Fuente de Agua"; }
            else if (idx % 11 === 0) { bgColor = "#2d4a36"; typeLabel = "Zona Forestal"; }
            else if (idx % 23 === 0) { bgColor = "#38414e"; typeLabel = "Ruta Logística"; }
            else { typeLabel = "Tierra Cultivable"; }
 
            // Look up owner and season
            const owner = agentData.find(a => a.lands.some(l => l.name === landId));
            if (isSimulationActive && owner) {
              ownerName = owner.name_agent;
              borderColor = getAgentColor(ownerName);
              
              const land = owner.lands.find(l => l.name === landId);
              if (land) {
                const season = land.current_season;
                switch (season) {
                  case "PREPARATION":
                    bgColor = "#eab308"; // Dorado
                    break;
                  case "PLANTING":
                    bgColor = "#f97316"; // Naranja
                    break;
                  case "GROWTH":
                    bgColor = "#ef4444"; // Rojo
                    break;
                  case "HARVEST":
                    bgColor = "#22c55e"; // Verde
                    break;
                }
              }
            }
 
            return (
              <motion.div
                key={landId}
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: 1, 
                  backgroundColor: bgColor,
                  borderColor: borderColor,
                  borderWidth: ownerName ? (mapSize === 800 ? "1px" : "2px") : "0px",
                }}
                transition={{ duration: 0.5 }}
                className={`aspect-square rounded-[1px] transition-colors relative group border-solid box-border`}
              >
                {/* Tooltip on hover */}
                <div className="absolute opacity-0 group-hover:opacity-100 bg-black text-white text-[9px] p-1.5 rounded -top-10 left-1/2 -translate-x-1/2 z-30 pointer-events-none whitespace-nowrap shadow-lg border border-gray-700 flex flex-col gap-0.5 items-center">
                  <span className="font-bold text-[#3b82f6]">{landId}</span>
                  <span className="text-gray-400 text-[9px] mb-1">{typeLabel}</span>
                  {ownerName && <span style={{ color: borderColor }}>Dueño: {ownerName}</span>}
                  {ownerName && agentData.find(a => a.name_agent === ownerName)?.contractor && (
                    <span className="text-sky-300">Trabaja para: {agentData.find(a => a.name_agent === ownerName)?.contractor}</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SimulationMap;
