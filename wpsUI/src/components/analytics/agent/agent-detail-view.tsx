"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { ChevronRight, Users } from "lucide-react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts"


import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

// Colores para el gráfico de pastel
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"]

interface AgentDetailViewProps {
  agentId: string
  agentData: any
  onBack: () => void
  averageEfficiency: number
}

export function AgentDetailView({ agentId, agentData, onBack, averageEfficiency }: AgentDetailViewProps) {
  if (!agentData) {
    return <div>Loading agent data...</div>
  }

  // Función para determinar el color del badge según el tipo de actividad
  const getActivityColor = (type: string) => {
    switch (type) {
      case "work":
        return "bg-blue-500"
      case "rest":
        return "bg-green-500"
      case "social":
        return "bg-purple-500"
      default:
        return "bg-yellow-500"
    }
  }

  // Función para formatear el nombre de la tarea
  const formatTaskName = (task: string) => {
    return task
      .replace(/Task.*$/, '')  // Elimina 'Task' y cualquier texto después
      .replace(/([A-Z])/g, ' $1') // Inserta espacio antes de cada mayúscula
      .trim() // Elimina espacios extra
  }

  return (
    <div className="space-y-6">
          <Button
      variant="outline"
      onClick={onBack}
      className="text-white dark:text-white dark:border-gray-700 dark:hover:bg-gray-700 dark:hover:text-white"
    >
      <ChevronRight className="mr-2 h-4 w-4 rotate-180" />
      Back to agent list
    </Button>

      {/* Tarjeta principal de información del agente */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold dark:text-white">Family {agentId}</h2>
              <p className="text-muted-foreground dark:text-gray-400">{agentData.name || `Agent #${agentId}`}</p>
            </div>
            <Badge className={`
              ${agentData.status === "Active" ? "bg-green-500" : 
                agentData.status === "Struggling" ? "bg-yellow-500" : 
                agentData.status === "Critical" ? "bg-red-500" : "bg-gray-500"} 
              text-white border-none
            `}>
              {agentData.status || "Unknown"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Información general */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-muted/30 p-4 rounded-lg dark:bg-gray-700/30">
              <h3 className="text-lg font-medium mb-3 dark:text-white">General Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">Current Activity</p>
                  <p className="text-md dark:text-white">{agentData.currentActivity || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">Health</p>
                  <p className="text-md dark:text-white">{agentData.metrics?.efficiency || 0}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">Money</p>
                  <p className="text-md dark:text-white">${agentData.metrics?.money?.toLocaleString() || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">Wellbeing</p>
                  <p className="text-md dark:text-white">{agentData.metrics?.happiness?.toFixed(1) || 0}%</p>
                </div>
              </div>
            </div>

            {/* Tierras */}
            {agentData.lands && agentData.lands.length > 0 && (
              <div className="bg-muted/30 p-4 rounded-lg dark:bg-gray-700/30">
                <h3 className="text-lg font-medium mb-3 dark:text-white">Lands</h3>
                <div className="space-y-3">
                  {agentData.lands.map((land: any, index: number) => (
                    <div key={index} className="bg-card border border-border rounded-lg p-3 dark:bg-gray-800/60 dark:border-gray-700">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium dark:text-white">{land.landName}</h4>
                        <Badge variant={
                          land.currentSeason === "GROWING" ? "success" : 
                          land.currentSeason === "PLANTING" ? "warning" : "secondary"
                        }>
                          {land.currentSeason === "NONE" ? "Uncultivated" : land.currentSeason}
                        </Badge>
                      </div>
                      {land.cropName && (
                        <p className="text-sm text-muted-foreground dark:text-gray-400 mt-1">
                          Crop: {land.cropName}
                        </p>
                      )}
                      <div className="mt-2 w-full bg-muted/30 h-2 rounded-full overflow-hidden dark:bg-gray-700">
                        <div 
                          className="bg-primary h-full dark:bg-blue-500" 
                          style={{ width: `${(land.elapsedWorkTime / land.totalRequiredTime) * 100}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-muted-foreground dark:text-gray-500 mt-1">
                        Progress: {Math.floor((land.elapsedWorkTime / land.totalRequiredTime) * 100)}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Performance History */}
            <div className="bg-card border border-border rounded-lg p-6 dark:bg-gray-800 dark:border-gray-700">
              <h3 className="text-lg font-medium mb-3 dark:text-white">Performance History</h3>
              <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={agentData.performanceHistory} 
                  margin={{ top: 10, right: 30, left: 10, bottom: 15 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.6} />
                  <XAxis 
                    dataKey="day" 
                    stroke="#888"
                    tick={{ fill: '#888', fontSize: 12 }}
                    axisLine={{ stroke: '#555' }}
                  />
                  <YAxis 
                    stroke="#888" 
                    domain={[0, 100]}
                    tick={{ fill: '#888', fontSize: 12 }}
                    axisLine={{ stroke: '#555' }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(31, 41, 55, 0.95)",
                      border: "1px solid #374151",
                      borderRadius: "6px",
                      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
                      color: "#fff",
                    }}
                    formatter={(value, name, props) => {
                      
                      const metricName = props.dataKey === "efficiency" ? "Health" : "Productivity";
                      return [`${Number(value).toFixed(1)}%`, metricName];
                    }}
                    labelFormatter={(label) => `${label}`}/>
                  <Legend 
                    wrapperStyle={{ 
                      color: "#ccc", 
                      paddingTop: 15,
                      marginTop: 10, 
                      bottom: 0
                    }}
                    verticalAlign="bottom" 
                    height={36}
                    iconSize={10}
                  />
                  <Line 
                  type="monotone" 
                  dataKey="efficiency"  
                  stroke="#8884d8" 
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 1, fill: "#1f2937" }}
                  activeDot={{ r: 6, stroke: "#8884d8", strokeWidth: 2 }}
                  name="Health"  
                  animationDuration={1500}
                  isAnimationActive={true}
                />
                <Line 
                  type="monotone" 
                  dataKey="productivity"  
                  stroke="#82ca9d" 
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 1, fill: "#1f2937" }}
                  activeDot={{ r: 6, stroke: "#82ca9d", strokeWidth: 2 }}
                  name="Productivity"  
                  animationDuration={1500}
                  isAnimationActive={true}
                />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

            {/* Activity Distribution */}
            <div className="bg-card border border-border rounded-lg p-6 dark:bg-gray-800 dark:border-gray-700">
              <h3 className="text-lg font-medium mb-3 dark:text-white">Activity Distribution</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={agentData.activities}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {agentData.activities.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#333",
                        border: "none",
                        color: "#fff",
                      }}
                      labelStyle={{ color: "#ddd" }}
                      itemStyle={{ color: "#fff" }}
                    />
                    <Legend wrapperStyle={{ color: "#ccc" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

              {/* Activity Log */}
      <div className="bg-muted/30 p-4 rounded-lg dark:bg-gray-700/30">
        <h3 className="text-lg font-medium mb-3 dark:text-white">Activity Log</h3>
        <ScrollArea className="h-[280px] pr-4">
          <div className="space-y-3">
            {agentData.activityLog && agentData.activityLog.length > 0 ? (
              agentData.activityLog.map((log, index) => (
                <div key={index} className="flex items-start">
                  <div className="mr-3 mt-0.5">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        log.type === "work" ? "bg-blue-500" : 
                        log.type === "rest" ? "bg-green-500" : 
                        log.type === "social" ? "bg-purple-500" : 
                        "bg-yellow-500"
                      }`}
                    ></div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground dark:text-gray-400">{log.time}</p>
                    <p className="text-sm dark:text-gray-300">{log.activity}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground dark:text-gray-400">
                No activities recorded for this agent.
              </p>
            )}
          </div>
        </ScrollArea>
      </div>

          {/* Analysis */}
          <div className="bg-muted/30 p-4 rounded-lg dark:bg-gray-700/30">
            <h3 className="text-lg font-medium mb-3 dark:text-white">Analysis</h3>
            <ul className="list-disc pl-5 space-y-1 dark:text-gray-300">
              {agentData.analysis && agentData.analysis.length > 0 ? (
                agentData.analysis.map((item: string, index: number) => (
                  <li key={index}>{item}</li>
                ))
              ) : (
                <li>No analysis available for this agent.</li>
              )}
            </ul>
          </div>

          {/* Social Metrics */}
          {agentData.interactionInsights && agentData.interactionInsights.length > 0 && (
            <div className="bg-muted/30 p-4 rounded-lg dark:bg-gray-700/30">
              <h3 className="text-lg font-medium mb-3 dark:text-white">Social Metrics</h3>
              <ul className="space-y-2">
                {agentData.interactionInsights.map((insight: string, index: number) => (
                  <li key={index} className="text-sm dark:text-gray-300">
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>

        <CardFooter className="border-t border-border pt-4 flex justify-end dark:border-gray-700">
          <Button
            onClick={onBack}
            className="dark:text-white dark:border-gray-700 dark:hover:bg-gray-700 dark:hover:text-white"
          >
            Close
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}