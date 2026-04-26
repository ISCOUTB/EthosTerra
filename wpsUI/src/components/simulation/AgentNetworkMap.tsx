"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Landmark, Gavel, Users, ShoppingCart, Tractor, Activity,
  RadioTower, Wifi, WifiOff, X, Inbox, ArrowDownLeft, Calendar,
  Skull, User, Sprout, Zap, DollarSign, Hammer, Package,
  Heart, BookOpen, Home, Crown, UserCog
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
  category: CategoryKey | null;
}

export const INTERACTION_CATEGORIES = [
  { key: "MarketPlace",       label: "Mercado",    color: "#f59e0b", particleColor: "#fbbf24", defaultOn: true  },
  { key: "BankOffice",        label: "Banco",      color: "#10b981", particleColor: "#34d399", defaultOn: true  },
  { key: "CivicAuthority",    label: "Gobierno",   color: "#a855f7", particleColor: "#c084fc", defaultOn: true  },
  { key: "CommunityDynamics", label: "Comunidad",  color: "#ec4899", particleColor: "#f472b6", defaultOn: true  },
  { key: "AgroEcosystem_harvest",  label: "Cosecha",  color: "#84cc16", particleColor: "#bef264", defaultOn: true  },
  { key: "AgroEcosystem_pests",    label: "Pesticidas", color: "#65a30d", particleColor: "#a3e635", defaultOn: true  },
  { key: "AgroEcosystem_planting", label: "Siembra",  color: "#3f6212", particleColor: "#4d7c0f", defaultOn: false },
  { key: "Perturbation", label: "Perturbación", color: "#ef4444", particleColor: "#f87171", defaultOn: true  },
] as const;

export type CategoryKey = typeof INTERACTION_CATEGORIES[number]["key"];

/* ────────────────────────────────────────────────────────────────────────────
   Roles de Persona
   ──────────────────────────────────────────────────────────────────────────── */
const ROLE_ICONS: Record<string, React.ElementType> = {
  AGRICULTOR:        Sprout,
  JORNALERO:         Hammer,
  COMERCIANTE:       Package,
  CURANDERA:         Heart,
  MAESTRA:           BookOpen,
  AMA_DE_CASA:       Home,
  LIDER_COMUNITARIO: Crown,
  EMPLEADO_PUBLICO:  UserCog,
  RENTISTA:          DollarSign,
};

const ROLE_LABELS: Record<string, string> = {
  AGRICULTOR:        "Agricultor",
  JORNALERO:         "Jornalero",
  COMERCIANTE:       "Comerciante",
  CURANDERA:         "Curandera",
  MAESTRA:           "Maestra",
  AMA_DE_CASA:       "Ama de Casa",
  LIDER_COMUNITARIO: "Líder",
  EMPLEADO_PUBLICO:  "Empleado",
  RENTISTA:          "Rentista",
};

/* Colores de persona según salud */
function personNodeColor(health: number): string {
  if (health <= 0)  return "text-slate-400 border-slate-600 bg-slate-600/20";
  if (health < 30)  return "text-red-400 border-red-600 bg-red-600/20";
  if (health < 60)  return "text-yellow-400 border-yellow-600 bg-yellow-600/20";
  return "text-violet-400 border-violet-500 bg-violet-500/20";
}

/* ────────────────────────────────────────────────────────────────────────────
   Estado de agentes
   ──────────────────────────────────────────────────────────────────────────── */
interface FamilyState {
  health: number;
  farmId: string;
  money: number;
  // FamilyCoordinator-specific (optional — not present for legacy PeasantFamily)
  familyMoney?: number;
  memberCount?: number;
  members?: string[];
}

interface PersonState {
  role: string;
  familyAlias: string;
  health: number;
  skills: number;
  reputation: number;
  money: number;
  currentActivity: string;
  socialNetworkSize: number;
  totalInteractions: number;
  age: number;
  sex: string;
  etapaVida: string;
  spouseAlias: string;
  socialNetwork: string[];
}

/* ────────────────────────────────────────────────────────────────────────────
   Nodos del grafo
   ──────────────────────────────────────────────────────────────────────────── */
interface AgentNode {
  id: string;
  label: string;
  type: "hub" | "family" | "person";
  x: number;
  y: number;
  icon: React.ElementType;
  color: string;
  parentId?: string; // sólo para nodos persona
}

/* ────────────────────────────────────────────────────────────────────────────
   Clasificación de mensajes
   ──────────────────────────────────────────────────────────────────────────── */
