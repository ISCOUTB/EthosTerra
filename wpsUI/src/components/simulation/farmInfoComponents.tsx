"use client"

import { useState, useEffect, useRef } from "react"
import { Calendar, Heart, Coins, Sprout, Users, Star, Award, Activity, Network } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"

interface FarmInfo {
  id: string
  count: number
  life: number
  amount: number
  date: string
  farmId: string
}

interface PersonInfo {
  id: string
  role: string
  familyAlias: string
  health: number
  skills: number
  reputation: number
  money: number
  currentActivity: string
  socialNetworkSize: number
  totalInteractions: number
  date: string
}

const ROLE_LABELS: Record<string, string> = {
  AGRICULTOR: "Agricultor",
  JORNALERO: "Jornalero",
  COMERCIANTE: "Comerciante",
  GANADERO: "Ganadero",
  LIDER_COMUNITARIO: "Líder Comunitario",
  CURANDERA: "Curandera",
  CATEQUISTA: "Catequista",
  MAESTRA: "Maestra",
  AMA_DE_CASA: "Ama de Casa",
  MIGRANTE: "Migrante",
  EMPRENDEDOR: "Emprendedor",
}

const ROLE_ICONS: Record<string, string> = {
  AGRICULTOR: "🌾",
  JORNALERO: "⛏️",
  COMERCIANTE: "🏪",
  GANADERO: "🐄",
  LIDER_COMUNITARIO: "👑",
  CURANDERA: "💊",
  CATEQUISTA: "⛪",
  MAESTRA: "📚",
  AMA_DE_CASA: "🏠",
  MIGRANTE: "🚶",
  EMPRENDEDOR: "💡",
}

