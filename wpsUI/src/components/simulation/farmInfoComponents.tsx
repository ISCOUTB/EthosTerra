"use client"

import { useState, useEffect, useRef } from "react"
import { Calendar, Heart, Coins, Sprout, Users } from "lucide-react"
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

const initialData: FarmInfo[] = []

export default function FarmInfoComponent() {
  const socketRef = useRef<WebSocket | null>(null)
  const [farmData, setFarmData] = useState<FarmInfo[]>(initialData)
  const [selectedFarm, setSelectedFarm] = useState<string | null>(null)

  const connectWebSocket = () => {
    const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
    const url = `ws://${host}:8000/wpsViewer`
    socketRef.current = new WebSocket(url)

    socketRef.current.onerror = (event) => {
      setTimeout(connectWebSocket, 2000)
    }

    socketRef.current.onopen = (event) => {
      function sendMessage() {
        try {
          socketRef.current?.send("setup")
        } catch (error) {
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
            const updated = {
              count: parsedState.tools,
              life: parsedState.health,
              amount: parsedState.money,
              date: parsedState.internalCurrentDate,
              farmId: parsedState.peasantFamilyLandAlias,
            }
            setFarmData((prev) => {
              const exists = prev.some((f) => f.id === name)
              if (exists) {
                return prev.map((f) => f.id === name ? { ...f, ...updated } : f)
              }
              return [...prev, { id: name, ...updated }]
            })
          } catch (error) {}
          break
        case "q=":
          setFarmData([])
          break
        case "d=":
          const date = data
          setFarmData((prevFarmData) =>
            prevFarmData.map((farm) => ({
              ...farm,
              date: date,
            })),
          )
          break
      }
    }
  }

  useEffect(() => {
    if (window.WebSocket) {
      connectWebSocket()
    }

    return () => {
      socketRef.current?.close()
    }
  }, [])

  // Get expression based on health and land ownership
  const getExpression = (health: number, farmId: string) => {
    if (health <= 0) return "💀"
    if (!farmId || farmId === "" || farmId === "Unassigned") return "👤"
    const healthPercentage = Math.min(100, Math.max(0, health))
    if (healthPercentage > 75) return "😄"
    if (healthPercentage > 50) return "🙂"
    if (healthPercentage > 20) return "😐"
    return "😫"
  }

  // Get avatar color based on health
  const getAvatarColor = (health: number) => {
    if (health <= 0) return "bg-slate-500"
    const healthPercentage = Math.min(100, Math.max(0, health))
    if (healthPercentage > 75) return "bg-green-500"
    if (healthPercentage > 50) return "bg-yellow-500"
    if (healthPercentage > 20) return "bg-orange-500"
    return "bg-red-500"
  }

  return (
    <TooltipProvider>
      <div className="h-[calc(100vh-4rem)] flex flex-col relative overflow-hidden">
        {/* Date display at the top */}
        {farmData.length > 0 && farmData[0].date && (
          <div className="bg-[#111418] text-white p-2 text-center sticky top-0 z-10 rounded-lg">
            <div className="flex items-center justify-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="font-medium">{farmData[0].date}</span>
            </div>
          </div>
        )}

        {/* Main content area with scroll */}
        <ScrollArea className="flex-1 px-4 py-2 overflow-auto">
          <div className="max-w-2xl mx-auto space-y-4">
            <AnimatePresence>
              {farmData.map((info) => (
                <Tooltip key={info.id}>
                  <TooltipTrigger asChild>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                      className={`bg-[#111418] rounded-lg border shadow-sm overflow-hidden cursor-pointer hover:border-emerald-400 ${
                        selectedFarm === info.id ? "border-emerald-500" : "border-transparent"
                      }`}
                      onClick={() => setSelectedFarm(info.id === selectedFarm ? null : info.id)}
                    >
                      <div className="flex items-center p-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white">
                        <div
                          className={`w-8 h-8 rounded-full ${getAvatarColor(info.life)} flex items-center justify-center text-lg mr-2 border border-white ${info.life <= 0 ? "opacity-25" : ""}`}
                        >
                          {getExpression(info.life, info.farmId)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold truncate text-sm">{info.id}</h3>
                        </div>
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

                        {selectedFarm === info.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-3 pt-2 border-t border-gray-100"
                          >
                            <div className="flex items-center gap-2 text-amber-600">
                              <Coins className="w-4 h-4" />
                              <div className="flex-1">Wealth</div>
                              <div className="font-medium">
                                ${" "}
                                {info.amount.toLocaleString("es-ES", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-green-600">
                              <Sprout className="w-4 h-4" />
                              <div className="flex-1">Farm</div>
                              <div className="font-medium truncate max-w-[200px]">{info.farmId || "Unassigned"}</div>
                            </div>

                            <div className="flex items-center gap-2 text-blue-600">
                              <Users className="w-4 h-4" />
                              <div className="flex-1">Tools</div>
                              <div className="font-medium">{info.count}</div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Click to show more details</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  )
}