function classifyMessage(sourceId: string, targetId: string, action: string): CategoryKey | null {
  const ids = [sourceId, targetId];
  if (ids.some(id => id.includes("AgroEcosystem"))) {
    const a = action.toLowerCase();
    if (a.includes("harvest") || a.includes("crop_harvest")) return "AgroEcosystem_harvest";
    if (a.includes("pest") || a.includes("pesticide") || a.includes("managepest")) return "AgroEcosystem_pests";
    return "AgroEcosystem_planting";
  }
  if (ids.some(id => id.includes("Perturbation") || id.includes("wpsPerturbation"))) return "Perturbation";
  if (ids.some(id => id.includes("MarketPlace")))       return "MarketPlace";
  if (ids.some(id => id.includes("BankOffice")))        return "BankOffice";
  if (ids.some(id => id.includes("CivicAuthority")))    return "CivicAuthority";
  if (ids.some(id => id.includes("CommunityDynamics"))) return "CommunityDynamics";
  return null;
}

function categoryColor(category: CategoryKey | null): string {
  if (!category) return "#38bdf8";
  return INTERACTION_CATEGORIES.find(c => c.key === category)?.particleColor ?? "#38bdf8";
}

/* ────────────────────────────────────────────────────────────────────────────
   Nodos Hub (fijos)
   ──────────────────────────────────────────────────────────────────────────── */
const HUBS: AgentNode[] = [
  { id: "AgroEcosystem",    label: "Tierra",       type: "hub", x: 50, y: 50, icon: Sprout,       color: "text-lime-400 border-lime-500 bg-lime-500/20" },
  { id: "MarketPlace",      label: "Mercado",      type: "hub", x: 35, y: 39, icon: ShoppingCart, color: "text-amber-400 border-amber-500 bg-amber-500/20" },
  { id: "BankOffice",       label: "Banco",        type: "hub", x: 65, y: 39, icon: Landmark,     color: "text-emerald-400 border-emerald-500 bg-emerald-500/20" },
  { id: "CivicAuthority",   label: "Gobierno",     type: "hub", x: 35, y: 61, icon: Gavel,        color: "text-purple-400 border-purple-500 bg-purple-500/20" },
  { id: "CommunityDynamics",label: "Comunidad",    type: "hub", x: 65, y: 61, icon: Users,        color: "text-pink-400 border-pink-500 bg-pink-500/20" },
  { id: "wpsPerturbation",  label: "Perturbación", type: "hub", x: 50, y: 26, icon: Zap,          color: "text-red-400 border-red-500 bg-red-500/20" },
];

const HUB_IDS = new Set(HUBS.map((h) => h.id));

const FAMILY_ORBIT_RADIUS = 42;
const PERSON_ORBIT_RADIUS = 7; // % alrededor del nodo de familia

/* ────────────────────────────────────────────────────────────────────────────
   Helpers de posicionamiento
   ──────────────────────────────────────────────────────────────────────────── */
function buildFamilyNodes(familyIds: string[]): AgentNode[] {
  const count = familyIds.length;
  if (count === 0) return [];
  return familyIds.map((id, i) => {
    const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
    // Extract index from both "PeasantFamily3" and "Family3Coordinator" patterns
    const numMatch = id.match(/Family(\d+)/i) || id.match(/(\d+)/);
    const num = numMatch ? numMatch[1] : `${i + 1}`;
    return {
      id,
      label: `Familia ${num}`,
      type: "family" as const,
      x: 50 + FAMILY_ORBIT_RADIUS * Math.cos(angle),
      y: 50 + FAMILY_ORBIT_RADIUS * Math.sin(angle),
      icon: Tractor,
      color: "text-blue-400 border-blue-500 bg-blue-900/30",
    };
  });
}

function buildPersonNodes(
  familyNodes: AgentNode[],
  personStates: Record<string, PersonState>,
): AgentNode[] {
  const nodes: AgentNode[] = [];
  for (const famNode of familyNodes) {
    const persons = Object.entries(personStates).filter(([, ps]) => ps.familyAlias === famNode.id);
    const count = persons.length;
    if (count === 0) continue;
    persons.forEach(([name, ps], i) => {
      const angle = (i / count) * 2 * Math.PI;
      nodes.push({
        id: name,
        label: ROLE_LABELS[ps.role] || ps.role,
        type: "person",
        x: famNode.x + PERSON_ORBIT_RADIUS * Math.cos(angle),
        y: famNode.y + PERSON_ORBIT_RADIUS * Math.sin(angle),
        icon: ROLE_ICONS[ps.role] || User,
        color: personNodeColor(ps.health),
        parentId: famNode.id,
      });
    });
  }
  return nodes;
}

/* ────────────────────────────────────────────────────────────────────────────
   Componente principal
   ──────────────────────────────────────────────────────────────────────────── */