export default function FarmInfoComponent() {
  const socketRef = useRef<WebSocket | null>(null)
  const [farmData, setFarmData] = useState<FarmInfo[]>([])
  const [personData, setPersonData] = useState<PersonInfo[]>([])
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"familias" | "personas">("familias")
  const [currentDate, setCurrentDate] = useState<string>("")

  const connectWebSocket = () => {
    const host = typeof window !== "undefined" ? window.location.hostname : "localhost"
    const url = `ws://${host}:8000/wpsViewer`
    socketRef.current = new WebSocket(url)

    socketRef.current.onerror = () => setTimeout(connectWebSocket, 2000)

    socketRef.current.onopen = () => {
      function sendMessage() {
        try {
          socketRef.current?.send("setup")
        } catch {
          setTimeout(sendMessage, 2000)
        }
      }
      sendMessage()
    }

    socketRef.current.onmessage = (event) => {
      const prefix = event.data.substring(0, 2)
      const data = event.data.substring(2)
      switch (prefix) {
        case "j=":
          try {
            const jsonData = JSON.parse(data)
            const { name, state } = jsonData
            const parsedState = JSON.parse(state)

            if (name.includes("Person")) {
              const updated: Omit<PersonInfo, "id"> = {
                role: parsedState.role ?? "AGRICULTOR",
                familyAlias: parsedState.familyAlias ?? "",
                health: parsedState.health ?? 100,
                skills: parsedState.skills ?? 0,
                reputation: parsedState.reputation ?? 0,
                money: parsedState.money ?? 0,
                currentActivity: parsedState.currentActivity ?? "IDLE",
                socialNetworkSize: parsedState.socialNetworkSize ?? 0,
                totalInteractions: parsedState.totalInteractions ?? 0,
                date: parsedState.internalCurrentDate ?? "",
              }
              setPersonData((prev) => {
                const exists = prev.some((p) => p.id === name)
                if (exists) return prev.map((p) => p.id === name ? { ...p, ...updated } : p)
                return [...prev, { id: name, ...updated }]
              })
              if (updated.date) setCurrentDate(updated.date)
            } else {
              const updated = {
                count: parsedState.tools ?? 0,
                life: parsedState.health ?? 100,
                amount: parsedState.money ?? 0,
                date: parsedState.internalCurrentDate ?? "",
                farmId: parsedState.peasantFamilyLandAlias ?? "",
              }
              setFarmData((prev) => {
                const exists = prev.some((f) => f.id === name)
                if (exists) return prev.map((f) => f.id === name ? { ...f, ...updated } : f)
                return [...prev, { id: name, ...updated }]
              })
              if (updated.date) setCurrentDate(updated.date)
            }
          } catch {}
          break
        case "q=":
          setFarmData([])
          setPersonData([])
          break
        case "d=":
          setCurrentDate(data)
          break
      }
    }
  }

  useEffect(() => {
    if (window.WebSocket) connectWebSocket()
    return () => { socketRef.current?.close() }
  }, [])

  const getExpression = (health: number, hasHome: boolean) => {
    if (health <= 0) return "💀"
    if (!hasHome) return "👤"
    const h = Math.min(100, Math.max(0, health))
    if (h > 75) return "😄"
    if (h > 50) return "🙂"
    if (h > 20) return "😐"
    return "😫"
  }

  const getAvatarColor = (health: number) => {
    if (health <= 0) return "bg-slate-500"
    const h = Math.min(100, Math.max(0, health))
    if (h > 75) return "bg-green-500"
    if (h > 50) return "bg-yellow-500"
    if (h > 20) return "bg-orange-500"
    return "bg-red-500"
  }

  return (
    <TooltipProvider>
      <div className="h-[calc(100vh-4rem)] flex flex-col relative overflow-hidden">
        {/* Date display */}
        {currentDate && (
          <div className="bg-[#111418] text-white p-2 text-center sticky top-0 z-10 rounded-lg">
            <div className="flex items-center justify-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="font-medium">{currentDate}</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-2">
          <button
            onClick={() => setActiveTab("familias")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "familias"
                ? "bg-emerald-600 text-white"
                : "bg-[#111418] text-gray-400 hover:text-white"
            }`}
          >
            Familias ({farmData.length})
          </button>
          <button
            onClick={() => setActiveTab("personas")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "personas"
                ? "bg-violet-600 text-white"
                : "bg-[#111418] text-gray-400 hover:text-white"
            }`}
          >
            Personas ({personData.length})
          </button>
        </div>

        <ScrollArea className="flex-1 px-4 py-2 overflow-auto">
          <div className="max-w-2xl mx-auto space-y-4">
            <AnimatePresence mode="wait">
              {activeTab === "familias"
                ? farmData.map((info) => (
                    <Tooltip key={info.id}>
                      <TooltipTrigger asChild>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3 }}
                          className={`bg-[#111418] rounded-lg border shadow-sm overflow-hidden cursor-pointer hover:border-emerald-400 ${
                            selectedItem === info.id ? "border-emerald-500" : "border-transparent"
                          }`}
                          onClick={() => setSelectedItem(info.id === selectedItem ? null : info.id)}
                        >
                          <div className="flex items-center p-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white">
                            <div
                              className={`w-8 h-8 rounded-full ${getAvatarColor(info.life)} flex items-center justify-center text-lg mr-2 border border-white ${info.life <= 0 ? "opacity-25" : ""}`}
                            >
                              {getExpression(info.life, !!info.farmId)}
                            </div>
                            <h3 className="font-bold truncate text-sm flex-1">{info.id}</h3>
                          </div>
                          <div className="p-2 text-xs">
                            <div className="mb-1">
                              <div className="flex justify-between mb-0.5">
                                <span className="flex items-center gap-1 text-red-600">
                                  <Heart className="w-3 h-3" /> Health
                                </span>
                                <span>{info.life.toFixed(1)}</span>
                              </div>
                              <Progress value={info.life} className="h-1" />
                            </div>
                            {selectedItem === info.id && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-3 pt-2 border-t border-gray-700"
                              >
                                <div className="flex items-center gap-2 text-amber-600">
                                  <Coins className="w-4 h-4" />
                                  <div className="flex-1">Riqueza</div>
                                  <div className="font-medium">
                                    $ {info.amount.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 text-green-600">
                                  <Sprout className="w-4 h-4" />
                                  <div className="flex-1">Finca</div>
                                  <div className="font-medium truncate max-w-[200px]">{info.farmId || "Sin asignar"}</div>
                                </div>
                                <div className="flex items-center gap-2 text-blue-600">
                                  <Users className="w-4 h-4" />
                                  <div className="flex-1">Herramientas</div>
                                  <div className="font-medium">{info.count}</div>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent><p>Click para más detalles</p></TooltipContent>
                    </Tooltip>
                  ))
                : personData.map((person) => (
                    <Tooltip key={person.id}>
                      <TooltipTrigger asChild>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3 }}
                          className={`bg-[#111418] rounded-lg border shadow-sm overflow-hidden cursor-pointer hover:border-violet-400 ${
                            selectedItem === person.id ? "border-violet-500" : "border-transparent"
                          }`}
                          onClick={() => setSelectedItem(person.id === selectedItem ? null : person.id)}
                        >
                          <div className="flex items-center p-2 bg-gradient-to-r from-violet-700 to-violet-600 text-white">
                            <div
                              className={`w-8 h-8 rounded-full ${getAvatarColor(person.health)} flex items-center justify-center text-lg mr-2 border border-white ${person.health <= 0 ? "opacity-25" : ""}`}
                            >
                              {ROLE_ICONS[person.role] ?? "👤"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold truncate text-sm">{person.id}</h3>
                              <p className="text-violet-200 text-[10px] truncate">
                                {ROLE_LABELS[person.role] ?? person.role}
                              </p>
                            </div>
                          </div>
                          <div className="p-2 text-xs">
                            <div className="mb-1">
                              <div className="flex justify-between mb-0.5">
                                <span className="flex items-center gap-1 text-red-600">
                                  <Heart className="w-3 h-3" /> Salud
                                </span>
                                <span>{person.health.toFixed(1)}</span>
                              </div>
                              <Progress value={person.health} className="h-1" />
                            </div>
                            {selectedItem === person.id && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-3 pt-2 border-t border-gray-700"
                              >
                                <div className="flex items-center gap-2 text-amber-600">
                                  <Coins className="w-4 h-4" />
                                  <div className="flex-1">Dinero</div>
                                  <div className="font-medium">
                                    $ {person.money.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 text-yellow-500">
                                  <Star className="w-4 h-4" />
                                  <div className="flex-1">Reputación</div>
                                  <div className="font-medium">{(person.reputation * 100).toFixed(1)}%</div>
                                </div>
                                <div>
                                  <div className="flex justify-between mb-0.5 text-sky-400">
                                    <span className="flex items-center gap-1">
                                      <Award className="w-3 h-3" /> Habilidades
                                    </span>
                                    <span>{(person.skills * 100).toFixed(1)}%</span>
                                  </div>
                                  <Progress value={person.skills * 100} className="h-1" />
                                </div>
                                <div className="flex items-center gap-2 text-sky-500">
                                  <Network className="w-4 h-4" />
                                  <div className="flex-1">Red social</div>
                                  <div className="font-medium">{person.socialNetworkSize} personas</div>
                                </div>
                                <div className="flex items-center gap-2 text-purple-400">
                                  <Activity className="w-4 h-4" />
                                  <div className="flex-1">Actividad</div>
                                  <div className="font-medium truncate max-w-[140px]">{person.currentActivity}</div>
                                </div>
                                <div className="flex items-center gap-2 text-gray-400">
                                  <Users className="w-4 h-4" />
                                  <div className="flex-1">Interacciones</div>
                                  <div className="font-medium">{person.totalInteractions}</div>
                                </div>
                                <div className="text-gray-500 truncate text-[10px]">
                                  Familia: {person.familyAlias || "—"}
                                </div>
                              </motion.div>
                            )}
                          </div>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent><p>Click para más detalles</p></TooltipContent>
                    </Tooltip>
                  ))}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  )
}
