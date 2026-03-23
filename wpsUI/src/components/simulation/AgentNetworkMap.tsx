"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Landmark, Gavel, Users, ShoppingCart, Tractor, Activity, RadioTower, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BesaMessage {
  id: string;
  sourceId: string;
  targetId: string;
  action: string;
  timestamp: number;
}

interface AgentNode {
  id: string;
  label: string;
  type: "hub" | "family";
  x: number;
  y: number;
  icon: React.ElementType;
  color: string;
}

export function AgentNetworkMap({ agentCount = 12 }: { agentCount?: number }) {
  const [messages, setMessages] = useState<BesaMessage[]>([]);
  const [log, setLog] = useState<BesaMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // 1. Definir los Nodos Centrales (Servicios BESA)
  const hubs: AgentNode[] = useMemo(() => [
    { id: "MarketPlace", label: "Mercado", type: "hub", x: 42, y: 42, icon: ShoppingCart, color: "text-amber-400 border-amber-500 bg-amber-500/20" },
    { id: "BankOffice", label: "Banco", type: "hub", x: 58, y: 42, icon: Landmark, color: "text-emerald-400 border-emerald-500 bg-emerald-500/20" },
    { id: "CivicAuthority", label: "Gobierno", type: "hub", x: 42, y: 58, icon: Gavel, color: "text-purple-400 border-purple-500 bg-purple-500/20" },
    { id: "CommunityDynamics", label: "Comunidad", type: "hub", x: 58, y: 58, icon: Users, color: "text-pink-400 border-pink-500 bg-pink-500/20" },
  ], []);

  // 2. Generar Nodos de Familias en círculo alrededor de los Hubs
  const families: AgentNode[] = useMemo(() => {
    const nodes: AgentNode[] = [];
    const radius = 38; // Porcentaje de radio desde el centro
    for (let i = 0; i < agentCount; i++) {
      const angle = (i / agentCount) * 2 * Math.PI;
      nodes.push({
        id: `PeasantFamily_${i + 1}`,
        label: `Familia ${i + 1}`,
        type: "family",
        x: 50 + radius * Math.cos(angle),
        y: 50 + radius * Math.sin(angle),
        icon: Tractor,
        color: "text-blue-400 border-blue-500 bg-blue-900/30",
      });
    }
    return nodes;
  }, [agentCount]);

  const allNodes = [...hubs, ...families];

  // 3. Conexión Real al WebSocket de ViewerLens BESA
  useEffect(() => {
    const wsUrl = "ws://localhost:8000/wpsViewer";
    let ws: WebSocket;

    const connect = () => {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => setIsConnected(true);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Detectar cualquier payload JSON que contenga source y target
          if (data && data.source && data.target) {
            const newMsg: BesaMessage = {
              id: data.id || Math.random().toString(36).substring(2, 9),
              sourceId: data.source,
              targetId: data.target,
              action: data.action || "Interacción BESA",
              timestamp: Date.now(),
            };

            setMessages((prev) => [...prev, newMsg]);
            setLog((prev) => [newMsg, ...prev].slice(0, 50)); // Mantener últimos 50 logs

            // Limpiar partícula visual después de su viaje (1.5s)
            setTimeout(() => {
              setMessages((prev) => prev.filter((m) => m.id !== newMsg.id));
            }, 1500);
          }
        } catch (err) {
          // Ignorar texto plano u otras estructuras no parseables en JSON
        }
      };

      ws.onclose = () => setIsConnected(false);
    };

    connect();

    return () => {
      if (ws) ws.close();
    };
  }, []);

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] w-full bg-[#0f1417] text-white p-4 gap-4 font-archivo">
      
      {/* Panel Izquierdo: Mapa de Red */}
      <div className="flex-1 relative overflow-hidden bg-[#14181c] rounded-2xl border border-[#272d34] shadow-2xl flex flex-col">
        
        {/* Controles del Grafo */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-4 bg-black/50 backdrop-blur px-4 py-2 rounded-lg border border-gray-800">
          <RadioTower className="w-5 h-5 text-primary" />
          <div className="flex flex-col">
            <span className="text-sm font-bold">Monitor de Red BESA</span>
            <span className="text-xs text-gray-400">Interconexión de Agentes en Vivo</span>
          </div>
          <div className="w-[1px] h-8 bg-gray-700 mx-2"></div>
          <div className="flex items-center gap-2">
            {isConnected ? <Wifi className="w-4 h-4 text-green-500 animate-pulse" /> : <WifiOff className="w-4 h-4 text-red-500" />}
            <span className={cn("text-xs font-semibold", isConnected ? "text-green-500" : "text-red-500")}>{isConnected ? "Conectado al Puerto 8000" : "Desconectado"}</span>
          </div>
        </div>

        {/* Lienzo SVG para conexiones y partículas */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <defs>
            {/* Filtro de brillo para los mensajes */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Líneas de conexión estáticas (tenues) */}
          {hubs.map((hub) =>
            families.map((fam) => (
              <line
                key={`line-${hub.id}-${fam.id}`}
                x1={`${hub.x}%`} y1={`${hub.y}%`}
                x2={`${fam.x}%`} y2={`${fam.y}%`}
                stroke="#272d34" strokeWidth="1" opacity="0.3"
              />
            ))
          )}

          {/* Partículas Animadas (Mensajes Viajando) */}
          <AnimatePresence>
            {messages.map((msg) => {
              // Flexibilizamos la búsqueda por si el backend envía alias con prefijos (ej. "wps01_PeasantFamily_1" en lugar de "PeasantFamily_1")
              const source = allNodes.find((n) => msg.sourceId.includes(n.id) || n.id.includes(msg.sourceId));
              const target = allNodes.find((n) => msg.targetId.includes(n.id) || n.id.includes(msg.targetId));
              
              if (!source || !target) return null;
              return (
                <motion.circle
                  key={msg.id}
                  r="4"
                  fill="#38bdf8" // Color de la partícula de información
                  filter="url(#glow)"
                  initial={{ cx: `${source.x}%`, cy: `${source.y}%`, opacity: 0 }}
                  animate={{ cx: `${target.x}%`, cy: `${target.y}%`, opacity: 1 }}
                  exit={{ opacity: 0, scale: 2 }}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                />
              );
            })}
          </AnimatePresence>
        </svg>

        {/* Nodos de Agentes renderizados sobre el SVG */}
        {allNodes.map((node) => {
          const Icon = node.icon;
          const isHub = node.type === "hub";
          return (
            <div
              key={node.id}
              className={cn(
                "absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center transition-transform hover:scale-125 z-10"
              )}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
              <div className={cn("p-2 rounded-full border shadow-[0_0_15px_rgba(0,0,0,0.5)] flex items-center justify-center", node.color, isHub ? "w-14 h-14 border-2" : "w-10 h-10")}>
                <Icon className={isHub ? "w-7 h-7" : "w-5 h-5"} />
              </div>
              <span className="text-[10px] mt-1.5 font-bold bg-[#0f1417]/80 border border-gray-800 px-2 py-0.5 rounded shadow whitespace-nowrap">
                {node.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Panel Derecho: Consola de Eventos BESA */}
      <div className="w-full lg:w-80 bg-[#171c1f] border border-[#272d34] rounded-2xl flex flex-col overflow-hidden shadow-xl">
        <div className="bg-black/40 border-b border-gray-800 p-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-400" />
          <h3 className="font-semibold text-sm">Registro de Eventos (EventBESA)</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          <AnimatePresence initial={false}>
            {log.map((msg) => {
              const isFamilyToHub = msg.sourceId.includes("Family");
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-[#14181c] p-3 rounded-lg border border-[#272d34] text-xs space-y-1"
                >
                  <div className="flex justify-between items-center text-gray-500">
                    <span className="font-mono text-[10px]">{new Date(msg.timestamp).toISOString().split('T')[1].slice(0,-1)}</span>
                    <span className="text-[10px] bg-blue-900/30 text-blue-400 px-1.5 rounded">{msg.id}</span>
                  </div>
                  <p className="font-semibold text-gray-200">[{msg.action}]</p>
                  <div className="flex items-center gap-2 text-gray-400 mt-1">
                    <span className={cn("truncate max-w-[100px]", isFamilyToHub ? "text-blue-300" : "text-amber-300")}>{msg.sourceId.replace("PeasantFamily_", "Fam_")}</span>
                    <span className="text-gray-600">→</span>
                    <span className={cn("truncate max-w-[100px]", !isFamilyToHub ? "text-blue-300" : "text-amber-300")}>{msg.targetId.replace("PeasantFamily_", "Fam_")}</span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}