export function AgentNetworkMap() {
  const [messages, setMessages]               = useState<BesaMessage[]>([]);
  const [log, setLog]                         = useState<BesaMessage[]>([]);
  const [isConnected, setIsConnected]         = useState(false);
  const [currentDate, setCurrentDate]         = useState<string>("Esperando...");
  const [selectedNodeId, setSelectedNodeId]   = useState<string | null>(null);
  const [discoveredFamilies, setDiscoveredFamilies] = useState<string[]>([]);
  const [agentStates, setAgentStates]         = useState<Record<string, FamilyState>>({});
  const [personStates, setPersonStates]       = useState<Record<string, PersonState>>({});
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Métricas derivadas ────────────────────────────────────────────────
  const workingAgents = useMemo(
    () => Object.values(agentStates).filter(s => s.farmId && s.farmId !== "" && s.farmId !== "Unassigned" && s.health > 0).length,
    [agentStates]
  );

  const avgMoney = useMemo(() => {
    const vals = Object.values(agentStates).filter(s => s.health > 0).map(s => s.money);
    if (vals.length === 0) return 0;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [agentStates]);

  const totalPersons = useMemo(() => Object.keys(personStates).length, [personStates]);

  // ── Filtros de interacción ─────────────────────────────────────────────
  const [filters, setFilters] = useState<Record<CategoryKey, boolean>>(
    () => Object.fromEntries(INTERACTION_CATEGORIES.map(c => [c.key, c.defaultOn])) as Record<CategoryKey, boolean>
  );
  const [showFilters, setShowFilters] = useState(false);

  const toggleFilter = (key: CategoryKey) =>
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));

  const isVisible = (msg: BesaMessage) => msg.category === null || filters[msg.category];

  // ── Nodos dinámicos ───────────────────────────────────────────────────
  const familyNodes = useMemo(() => buildFamilyNodes(discoveredFamilies), [discoveredFamilies]);

  const personNodes = useMemo(
    () => buildPersonNodes(familyNodes, personStates),
    [familyNodes, personStates]
  );

  const allNodes = useMemo(() => [...HUBS, ...familyNodes, ...personNodes], [familyNodes, personNodes]);

  // ── Resolución flexible de nodos ──────────────────────────────────────
  const resolveNode = useCallback(
    (alias: string) => {
      const exact = allNodes.find((n) => n.id === alias);
      if (exact) return exact;
      return allNodes.find((n) => n.type === "hub" && (alias.includes(n.id) || n.id.includes(alias)));
    },
    [allNodes]
  );

  // ── Mensajes filtrados para el nodo seleccionado ──────────────────────
  const selectedNodeMessages = useMemo(() => {
    if (!selectedNodeId) return [];
    return log.filter(msg =>
      (msg.targetId === selectedNodeId || msg.sourceId === selectedNodeId) && isVisible(msg)
    );
  }, [log, selectedNodeId, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Contador de mensajes recibidos por nodo ───────────────────────────
  const nodeIncomingCount = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of log) {
      const target = resolveNode(m.targetId);
      if (target) map[target.id] = (map[target.id] || 0) + 1;
    }
    return map;
  }, [log, resolveNode]);

  // ── Personas agrupadas por familia (para panel derecho) ───────────────
  const personsForSelectedFamily = useMemo(() => {
    if (!selectedNodeId) return [];
    return Object.entries(personStates)
      .filter(([, ps]) => ps.familyAlias === selectedNodeId)
      .map(([name, ps]) => ({ name, ...ps }));
  }, [selectedNodeId, personStates]);

  // ── Persona seleccionada (si el nodo es de tipo person) ───────────────
  const selectedPersonState = useMemo(() => {
    if (!selectedNodeId) return null;
    return personStates[selectedNodeId] ?? null;
  }, [selectedNodeId, personStates]);

  // ── Conexión al WebSocket de ViewerLens ───────────────────────────────
  useEffect(() => {
    const host = window.location.hostname;
    const wsUrl = `ws://${host}:8000/wpsViewer`;
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
                // Descubrir familias (PeasantFamily legado o FamilyCoordinator nuevo)
                [data.from, data.to].forEach(agentName => {
                  if (agentName && !HUB_IDS.has(agentName)
                      && (agentName.includes("PeasantFamily") || agentName.includes("Coordinator"))
                      && !agentName.includes("Person")) {
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

                const category = classifyMessage(data.from, data.to, data.action || "");
                const newMsg: BesaMessage = {
                  id: Math.random().toString(36).substring(2, 9),
                  sourceId: data.from,
                  targetId: data.to,
                  action: data.action || "Interacción BESA",
                  detail: data.detail || "",
                  timestamp: Date.now(),
                  category,
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

          // ── Estado JSON del agente ────────────────────────────────
          case "j=": {
            try {
              const data = JSON.parse(payload);
              if (data && data.name) {
                const agentName: string = data.name;
                const parsedState = typeof data.state === "string" ? JSON.parse(data.state) : data.state;

                const isPersonAgent     = agentName.includes("Person");
                const isCoordinator     = agentName.includes("Coordinator") || parsedState.familyAlias !== undefined;
                const isPeasantFamily   = agentName.includes("PeasantFamily");

                if (isPersonAgent && !isCoordinator) {
                  // ── Agente Person individual ─────────────────────
                  setPersonStates(prev => ({
                    ...prev,
                    [agentName]: {
                      role:              parsedState.role              ?? "AGRICULTOR",
                      familyAlias:       parsedState.familyAlias       ?? "",
                      health:            parsedState.health            ?? 100,
                      skills:            parsedState.skills            ?? 0,
                      reputation:        parsedState.reputation        ?? 0,
                      money:             parsedState.money             ?? 0,
                      currentActivity:   parsedState.currentActivity   ?? "",
                      socialNetworkSize: parsedState.socialNetworkSize ?? 0,
                      totalInteractions: parsedState.totalInteractions ?? 0,
                      age:               parsedState.age               ?? 0,
                      sex:               parsedState.sex               ?? "",
                      etapaVida:         parsedState.etapaVida         ?? "",
                      spouseAlias:       parsedState.spouseAlias       ?? "",
                      socialNetwork:     Array.isArray(parsedState.socialNetwork) ? parsedState.socialNetwork : [],
                    }
                  }));
                } else if (isCoordinator) {
                  // ── FamilyCoordinator — nuevo modelo ────────────
                  setAgentStates(prev => ({
                    ...prev,
                    [agentName]: {
                      health:      100,
                      farmId:      parsedState.landAlias    ?? "",
                      money:       parsedState.familyMoney  ?? 0,
                      familyMoney: parsedState.familyMoney  ?? 0,
                      memberCount: parsedState.memberCount  ?? 0,
                      members:     parsedState.members      ?? [],
                    }
                  }));

                  if (!HUB_IDS.has(agentName)) {
                    setDiscoveredFamilies((prev) => {
                      if (prev.includes(agentName)) return prev;
                      return [...prev, agentName].sort((a, b) => {
                        const na = parseInt(a.match(/Family(\d+)/i)?.[1] || a.replace(/\D+/g, "") || "0");
                        const nb = parseInt(b.match(/Family(\d+)/i)?.[1] || b.replace(/\D+/g, "") || "0");
                        return na - nb;
                      });
                    });
                  }
                } else if (isPeasantFamily) {
                  // ── Agente PeasantFamily (legado) ────────────────
                  const health: number = parsedState.health ?? 100;
                  const farmId: string = parsedState.peasantFamilyLandAlias || "";
                  const money: number  = parsedState.money ?? 0;

                  setAgentStates(prev => ({ ...prev, [agentName]: { health, farmId, money } }));

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
              }
            } catch { /* ignore */ }
            break;
          }

          // ── Reset de simulación ───────────────────────────────────
          case "q=": {
            setDiscoveredFamilies([]);
            setAgentStates({});
            setPersonStates({});
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
        if (alive) reconnectTimer.current = setTimeout(connect, 3000);
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
  const selectedNode = selectedNodeId ? allNodes.find((n) => n.id === selectedNodeId) : null;

  // ── Personas de cada familia para badges ──────────────────────────────
  const personCountPerFamily = useMemo(() => {
    const map: Record<string, number> = {};
    for (const ps of Object.values(personStates)) {
      if (ps.familyAlias) map[ps.familyAlias] = (map[ps.familyAlias] || 0) + 1;
    }
    return map;
  }, [personStates]);

  // ── Aristas de red social (para el nodo persona seleccionado) ──────────
  // Cuando se selecciona una persona, mostramos líneas a cada contacto de
  // su socialNetwork que sea visible como nodo en el mapa.
  const socialEdges = useMemo(() => {
    if (!selectedNodeId) return [];
    const ps = personStates[selectedNodeId];
    if (!ps || !ps.socialNetwork.length) return [];
    const sourceNode = allNodes.find(n => n.id === selectedNodeId);
    if (!sourceNode) return [];

    return ps.socialNetwork
      .map(alias => allNodes.find(n => n.id === alias))
      .filter((n): n is AgentNode => n !== undefined)
      .map(targetNode => ({ source: sourceNode, target: targetNode }));
  }, [selectedNodeId, personStates, allNodes]);

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#0f1417] text-white p-2 pl-20 lg:pl-24 gap-2 font-archivo overflow-hidden">
      {/* Panel Principal: Mapa de Red + Consola */}
      <div className="flex-1 flex flex-col lg:flex-row gap-2 relative overflow-hidden">

        {/* Controles */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
          <div className="flex items-center gap-4 bg-black/50 backdrop-blur px-4 py-2 rounded-lg border border-gray-800">
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
              <Tractor className="w-3.5 h-3.5 text-blue-400" />
              <span>{discoveredFamilies.length} familias</span>
              {totalPersons > 0 && (
                <>
                  <div className="w-[1px] h-4 bg-gray-700 mx-1" />
                  <User className="w-3.5 h-3.5 text-violet-400" />
                  <span className="text-violet-300 font-semibold">{totalPersons} personas</span>
                </>
              )}
              <div className="w-[1px] h-4 bg-gray-700 mx-1" />
              <Sprout className="w-3.5 h-3.5 text-lime-400" />
              <span className="text-lime-300 font-semibold">{workingAgents} con tierra</span>
              <div className="w-[1px] h-4 bg-gray-700 mx-1" />
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300 font-semibold font-mono">
                {avgMoney.toLocaleString("es-CO")}
              </span>
              <div className="w-[1px] h-4 bg-gray-700 mx-1" />
              <Activity className="w-3.5 h-3.5" />
              <span>{log.filter(isVisible).length} eventos</span>
              <div className="w-[1px] h-4 bg-gray-700 mx-1" />
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-mono font-bold text-base text-sky-200 tracking-wide">{currentDate}</span>
            </div>
            <div className="w-[1px] h-8 bg-gray-700 mx-2" />
            <button
              onClick={() => setShowFilters(v => !v)}
              className={cn(
                "text-xs px-2 py-1 rounded border transition-colors font-semibold",
                showFilters
                  ? "bg-primary/20 border-primary text-primary"
                  : "border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white"
              )}
            >
              Filtros
            </button>
          </div>

          {/* Panel de filtros desplegable */}
          {showFilters && (
            <div className="flex flex-wrap gap-1.5 bg-black/60 backdrop-blur px-3 py-2 rounded-lg border border-gray-800">
              {INTERACTION_CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => toggleFilter(cat.key)}
                  className={cn(
                    "text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all",
                    filters[cat.key]
                      ? "opacity-100 border-transparent text-black"
                      : "opacity-40 border-gray-600 text-gray-400 bg-transparent"
                  )}
                  style={filters[cat.key] ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}
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

          {/* Líneas punteadas familia↔persona */}
          {personNodes.map((pNode) => {
            const famNode = familyNodes.find(f => f.id === pNode.parentId);
            if (!famNode) return null;
            return (
              <line
                key={`pline-${pNode.id}`}
                x1={`${famNode.x}%`} y1={`${famNode.y}%`}
                x2={`${pNode.x}%`}   y2={`${pNode.y}%`}
                stroke="#7c3aed" strokeWidth="0.8" opacity="0.5"
                strokeDasharray="2 2"
              />
            );
          })}

          {/* Líneas de red social (cuando hay persona seleccionada) */}
          {socialEdges.map(({ source, target }) => (
            <line
              key={`social-${source.id}-${target.id}`}
              x1={`${source.x}%`} y1={`${source.y}%`}
              x2={`${target.x}%`} y2={`${target.y}%`}
              stroke="#22d3ee" strokeWidth="1" opacity="0.7"
              strokeDasharray="3 3"
              filter="url(#glow)"
            />
          ))}

          {/* Líneas activas cuando hay mensajes en tránsito */}
          {messages.filter(isVisible).map((msg) => {
            const source = resolveNode(msg.sourceId);
            const target = resolveNode(msg.targetId);
            if (!source || !target || source.id === target.id) return null;
            const color = categoryColor(msg.category);
            return (
              <line
                key={`active-${msg.id}`}
                x1={`${source.x}%`} y1={`${source.y}%`}
                x2={`${target.x}%`} y2={`${target.y}%`}
                stroke={color} strokeWidth="1.5" opacity="0.6"
                filter="url(#glow)"
              />
            );
          })}

          {/* Partículas animadas */}
          <AnimatePresence>
            {messages.filter(isVisible).map((msg) => {
              const source = resolveNode(msg.sourceId);
              const target = resolveNode(msg.targetId);
              if (!source || !target || source.id === target.id) return null;
              const color = categoryColor(msg.category);
              return (
                <motion.circle
                  key={msg.id}
                  r="5"
                  fill={color}
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
          const isHub    = node.type === "hub";
          const isPerson = node.type === "person";
          const isSelected = selectedNodeId === node.id;
          const count = nodeIncomingCount[node.id] || 0;

          let nodeColor = node.color;
          let nodeIcon  = node.icon;

          if (node.type === "family") {
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

          if (isPerson) {
            const ps = personStates[node.id];
            if (ps) nodeColor = personNodeColor(ps.health);
            nodeIcon = node.icon;
          }

          const IconComponent = nodeIcon;
          const personBadge = node.type === "family" ? (personCountPerFamily[node.id] || 0) : 0;

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
              title={isPerson ? `${node.label} (${node.id})` : undefined}
            >
              <div className="relative">
                <div
                  className={cn(
                    "rounded-full border shadow-[0_0_15px_rgba(0,0,0,0.5)] flex items-center justify-center transition-all",
                    nodeColor,
                    isHub    && "p-1.5 w-12 h-12 border-2",
                    !isHub && !isPerson && "p-1.5 w-8 h-8",
                    isPerson && "p-1 w-5 h-5",
                    isSelected && "ring-2 ring-sky-400 ring-offset-2 ring-offset-[#14181c]",
                    node.type === "family" && agentStates[node.id]?.health <= 0 && "opacity-25",
                    isPerson  && (personStates[node.id]?.health ?? 100) <= 0 && "opacity-25"
                  )}
                >
                  <IconComponent className={cn(isHub ? "w-6 h-6" : isPerson ? "w-2.5 h-2.5" : "w-4 h-4")} />
                </div>

                {/* Badge de mensajes recibidos */}
                {count > 0 && !isPerson && (
                  <span className="absolute -top-1 -right-1 bg-sky-500 text-white text-[8px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-lg border border-[#14181c]">
                    {count > 99 ? "99+" : count}
                  </span>
                )}

                {/* Badge de personas (sólo en nodos familia) */}
                {personBadge > 0 && (
                  <span className="absolute -bottom-1 -right-1 bg-violet-600 text-white text-[8px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-lg border border-[#14181c]">
                    {personBadge}
                  </span>
                )}
              </div>

              {/* Etiqueta de texto (no se muestra en nodos persona para evitar saturación) */}
              {!isPerson && (
                <span className="text-[9px] mt-1 font-bold bg-[#0f1417]/80 border border-gray-800 px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                  {node.label}
                </span>
              )}
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
                        <span className="text-blue-300 truncate">{msg.sourceId}</span>
                        <span className="text-gray-700">→</span>
                        <span className="text-amber-300 truncate">{msg.targetId}</span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              <div className="px-4 py-2 border-t border-gray-800 bg-black/20 text-[10px] text-gray-500 flex justify-between">
                <span>{selectedNodeMessages.length} mensajes</span>
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
                  <p className="text-[10px] text-gray-500 font-mono italic truncate max-w-[160px]">
                    {selectedNodeId}
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

            {/* ── Información de Estado: Familia ── */}
            {agentStates[selectedNodeId] && (
              <div className="p-3 bg-black/20 border-b border-gray-800 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  {agentStates[selectedNodeId].memberCount !== undefined ? (
                    /* FamilyCoordinator card */
                    <>
                      <div className="p-2 bg-[#14181c] rounded-lg border border-gray-800">
                        <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Miembros</p>
                        <p className="text-xs font-mono font-bold text-violet-300">
                          {agentStates[selectedNodeId].memberCount}
                        </p>
                      </div>
                      <div className="p-2 bg-[#14181c] rounded-lg border border-gray-800">
                        <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Fondo Fam.</p>
                        <p className="text-xs font-mono text-emerald-400 font-bold truncate">
                          ${(agentStates[selectedNodeId].familyMoney ?? 0).toLocaleString("es-CO")}
                        </p>
                      </div>
                      <div className="p-2 bg-[#14181c] rounded-lg border border-gray-800">
                        <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Tierra</p>
                        <p className="text-xs font-mono text-amber-500 truncate">
                          {agentStates[selectedNodeId].farmId || "Sin Tierras"}
                        </p>
                      </div>
                    </>
                  ) : (
                    /* PeasantFamily legacy card */
                    <>
                      <div className="p-2 bg-[#14181c] rounded-lg border border-gray-800">
                        <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Vitalidad</p>
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            agentStates[selectedNodeId].health > 0 ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" : "bg-gray-600"
                          )} />
                          <span className="text-xs font-mono font-bold">{agentStates[selectedNodeId].health}%</span>
                        </div>
                      </div>
                      <div className="p-2 bg-[#14181c] rounded-lg border border-gray-800">
                        <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Dinero</p>
                        <p className="text-xs font-mono text-emerald-400 font-bold truncate">
                          ${agentStates[selectedNodeId].money.toLocaleString("es-CO")}
                        </p>
                      </div>
                      <div className="p-2 bg-[#14181c] rounded-lg border border-gray-800">
                        <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Tierra</p>
                        <p className="text-xs font-mono text-amber-500 truncate">
                          {agentStates[selectedNodeId].farmId || "Sin Tierras"}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ── Información de Estado: Persona ── */}
            {selectedPersonState && (
              <div className="p-3 bg-black/20 border-b border-gray-800 space-y-2">
                {/* Rol */}
                <div className="flex items-center gap-2">
                  <div className={cn("p-1 rounded-full border", personNodeColor(selectedPersonState.health))}>
                    {React.createElement(ROLE_ICONS[selectedPersonState.role] || User, { className: "w-3 h-3" })}
                  </div>
                  <span className="text-xs font-bold text-violet-300">
                    {ROLE_LABELS[selectedPersonState.role] || selectedPersonState.role}
                  </span>
                  <span className="ml-auto text-[10px] text-gray-500 font-mono">
                    {selectedPersonState.familyAlias}
                  </span>
                </div>
                {/* Demographics row */}
                {(selectedPersonState.age > 0 || selectedPersonState.etapaVida) && (
                  <div className="flex items-center gap-2 text-[10px]">
                    {selectedPersonState.age > 0 && (
                      <span className="bg-[#14181c] border border-gray-800 px-2 py-0.5 rounded font-mono text-gray-300">
                        {selectedPersonState.age} años
                      </span>
                    )}
                    {selectedPersonState.sex && (
                      <span className={cn(
                        "px-2 py-0.5 rounded font-bold",
                        selectedPersonState.sex === "MASCULINO"
                          ? "bg-blue-900/40 text-blue-300 border border-blue-800"
                          : "bg-pink-900/40 text-pink-300 border border-pink-800"
                      )}>
                        {selectedPersonState.sex === "MASCULINO" ? "♂" : "♀"}
                      </span>
                    )}
                    {selectedPersonState.etapaVida && (
                      <span className="bg-[#14181c] border border-gray-800 px-2 py-0.5 rounded text-violet-300 italic truncate">
                        {selectedPersonState.etapaVida.replace(/_/g, " ").toLowerCase()}
                      </span>
                    )}
                    {selectedPersonState.spouseAlias && (
                      <span className="ml-auto text-[9px] text-pink-400 truncate" title={selectedPersonState.spouseAlias}>
                        ♥ {selectedPersonState.spouseAlias.split("_").pop()}
                      </span>
                    )}
                  </div>
                )}
                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: "Salud",      value: `${selectedPersonState.health}%`,      color: "text-red-400" },
                    { label: "Skills",     value: selectedPersonState.skills.toFixed(2),  color: "text-amber-400" },
                    { label: "Reputación", value: `${Math.round(selectedPersonState.reputation * 100)}%`, color: "text-purple-400" },
                    { label: "Dinero",     value: `$${selectedPersonState.money.toLocaleString("es-CO")}`, color: "text-emerald-400" },
                    { label: "Red Social", value: `${selectedPersonState.socialNetworkSize} p.`, color: "text-pink-400" },
                    { label: "Interacc.",  value: `${selectedPersonState.totalInteractions}`, color: "text-sky-400" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="p-1.5 bg-[#14181c] rounded border border-gray-800">
                      <p className="text-[8px] text-gray-500 uppercase font-bold">{label}</p>
                      <p className={cn("text-[10px] font-mono font-bold truncate", color)}>{value}</p>
                    </div>
                  ))}
                </div>
                {selectedPersonState.currentActivity && (
                  <p className="text-[10px] text-gray-400 italic bg-black/20 px-2 py-1 rounded truncate">
                    ▶ {selectedPersonState.currentActivity}
                  </p>
                )}
              </div>
            )}

            {/* ── Red Social de la persona seleccionada ── */}
            {selectedPersonState && selectedPersonState.socialNetwork.length > 0 && (
              <div className="border-b border-gray-800">
                <div className="px-4 py-2 text-[10px] uppercase font-bold text-cyan-400 bg-[#14181c] border-b border-gray-800 flex items-center gap-2">
                  <Users className="w-3 h-3" />
                  <span>Red Social ({selectedPersonState.socialNetwork.length})</span>
                  <span className="ml-auto text-[9px] text-gray-600 normal-case font-normal italic">
                    líneas cyan en el mapa
                  </span>
                </div>
                <div className="max-h-32 overflow-y-auto custom-scrollbar">
                  {selectedPersonState.socialNetwork.map(alias => {
                    const contact = personStates[alias];
                    const isOnMap  = allNodes.some(n => n.id === alias);
                    const RoleIcon = contact ? (ROLE_ICONS[contact.role] || User) : User;
                    const isSpouse = selectedPersonState.spouseAlias === alias;
                    return (
                      <button
                        key={alias}
                        onClick={() => isOnMap ? setSelectedNodeId(alias) : undefined}
                        disabled={!isOnMap}
                        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 transition-colors text-left border-b border-gray-800/30 last:border-0 disabled:opacity-40 disabled:cursor-default"
                      >
                        {contact ? (
                          <div className={cn("p-0.5 rounded-full border flex-shrink-0", personNodeColor(contact.health))}>
                            <RoleIcon className="w-2 h-2" />
                          </div>
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full bg-gray-700 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-mono text-gray-300 truncate">{alias}</p>
                          {contact && (
                            <p className="text-[8px] text-gray-500">
                              {ROLE_LABELS[contact.role] || contact.role}
                              {contact.age > 0 && ` · ${contact.age}a`}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-1">
                          {isSpouse && <span className="text-[9px] text-pink-400">♥</span>}
                          {isOnMap && <span className="text-[8px] text-cyan-600">→</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Lista de personas en la familia seleccionada ── */}
            {personsForSelectedFamily.length > 0 && (
              <div className="border-b border-gray-800">
                <div className="px-4 py-2 text-[10px] uppercase font-bold text-violet-400 bg-[#14181c] border-b border-gray-800 flex items-center gap-2">
                  <User className="w-3 h-3" />
                  <span>Personas de esta familia ({personsForSelectedFamily.length})</span>
                </div>
                <div className="max-h-40 overflow-y-auto custom-scrollbar">
                  {personsForSelectedFamily.map(p => {
                    const RoleIcon = ROLE_ICONS[p.role] || User;
                    return (
                      <button
                        key={p.name}
                        onClick={() => setSelectedNodeId(p.name)}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors text-left border-b border-gray-800/50 last:border-0"
                      >
                        <div className={cn("p-1 rounded-full border flex-shrink-0", personNodeColor(p.health))}>
                          <RoleIcon className="w-2.5 h-2.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-[10px] font-semibold text-gray-200 truncate">
                              {ROLE_LABELS[p.role] || p.role}
                            </p>
                            {p.sex && (
                              <span className={cn("text-[8px] font-bold",
                                p.sex === "MASCULINO" ? "text-blue-400" : "text-pink-400"
                              )}>
                                {p.sex === "MASCULINO" ? "♂" : "♀"}
                              </span>
                            )}
                            {p.age > 0 && (
                              <span className="text-[8px] text-gray-500 font-mono">{p.age}a</span>
                            )}
                          </div>
                          {p.etapaVida && (
                            <p className="text-[8px] text-violet-400/70 italic">
                              {p.etapaVida.replace(/_/g, " ").toLowerCase()}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-[9px] text-red-400 font-mono">{p.health}%</p>
                          <p className="text-[8px] text-gray-600">{p.totalInteractions} int.</p>
                        </div>
                      </button>
                    );
                  })}
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
                    {selectedNodeMessages.map((msg) => {
                      const color = categoryColor(msg.category);
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="bg-[#14181c]/80 p-2.5 rounded-lg border border-gray-800/50 transition-all group"
                          style={{ borderLeftColor: color, borderLeftWidth: 2 }}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] font-mono opacity-60" style={{ color }}>
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 rounded-full" style={{ color, backgroundColor: color + "22" }}>
                              {msg.action}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-300 leading-tight">
                            {msg.sourceId === selectedNodeId ? (
                              <p>Envió a <span className="text-amber-500 italic">{msg.targetId}</span></p>
                            ) : (
                              <p>Recibió de <span className="text-sky-400 italic">{msg.sourceId}</span></p>
                            )}
                          </div>
                          {msg.detail && (
                            <div className="mt-1.5 text-[10px] text-gray-500 leading-relaxed bg-black/20 p-1.5 rounded italic">
                              {msg.detail}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
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
                {log.filter(isVisible).map((msg) => {
                  const color = categoryColor(msg.category);
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-[#14181c] p-3 rounded-lg border border-[#272d34] text-xs space-y-1 hover:opacity-90 cursor-pointer transition-all"
                      style={{ borderLeftColor: color, borderLeftWidth: 2 }}
                      onClick={() => setSelectedNodeId(msg.sourceId)}
                    >
                      <div className="flex justify-between items-center text-gray-500">
                        <span className="font-mono text-[10px]">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-tighter" style={{ color }}>
                          {msg.action}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400 mt-1">
                        <span className="truncate max-w-[100px] text-blue-300">{msg.sourceId}</span>
                        <span className="text-gray-700">→</span>
                        <span className="truncate max-w-[100px] text-amber-300">{msg.targetId}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
