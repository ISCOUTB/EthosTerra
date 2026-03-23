"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Landmark, Gavel, Users, ShoppingCart, Tractor, Activity,
  RadioTower, Wifi, WifiOff, X, Inbox, ArrowDownLeft, Calendar,
  Skull, User
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
   Tipos
   ──────────────────────────────────────────────────────────────────────────── */

export interface BesaMessage {
  id: string;
  sourceId: string;
  targetId: string;
  action: string;
  detail: string;
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

/* ────────────────────────────────────────────────────────────────────────────
   Nodos Hub (fijos)
   ──────────────────────────────────────────────────────────────────────────── */
const HUBS: AgentNode[] = [
  { id: "MarketPlace", label: "Mercado", type: "hub", x: 42, y: 42, icon: ShoppingCart, color: "text-amber-400 border-amber-500 bg-amber-500/20" },
  { id: "BankOffice", label: "Banco", type: "hub", x: 58, y: 42, icon: Landmark, color: "text-emerald-400 border-emerald-500 bg-emerald-500/20" },
  { id: "CivicAuthority", label: "Gobierno", type: "hub", x: 42, y: 58, icon: Gavel, color: "text-purple-400 border-purple-500 bg-purple-500/20" },
  { id: "CommunityDynamics", label: "Comunidad", type: "hub", x: 58, y: 58, icon: Users, color: "text-pink-400 border-pink-500 bg-pink-500/20" },
];

const HUB_IDS = new Set(HUBS.map((h) => h.id));

/* ────────────────────────────────────────────────────────────────────────────
   Helper: posicionar N familias en un círculo
   ──────────────────────────────────────────────────────────────────────────── */
function buildFamilyNodes(familyIds: string[]): AgentNode[] {
  const count = familyIds.length;
  if (count === 0) return [];
  const radius = 38;
  return familyIds.map((id, i) => {
    const angle = (i / count) * 2 * Math.PI - Math.PI / 2; // empieza arriba
    const num = id.replace(/\D+/g, "") || `${i + 1}`;
    return {
      id,
      label: `Familia ${num}`,
      type: "family" as const,
      x: 50 + radius * Math.cos(angle),
      y: 50 + radius * Math.sin(angle),
      icon: Tractor,
      color: "text-blue-400 border-blue-500 bg-blue-900/30",
    };
  });
}

/* ────────────────────────────────────────────────────────────────────────────
   Componente principal
   ──────────────────────────────────────────────────────────────────────────── */

export function AgentNetworkMap() {
  const [messages, setMessages] = useState<BesaMessage[]>([]);
  const [log, setLog] = useState<BesaMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [currentDate, setCurrentDate] = useState<string>("Esperando...");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  // Almacena los IDs de familias descubiertas a través de mensajes j=
  const [discoveredFamilies, setDiscoveredFamilies] = useState<string[]>([]);
  const [agentStates, setAgentStates] = useState<Record<string, { health: number; farmId: string }>>({});
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Nodos dinámicos ───────────────────────────────────────────────────
  const familyNodes = useMemo(
    () => buildFamilyNodes(discoveredFamilies),
    [discoveredFamilies]
  );

  const allNodes = useMemo(() => [...HUBS, ...familyNodes], [familyNodes]);

  // ── Resolución flexible de nodos ──────────────────────────────────────
  const resolveNode = useCallback(
    (alias: string) =>
      allNodes.find(
        (n) => alias.includes(n.id) || n.id.includes(alias)
      ),
    [allNodes]
  );

  // ── Mensajes filtrados para el nodo seleccionado ──────────────────────
  const selectedNodeMessages = useMemo(() => {
    if (!selectedNodeId) return [];
    return log.filter(msg => msg.targetId === selectedNodeId || msg.sourceId === selectedNodeId);
  }, [log, selectedNodeId]);

  // ── Contador de mensajes recibidos por nodo ───────────────────────────
  const nodeIncomingCount = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of log) {
      const target = resolveNode(m.targetId);
      if (target) {
        map[target.id] = (map[target.id] || 0) + 1;
      }
    }
    return map;
  }, [log, resolveNode]);

  // ── Conexión al WebSocket de ViewerLens ───────────────────────────────
  useEffect(() => {
    const wsUrl = "ws://localhost:8000/wpsViewer";
    let ws: WebSocket;
    let alive = true;

    const connect = () => {
      if (!alive) return;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        try { ws.send("setup"); } catch { /* ignore */ }
      };

      ws.onmessage = (event) => {
        const raw: string = event.data;
        const prefix = raw.substring(0, 2);
        const payload = raw.substring(2);

        switch (prefix) {
          // ── Interacciones entre agentes ────────────────────────────
          case "i=": {
            try {
              const data = JSON.parse(payload);
              if (data && data.from && data.to) {
                // Descubrir agentes a partir de interacciones también
                [data.from, data.to].forEach(agentName => {
                  if (agentName && !HUB_IDS.has(agentName)) {
                    setDiscoveredFamilies((prev) => {
                      if (prev.includes(agentName)) return prev;
                      return [...prev, agentName].sort((a, b) => {
                        const na = parseInt(a.replace(/\D+/g, "") || "0");
                        const nb = parseInt(b.replace(/\D+/g, "") || "0");
                        return na - nb;
                      });
                    });
                  }
                });

                const newMsg: BesaMessage = {
                  id: Math.random().toString(36).substring(2, 9),
                  sourceId: data.from,
                  targetId: data.to,
                  action: data.action || "Interacción BESA",
                  detail: data.detail || "",
                  timestamp: Date.now(),
                };

                setMessages((prev) => [...prev, newMsg]);
                setLog((prev) => [newMsg, ...prev].slice(0, 200));

                setTimeout(() => {
                  setMessages((prev) => prev.filter((m) => m.id !== newMsg.id));
                }, 1500);
              }
            } catch { /* payload no válido */ }
            break;
          }

          // ── Estado JSON del agente → descubrir familias activas ───
          case "j=": {
            try {
              const data = JSON.parse(payload);
              if (data && data.name) {
                const agentName: string = data.name;
                const parsedState = typeof data.state === "string" ? JSON.parse(data.state) : data.state;
                
                const health = parsedState.health ?? 100;
                const farmId = parsedState.peasantFamilyLandAlias || "";

                setAgentStates(prev => ({
                  ...prev,
                  [agentName]: { health, farmId }
                }));

                // Solo agregar si es familia (no un hub) y no ya descubierta
                if (!HUB_IDS.has(agentName)) {
                  setDiscoveredFamilies((prev) => {
                    if (prev.includes(agentName)) return prev;
                    return [...prev, agentName].sort((a, b) => {
                      const na = parseInt(a.replace(/\D+/g, "") || "0");
                      const nb = parseInt(b.replace(/\D+/g, "") || "0");
                      return na - nb;
                    });
                  });
                }
              }
            } catch { /* ignore */ }
            break;
          }

          // ── Reset de simulación ───────────────────────────────────
          case "q=": {
            setDiscoveredFamilies([]);
            setAgentStates({});
            setLog([]);
            setMessages([]);
            setSelectedNodeId(null);
            setCurrentDate("Esperando...");
            break;
          }

          // ── Avance del tiempo (Fecha) ─────────────────────────────
          case "d=": {
            setCurrentDate(payload);
            break;
          }
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (alive) {
          reconnectTimer.current = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => ws.close();
    };

    connect();

    return () => {
      alive = false;
      clearTimeout(reconnectTimer.current);
      if (ws) ws.close();
    };
  }, []);

  // ── Info del nodo seleccionado ─────────────────────────────────────────
  const selectedNode = selectedNodeId
    ? allNodes.find((n) => n.id === selectedNodeId)
    : null;

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#0f1417] text-white p-2 pl-20 lg:pl-24 gap-2 font-archivo overflow-hidden">
      {/* Panel Principal: Mapa de Red + Consola */}
      <div className="flex-1 flex flex-col lg:flex-row gap-2 relative overflow-hidden">

        {/* Controles */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-4 bg-black/50 backdrop-blur px-4 py-2 rounded-lg border border-gray-800">
          <RadioTower className="w-5 h-5 text-primary" />
          <div className="flex flex-col">
            <span className="text-sm font-bold">Monitor de Red BESA</span>
            <span className="text-xs text-gray-400">Interconexión de Agentes en Vivo</span>
          </div>
          <div className="w-[1px] h-8 bg-gray-700 mx-2" />
          <div className="flex items-center gap-2">
            {isConnected
              ? <Wifi className="w-4 h-4 text-green-500 animate-pulse" />
              : <WifiOff className="w-4 h-4 text-red-500" />}
            <span className={cn("text-xs font-semibold", isConnected ? "text-green-500" : "text-red-500")}>
              {isConnected ? "Conectado" : "Desconectado"}
            </span>
          </div>
          <div className="w-[1px] h-8 bg-gray-700 mx-2" />
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Users className="w-3.5 h-3.5" />
            <span>{discoveredFamilies.length} agentes</span>
            <div className="w-[1px] h-4 bg-gray-700 mx-1" />
            <Activity className="w-3.5 h-3.5" />
            <span>{log.length} eventos</span>
            <div className="w-[1px] h-4 bg-gray-700 mx-1" />
            <Calendar className="w-3.5 h-3.5" />
            <span className="font-mono text-sky-300">{currentDate}</span>
          </div>
        </div>

        {/* SVG: conexiones y partículas */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
              <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-strong">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Líneas estáticas hub↔familia */}
          {HUBS.map((hub) =>
            familyNodes.map((fam) => (
              <line
                key={`line-${hub.id}-${fam.id}`}
                x1={`${hub.x}%`} y1={`${hub.y}%`}
                x2={`${fam.x}%`} y2={`${fam.y}%`}
                stroke="#272d34" strokeWidth="1" opacity="0.3"
              />
            ))
          )}

          {/* Líneas activas cuando hay mensajes en tránsito */}
          {messages.map((msg) => {
            const source = resolveNode(msg.sourceId);
            const target = resolveNode(msg.targetId);
            if (!source || !target || source.id === target.id) return null;
            return (
              <line
                key={`active-${msg.id}`}
                x1={`${source.x}%`} y1={`${source.y}%`}
                x2={`${target.x}%`} y2={`${target.y}%`}
                stroke="#38bdf8" strokeWidth="1.5" opacity="0.6"
                filter="url(#glow)"
              />
            );
          })}

          {/* Partículas animadas */}
          <AnimatePresence>
            {messages.map((msg) => {
              const source = resolveNode(msg.sourceId);
              const target = resolveNode(msg.targetId);
              if (!source || !target || source.id === target.id) return null;
              return (
                <motion.circle
                  key={msg.id}
                  r="5"
                  fill="#38bdf8"
                  filter="url(#glow-strong)"
                  initial={{ cx: `${source.x}%`, cy: `${source.y}%`, opacity: 0, scale: 0.5 }}
                  animate={{ cx: `${target.x}%`, cy: `${target.y}%`, opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 2.5 }}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                />
              );
            })}
          </AnimatePresence>
        </svg>

        {/* Nodos de Agentes */}
        {allNodes.map((node) => {
          const isHub = node.type === "hub";
          const isSelected = selectedNodeId === node.id;
          const count = nodeIncomingCount[node.id] || 0;
          
          let nodeColor = node.color;
          let nodeIcon = node.icon;

          if (!isHub) {
            const state = agentStates[node.id];
            if (state) {
              const { health, farmId } = state;
              if (health <= 0) {
                nodeColor = "text-slate-400 border-slate-500 bg-slate-500/20";
                nodeIcon = Skull;
              } else if (health < 20) {
                nodeColor = "text-red-400 border-red-500 bg-red-500/30";
              } else if (!farmId || farmId === "" || farmId === "Unassigned") {
                nodeIcon = User;
                nodeColor = "text-gray-400 border-gray-600 bg-gray-900/40";
              }
            }
          }

          const IconComponent = nodeIcon;

          return (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center z-10 cursor-pointer transition-all duration-200",
                isSelected ? "scale-125" : "hover:scale-110"
              )}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              onClick={() => setSelectedNodeId(isSelected ? null : node.id)}
            >
              <div className="relative">
                <div
                  className={cn(
                    "p-1.5 rounded-full border shadow-[0_0_15px_rgba(0,0,0,0.5)] flex items-center justify-center transition-all",
                    nodeColor,
                    isHub ? "w-12 h-12 border-2" : "w-8 h-8",
                    isSelected && "ring-2 ring-sky-400 ring-offset-2 ring-offset-[#14181c]",
                    !isHub && agentStates[node.id]?.health <= 0 && "opacity-25"
                  )}
                >
                  <IconComponent className={isHub ? "w-6 h-6" : "w-4 h-4"} />
                </div>
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 bg-sky-500 text-white text-[8px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-lg border border-[#14181c]">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </div>
              <span className="text-[9px] mt-1 font-bold bg-[#0f1417]/80 border border-gray-800 px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                {node.label}
              </span>
            </motion.div>
          );
        })}

        {/* Mensaje cuando aún no hay agentes */}
        {discoveredFamilies.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-0 text-gray-600 pointer-events-none">
            <RadioTower className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm text-center max-w-xs opacity-50">
              Esperando agentes…<br />Inicia una simulación para ver la red BESA en tiempo real.
            </p>
          </div>
        )}

        {/* ── Panel de inspección al hacer clic ────────────────────────── */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-4 left-4 right-4 lg:left-auto lg:right-4 lg:w-96 z-30 bg-[#171c1f]/95 backdrop-blur-md border border-[#272d34] rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-black/30">
                <div className="flex items-center gap-3">
                  <div className={cn("p-1.5 rounded-full border", selectedNode.color)}>
                    <selectedNode.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{selectedNode.label}</p>
                    <p className="text-[10px] text-gray-500 font-mono">{selectedNode.id}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedNodeId(null); }}
                  className="p-1 rounded hover:bg-gray-800 text-gray-500 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {selectedNodeMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-600">
                    <Inbox className="w-8 h-8 mb-2" />
                    <p className="text-xs">Sin mensajes recibidos aún</p>
                  </div>
                ) : (
                  selectedNodeMessages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-[#14181c] p-2.5 rounded-lg border border-[#272d34] text-xs space-y-1"
                    >
                      <div className="flex justify-between items-center text-gray-500">
                        <span className="font-mono text-[10px]">
                          {new Date(msg.timestamp).toISOString().split("T")[1].slice(0, -1)}
                        </span>
                      </div>
                      <p className="font-semibold text-sky-300">{msg.action}</p>
                      {msg.detail && <p className="text-gray-400 truncate">{msg.detail}</p>}
                      <div className="flex items-center gap-1.5 text-gray-500 mt-1">
                        <ArrowDownLeft className="w-3 h-3 text-sky-500" />
                        <span className="text-blue-300 truncate">{msg.sourceId.replace("PeasantFamily_", "Fam_")}</span>
                        <span className="text-gray-700">→</span>
                        <span className="text-amber-300 truncate">{msg.targetId.replace("PeasantFamily_", "Fam_")}</span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              <div className="px-4 py-2 border-t border-gray-800 bg-black/20 text-[10px] text-gray-500 flex justify-between">
                <span>{selectedNodeMessages.length} mensajes recibidos</span>
                <span>Click para cerrar</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Panel Derecho: Consola global / Detalles del Agente ───────── */}
      <div className="w-full lg:w-96 bg-[#171c1f] border border-[#272d34] rounded-2xl flex flex-col overflow-hidden shadow-xl transition-all duration-300">
        {selectedNodeId ? (
          <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Cabecera de Selección */}
            <div className="bg-[#2664eb]/20 border-b border-gray-800 p-4 flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-full border shadow-lg", resolveNode(selectedNodeId)?.color)}>
                  {React.createElement(resolveNode(selectedNodeId)?.icon || Activity, { className: "w-5 h-5" })}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white truncate max-w-[160px]">
                    {resolveNode(selectedNodeId)?.label || selectedNodeId}
                  </h3>
                  <p className="text-[10px] text-gray-500 font-mono italic">
                    {selectedNodeId.replace("PeasantFamily_", "Fam_")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedNodeId(null)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                title="Volver al registro global"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-white" />
              </button>
            </div>

            {/* Información de Estado (Solo Familia) */}
            {agentStates[selectedNodeId] && (
              <div className="p-3 bg-black/20 border-b border-gray-800 grid grid-cols-2 gap-2">
                <div className="p-2 bg-[#14181c] rounded-lg border border-gray-800">
                  <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Vitalidad</p>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      agentStates[selectedNodeId].health > 0 ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" : "bg-gray-600"
                    )} />
                    <span className="text-xs font-mono font-bold">
                      {agentStates[selectedNodeId].health}%
                    </span>
                  </div>
                </div>
                <div className="p-2 bg-[#14181c] rounded-lg border border-gray-800">
                  <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Localización</p>
                  <p className="text-xs font-mono text-amber-500 truncate">
                    {agentStates[selectedNodeId].farmId || "Sin Tierras"}
                  </p>
                </div>
              </div>
            )}

            {/* Historial de Interacciones Específico */}
            <div className="flex-1 flex flex-col min-h-0 bg-black/10">
              <div className="px-4 py-2 text-[10px] uppercase font-bold text-gray-500 bg-[#14181c] border-b border-gray-800 flex justify-between">
                <span>Historia BESA</span>
                <span>{selectedNodeMessages.length} total</span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {selectedNodeMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-gray-600 italic">
                    <Inbox className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-[11px]">Sin interacciones registradas aún</p>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {selectedNodeMessages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-[#14181c]/80 p-2.5 rounded-lg border border-gray-800/50 hover:border-sky-500/30 transition-all group"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] font-mono text-sky-500 opacity-60">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 rounded-full">
                            {msg.action}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-300 leading-tight">
                          {msg.sourceId === selectedNodeId ? (
                            <p>Envió a <span className="text-amber-500 italic">{msg.targetId.replace("PeasantFamily_", "Fam_")}</span></p>
                          ) : (
                            <p>Recibió de <span className="text-sky-400 italic">{msg.sourceId.replace("PeasantFamily_", "Fam_")}</span></p>
                          )}
                        </div>
                        {msg.detail && (
                          <div className="mt-1.5 text-[10px] text-gray-500 leading-relaxed bg-black/20 p-1.5 rounded italic">
                            {msg.detail}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-300">
            <div className="bg-black/40 border-b border-gray-800 p-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-400 animate-pulse" />
              <h3 className="font-semibold text-sm">Registro de Eventos</h3>
              <span className="ml-auto text-[10px] text-gray-500 bg-gray-800/60 px-2 py-0.5 rounded-full">{log.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {log.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-600">
                  <RadioTower className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-xs text-center italic">Esperando tráfico BESA...<br />Selecciona un nodo para detalles específicos.</p>
                </div>
              )}
              <AnimatePresence initial={false}>
                {log.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-[#14181c] p-3 rounded-lg border border-[#272d34] text-xs space-y-1 hover:border-sky-500/30 cursor-pointer transition-all"
                    onClick={() => setSelectedNodeId(msg.sourceId)}
                  >
                    <div className="flex justify-between items-center text-gray-500">
                      <span className="font-mono text-[10px]">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      <span className="text-[10px] font-bold text-sky-400 uppercase tracking-tighter">{msg.action}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400 mt-1">
                      <span className="truncate max-w-[100px] text-blue-300">
                        {msg.sourceId.replace("PeasantFamily_", "Fam_")}
                      </span>
                      <span className="text-gray-700">→</span>
                      <span className="truncate max-w-[100px] text-amber-300">
                        {msg.targetId.replace("PeasantFamily_", "Fam_")}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}