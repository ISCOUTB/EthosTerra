"use client";

import type React from "react";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChartIcon,
  ChevronRight,
  Download,
  Users,
  LayoutDashboard,
  Settings,
  Info,
  Activity,
  Section,
  Router,
  Dice1,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { fetchCSVData } from "@/lib/csvUtils";
import { DownloadSection } from "@/components/analytics/downloadSection/section";
import Image from "next/image";
import {
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
  AreaChart,
  Area,
  ReferenceLine,
  ScatterChart,
  Scatter,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Bar,
} from "recharts";

import type { ParameterType } from "@/lib/parameter-config";

import { TimeSeriesAnalysis } from "@/components/analytics/analysis/time-series-analysis";
import { AgentDetailView } from "@/components/analytics/agent/agent-detail-view";
import { DistributionAnalysis } from "@/components/analytics/analysis/distribution-analysis"; // Añade esta línea
import { icon } from "leaflet";
const floatVariables = [
  { key: "HappinessSadness", color: "#DA4453" },
  { key: "HopefulUncertainty", color: "#967ADC" },
  { key: "SecureInsecure", color: "#D770AD" },
  { key: "money", color: "#656D78" },
  { key: "peasantFamilyAffinity", color: "#AAB2BD" },
  { key: "peasantLeisureAffinity", color: "#E9573F" },
  { key: "peasantFriendsAffinity", color: "#8CC152" },
  { key: "waterAvailable", color: "#5D9CEC" },
  { key: "totalHarvestedWeight", color: "#CCD1D9" },
  { key: "health", color: "#45B7D1" },
  { key: "robberyAccount", color: "#5D9CEC" },
  { key: "currentDay", color: "#AC92EC" },
  { key: "toPay", color: "#EC87C0" },
  { key: "peasantFamilyMinimalVital", color: "#5D9CEC" },
  { key: "loanAmountToPay", color: "#48CFAD" },
  { key: "tools", color: "#A0D468" },
  { key: "seeds", color: "#ED5565" },
  { key: "pesticidesAvailable", color: "#FC6E51" },
  { key: "HarvestedWeight", color: "#FFCE54" },
  { key: "daysToWorkForOther", color: "#4FC1E9" },
];

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"]; 

// Definición mejorada de los elementos de navegación con mejores iconos y descripciones
const navigationItems = [
  {
    id: "home",
    label: "Dashboard",
    description: "Simulation overview",
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    id: "statistics",
    label: "Statistics",
    description: "Advanced statistical analysis",
    icon: <Activity className="w-5 h-5" />,
  },
  {
    id: "agents",
    label: "Agents",
    description: "Current agent status",
    icon: <Users className="w-5 h-5" />,
  },
];

export default function Analytics() {
  // Agrega este nuevo estado
  const [activityData, setActivityData] = useState([
    { name: "Working", value: 0 },
    { name: "Idle", value: 0 },
    { name: "Terminated", value: 0 },
  ]);

  // Al inicio del componente Analytics, añade estos estados:
const [agentLastUpdate, setAgentLastUpdate] = useState<Record<string, number>>({});
const [simulationActive, setSimulationActive] = useState(true);
const TIMEOUT_THRESHOLD = 10000; // 10 segundos sin actualización para considerar inactivo
  interface AgentState {
    peasantLeisureAffinity?: number;
    peasantFriendsAffinity?: number;
    peasantFamilyAffinity?: number;
    peasantKind?: string;
    contractor?: string;
    pesticidesAvailable?: number;
    initialHealth?: number;
    purpose?: string;
    initialMoney?: number;
    tools?: number;
    health?: number;
    money?: number;
    "Happiness/Sadness"?: number;
    "Secure/Insecure"?: number;
    "Hopeful/Uncertainty"?: number;
    waterAvailable?: number;
    totalHarvestedWeight?: number;
    assignedLands?: any[];
    currentActivity?: string;
    internalCurrentDate?: string;
    // Otras propiedades según sea necesario
  }
  // Agregar a los estados existentes
  const [agentTaskLogs, setAgentTaskLogs] = useState<Record<string, any>>({});
  const [loadedAgents, setLoadedAgents] = useState<string[]>([]);
  const socketRef = useRef<WebSocket | null>(null);

  // Modificar la conexión WebSocket (añadir al useEffect existente)
  useEffect(() => {
    const connectWebSocket = () => {
      const url = "ws://localhost:8000/wpsViewer";
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onerror = (event) => {
        console.error("Error en la conexión WebSocket:", url);
        setTimeout(connectWebSocket, 2000);
      };

      socket.onopen = () => {
        console.log("WebSocket conectado");
        socket.send("setup");
      };

      socket.onmessage = (event) => {
  const prefix = event.data.substring(0, 2);
  const data = event.data.substring(2);

  // Marcar la simulación como activa siempre que lleguen mensajes
  setSimulationActive(true);

  switch (prefix) {
    case "j=":
      try {
        console.log("Recibiendo datos j=");
        const jsonData = JSON.parse(data);
        const { name, taskLog, state } = jsonData;

        if (name) {
          // Guardar la hora actual como última actualización para este agente
          setAgentLastUpdate(prev => ({
            ...prev,
            [name]: Date.now()
          }));
          
          // Resto de la lógica existente...
          setAgentTaskLogs((prev) => ({
            ...prev,
            [name]: { taskLog, state },
          }));

          setLoadedAgents((prev) => {
            if (!prev.includes(name)) {
              return [...prev, name];
            }
            return prev;
          });
        }
      } catch (error) {
        console.error("Error al procesar datos del agente:", error);
      }
      break;
      
    // Caso para detectar fin de simulación explícitamente
    case "e=": // "e" de "end"
      try {
        console.log("Fin de simulación detectado");
        setSimulationActive(false);
      } catch (error) {
        console.error("Error al procesar fin de simulación:", error);
      }
      break;
  }
};
      socket.onclose = () => {
        console.log("WebSocket desconectado");
        setTimeout(connectWebSocket, 2000);
      };

      return socket;
    };

    const socket = connectWebSocket();

    return () => {
      if (
        socketRef.current &&
        socketRef.current.readyState === WebSocket.OPEN
      ) {
        socketRef.current.close();
      }
    };
  }, []);

  
  const formatTaskName = (taskName: string): string => {
    
    return taskName
      .replace(/Task.*$/, "") 
      .replace(/([A-Z])/g, " $1") 
      .trim(); 
  };

  const getAgentData = (agentId: string) => {
    const agentIndex = parseInt(agentId) - 1;
    if (agentIndex < 0 || agentIndex >= loadedAgents.length) {
      return {
        name: "Unknown",
        status: "Unknown",
        currentActivity: "Unknown",
        metrics: {
          efficiency: 0,
          productivity: 0,
          happiness: 0,
          energy: 0,
          money: 0,
        },
        lands: [],
        activityLog: [],
        activities: [],
        analysis: [],
        performanceHistory: [],
        interactionInsights: [],
      };
    }

    const agentName = loadedAgents[agentIndex];
    console.log("Obteniendo datos para:", agentName);

    
    const agentInfo = agentTaskLogs[agentName] || {};
    console.log(
      "AgentInfo para",
      agentName,
      ":",
      JSON.stringify(agentInfo).substring(0, 100) + "..."
    );

    const taskLog = agentInfo.taskLog || {};
    console.log(
      "TaskLog a procesar:",
      JSON.stringify(taskLog).substring(0, 100) + "..."
    );
    console.log("TaskLog keys:", Object.keys(taskLog));

    
    const activityLog = processTaskLog(taskLog);

    
    let agentStateData: AgentState = {};
    try {
      if (agentInfo.state) {
        if (typeof agentInfo.state === "string") {
          agentStateData = JSON.parse(agentInfo.state);
        } else {
          agentStateData = agentInfo.state;
        }
      }
    } catch (error) {
      console.error("Error parseando state:", error);
    }

    
    const health = (agentStateData as AgentState).health || 70;
    const money = (agentStateData as AgentState).money || 0;
    const happiness =
      ((((agentStateData as AgentState)["Happiness/Sadness"] || 0) + 1) / 2) * 100;
    const waterAvailable = (agentStateData as AgentState).waterAvailable || 0;
    const lands = (agentStateData as AgentState).assignedLands || [];

    
    const activityCounts: Record<string, number> = {};
    activityLog.forEach((log) => {
      const activity = log.activity;
      activityCounts[activity] = (activityCounts[activity] || 0) + 1;
    });

   
    const activities = Object.entries(activityCounts)
      .map(([key, value]) => ({ name: key, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); 

console.log("Agent lands:", {
  assignedLands: agentStateData.assignedLands,
  landsLength: agentStateData.assignedLands?.length || 0,
  money: agentStateData.money || 0,
  totalHarvestedWeight: agentStateData.totalHarvestedWeight || 0,
  rawProductivity: ((agentStateData.money || 0) + (agentStateData.totalHarvestedWeight || 0)) 
    / Math.max(1, agentStateData.assignedLands?.length || 1)
});
    
  const performanceHistory = (() => {
  
  const recentTaskLogs = Object.keys(taskLog || {}).sort().slice(-10);
  
  
  return recentTaskLogs.map((dateKey, index) => {
    
    const taskLogData = taskLog[dateKey] || {};
    
    const simulationDay = taskLogData.currentDay || (6 + index * 7);
    
    
    const dayData = {
      
      day: `Day ${simulationDay}`,
      simulationDate: dateKey,
      
      
      efficiency: taskLogData.health || health,
      
      
      productivity: normalizeValue(
        ((agentStateData.money || 0) + (agentStateData.totalHarvestedWeight || 0))
        / Math.max(1, agentStateData.assignedLands?.length || 1)
        ) * 100
    };
    
    return dayData;
  });
})();

    
    const analysis = [
      `Current health: ${health}%`,
      `Available money: $${money.toLocaleString()}`,
      happiness > 70
        ? "Positive emotional state"
        : happiness > 40
          ? "Neutral emotional state"
          : "Negative emotional state",
      waterAvailable > 1000
        ? "Abundant water resources"
        : "Limited water resources",
];


const calculateAgentWellbeing = (agentStateData: AgentState): number => {
  
  const happinessSadness = agentStateData["Happiness/Sadness"] ?? 0;
  const positiveEmotion = happinessSadness > 0 
    ? happinessSadness 
    : 0;
    
  
  const negativeEmotion = happinessSadness < 0 
    ? Math.abs(happinessSadness) 
    : 0;
    
  
  const health = (agentStateData.health || 0) / 100;
  
  // Aplicar fórmula: Bienestar = Normalizar(eP - eN + Promedio de Salud)
  const wellbeingRaw = positiveEmotion - negativeEmotion + health;
  
  // Normalizar a escala 0-100
  return normalizeValue(wellbeingRaw) * 100;
};


  const interactionInsights = [
    `Family affinity: ${((agentStateData.peasantFamilyAffinity || 0) * 100).toFixed(1)}%`,
    `Friends affinity: ${((agentStateData.peasantFriendsAffinity || 0) * 100).toFixed(1)}%`,
    `Leisure affinity: ${((agentStateData.peasantLeisureAffinity || 0) * 100).toFixed(1)}%`,
  ];

    return {
      name: agentName,
      status: health < 30 ? "Critical" : health < 60 ? "Struggling" : "Active",
      currentActivity: formatCurrentActivity(
        agentStateData.currentActivity || "Unknown"
      ),
      metrics: {
        efficiency: health,
        productivity: normalizeValue(
          (agentStateData.money || 0) + (agentStateData.totalHarvestedWeight || 0)
          / Math.max(1, agentStateData.assignedLands?.length || 1)
        ),
        happiness: happiness,
        energy: waterAvailable > 1000 ? 100 : 50,
        money: money,
        wellbeingIndex: calculateAgentWellbeing(agentStateData)
      },
      lands: lands,
      activityLog, 
      activities,
      analysis,
      performanceHistory,
      interactionInsights,
    };
  };
  
  const formatCurrentActivity = (activity: string) => {
    return activity
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const processTaskLog = (taskLog: Record<string, string[]>): any[] => {
    // Si no hay taskLog, devolver array vacío
    if (!taskLog || Object.keys(taskLog).length === 0) {
      console.log("TaskLog vacío");
      return [];
    }

    console.log(
      "Procesando taskLog con",
      Object.keys(taskLog).length,
      "fechas"
    );

    // Función auxiliar para convertir fecha DD/MM/YYYY a objeto Date
    const parseDate = (dateStr: string): Date => {
      const [day, month, year] = dateStr.split("/").map(Number);
      return new Date(year, month - 1, day);
    };

    // Ordenar las fechas cronológicamente (de más reciente a más antigua)
    const sortedDates = Object.keys(taskLog).sort((a, b) => {
      const dateA = parseDate(a);
      const dateB = parseDate(b);
      return dateB.getTime() - dateA.getTime();
    });

    console.log("Fechas ordenadas:", sortedDates.slice(0, 5), "...");

    // Crear el array de actividades ordenado por fecha
    const activities = [];

    // Tomar hasta 10 fechas recientes para no sobrecargar la vista
    const recentDates = sortedDates.slice(0, 10);

    for (const date of recentDates) {
      const tasks = taskLog[date] || [];

      for (const task of tasks) {
        activities.push({
          time: date,
          activity: formatTaskName(task),
          type: getTaskType(task),
        });
      }
    }

    // CORRECCIÓN: Añadir el return y limitar a un número manejable
    return activities.slice(0, 20);
  };

  // Determinar el tipo de tarea para asignarle un color
  const getTaskType = (task: string): string => {
    if (task.includes("Vital")) return "rest";
    if (
      task.includes("Land") ||
      task.includes("Crop") ||
      task.includes("Plant")
    )
      return "work";
    if (task.includes("Family") || task.includes("Religious")) return "social";
    if (task.includes("Alternative") || task.includes("Price")) return "work";
    return "other";
  };

  
  const calculateAgentActivitySummary = () => {
 
  let working = 0;
  let idle = 0;
  let terminated = 0;
  
  const now = Date.now();

  // Recorre todos los agentes cargados
  loadedAgents.forEach((agentName) => {
    const agentInfo = agentTaskLogs[agentName] || {};
    let agentStateData = {};
    
    try {
      if (agentInfo.state) {
        if (typeof agentInfo.state === 'string') {
          agentStateData = JSON.parse(agentInfo.state);
        } else {
          agentStateData = agentInfo.state;
        }
      }
    } catch (error) {
      console.error("Error parseando state para resumen:", error);
    }
    
    // Determinar el estado del agente basado en sus datos
    const health = (agentStateData as AgentState).health || 70;
    const currentActivity = (agentStateData as AgentState).currentActivity || "";
    const lastUpdateTime = agentLastUpdate[agentName] || 0;
    
    // Criterios para marcar un agente como terminado:
    // 1. Salud muy baja (agente muerto)
    // 2. Simulación inactiva (no se reciben más datos)
    // 3. No se ha actualizado este agente específico en mucho tiempo
    const isTerminated = 
      health <= 10 || 
      !simulationActive || 
      (now - lastUpdateTime > TIMEOUT_THRESHOLD && lastUpdateTime > 0);
    
    if (isTerminated) {
      terminated++;
    } else if (
      currentActivity.includes("IDLE") ||
      currentActivity === "Unknown" ||
      currentActivity === ""
    ) {
      idle++;
    } else {
      working++;
    }
  });
  
  // Actualizar el estado con los nuevos valores
  setActivityData([
    { name: "Working", value: working },
    { name: "Idle", value: idle },
    { name: "Terminated", value: terminated },
  ]);
};
  // Agregar este nuevo useEffect
  useEffect(() => {
    // Calcular resumen de actividad inicial
    calculateAgentActivitySummary();

    // Configurar intervalo para actualización periódica
    const intervalId = setInterval(() => {
      calculateAgentActivitySummary();
    }, 2000); // Actualizar cada 2 segundos

    // Limpiar intervalo al desmontar
    return () => {
      clearInterval(intervalId);
    };
  }, [agentTaskLogs, loadedAgents]); // Dependencias: actualizar cuando cambian los datos

  const [agentsData, setAgentsData] = useState<any[]>([]); // Add this line to define agentsData state
  const agentsLoadedRef = useRef<boolean>(false);

  // Reemplazar el useEffect de WebSocket con este nuevo useEffect para cargar desde CSV
  useEffect(() => {
    // Solo cargar agentes si no se han cargado previamente
    if (!agentsLoadedRef.current) {
      const loadAgents = async () => {
        try {
          console.log("Cargando agentes desde CSV...");
          const response = await window.electronAPI.readCsv();
          if (!response.success || !response.data) {
            throw new Error(response.error || "Error al leer el archivo CSV");
          }

          const rows = response.data
            .split("\n")
            .filter((line) => line.trim() !== "");
          const headers = rows[0].split(",");
          const agentIndex = headers.indexOf("Agent");

          if (agentIndex === -1) {
            throw new Error("No se encontró la columna 'Agent'");
          }

          const agentsSet = new Set(
            rows.slice(1).map((row) => row.split(",")[agentIndex].trim())
          );

          const uniqueAgents = Array.from(agentsSet);
          setLoadedAgents(uniqueAgents);

          // También crear datos para agentsData con el mismo formato que antes
          const formattedAgents = uniqueAgents.map((name, index) => ({
            id: name,
            name: `Familia ${index + 1}`,
            status: "Active",
          }));
          setAgentsData(formattedAgents);


          agentsLoadedRef.current = true;
          console.log("Agentes cargados con éxito:", uniqueAgents.length);
        } catch (error) {
          console.error("Error cargando agentes:", error);
        }
      };

      loadAgents();
    }
  }, []); // Array de dependencias vacío, se ejecuta solo al montar

  const [simulationData, setSimulationData] = useState<any[]>([]);
  const [isTimeRangeSet, setIsTimeRangeSet] = useState(false); // Controla si el rango fue configurado manualmente
  const [timeRange, setTimeRange] = useState<[number, number]>([0, 100]); // Rango de tiempo inicial

  useEffect(() => {
    const loadData = async () => {
      try {
        const csvData = await fetchCSVData(); // Carga los datos del CSV
        const mappedData = csvData.map((row: Record<string, any>) => ({
          name: row.internalCurrentDate || "Unknown Date",
          ...Object.keys(row).reduce(
            (acc, key) => {
              // Intenta convertir todos los valores a números si es posible
              const value = parseFloat(String(row[key]));
              acc[key] = isNaN(value) ? row[key] : value;
              return acc;
            },
            {} as Record<string, any>
          ),
        }));
        setSimulationData(mappedData);

        // Solo ajusta el rango de tiempo si no ha sido configurado manualmente
        if (!isTimeRangeSet && mappedData.length > 0) {
          setTimeRange([0, mappedData.length - 1]); // Ajusta el rango al índice de las fechas disponibles
        }
      } catch (error) {
        console.error("Error al cargar los datos del CSV:", error);
      }
    };

    loadData();

    const interval = setInterval(loadData, 2000);

    return () => clearInterval(interval);
  }, [isTimeRangeSet]);

  const handleTimeRangeChange = (newRange: [number, number]) => {
    setTimeRange(newRange);
    setIsTimeRangeSet(true);
  };

  // Añadir este useEffect para verificar periódicamente la actividad
useEffect(() => {
  const checkSimulationActivity = () => {
    const now = Date.now();
    
    // Si no hay actualizaciones recientes para ningún agente, marcar simulación como inactiva
    const hasRecentUpdates = Object.values(agentLastUpdate).some(
      timestamp => (now - timestamp) < TIMEOUT_THRESHOLD
    );
    
    if (!hasRecentUpdates && Object.keys(agentLastUpdate).length > 0) {
      setSimulationActive(false);
    }
  };
  
  const intervalId = setInterval(checkSimulationActivity, 5000);
  
  return () => {
    clearInterval(intervalId);
  };
}, [agentLastUpdate]);

  const [selectedType, setSelectedType] = useState<ParameterType>("integer");
  const [selectedParameter, setSelectedParameter] = useState("currentActivity");
  const [activeSection, setActiveSection] = useState("home");
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const router = useRouter();

  
  const [primaryVariable, setPrimaryVariable] = useState("efficiency");
  const [secondaryVariable, setSecondaryVariable] = useState("productivity");
  const [analysisType, setAnalysisType] = useState("correlation");
  const [showOutliers, setShowOutliers] = useState(true);
  const [confidenceInterval, setConfidenceInterval] = useState(95);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [showRegressionLine, setShowRegressionLine] = useState(true);
  const [distributionBins, setDistributionBins] = useState(10);
  const [selectedAgentData, setSelectedAgentData] = useState<any>(null);
  
  useEffect(() => {
   
    if (selectedAgent) {
      console.log(
        "Configurando actualización periódica para el agente:",
        selectedAgent
      );

      // Función para actualizar los datos del agente
      const updateAgentData = () => {
        const updatedData = getAgentData(selectedAgent);
        setSelectedAgentData(updatedData);
      };

      // Configurar el intervalo para actualizar cada 2 segundos
      const intervalId = setInterval(updateAgentData, 2000);

      // Limpiar el intervalo cuando cambie el agente seleccionado o se desmonte el componente
      return () => {
        console.log("Limpiando intervalo de actualización del agente");
        clearInterval(intervalId);
      };
    }
  }, [selectedAgent]); // Dependencia: el efecto se ejecuta cuando cambia el agente seleccionado

  // Detección de dispositivo móvil y manejo del sidebar
  useEffect(() => {
    const checkMobile = () => {
      const isMobileView = window.innerWidth < 768;
      setIsMobile(isMobileView);
      setSidebarOpen(!isMobileView); // Cierra por defecto en móvil, abre en escritorio
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Agrega esta función a tu componente
  const calculateTrend = (data: number[]): string => {
    if (data.length < 2) return "Insufficient data";

    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));

    const firstHalfMean = calculateMean(firstHalf);
    const secondHalfMean = calculateMean(secondHalf);

    const percentChange =
      ((secondHalfMean - firstHalfMean) / firstHalfMean) * 100;

    if (percentChange > 5) return `↑ +${percentChange.toFixed(1)}% (improving)`;
    if (percentChange < -5)
      return `↓ ${percentChange.toFixed(1)}% (deteriorating)`;
    return "Stable";
  };


const calculateWellbeingIndex = (data: any[]): number => {
  if (data.length === 0) return 0;

  const recentData = data.slice(-10);

  
  const positiveEmotions = calculateMean(
    recentData.map((item) => {
      const happiness = item.HappinessSadness || 0;
      return happiness > 0 ? happiness : 0;
    })
  );

  
  const negativeEmotions = calculateMean(
    recentData.map((item) => {
      const happiness = item.HappinessSadness || 0;
      return happiness < 0 ? Math.abs(happiness) : 0;
    })
  );

  
  const avgHealth = calculateMean(
    recentData.map((item) => item.health || 0)
  ) / 100; 

  
  const wellbeingRaw = positiveEmotions - negativeEmotions + avgHealth;
  
  
  return normalizeValue(wellbeingRaw) * 100;
};


const normalizeValue = (value: number): number => {
  // Asegurar que el valor esté entre 0 y 1
  return Math.min(1, Math.max(0, value));
};

  // Datos de ejemplo para gráficos de parámetros
  const getParameterData = () => {
    const dataPoints = 30;
    switch (selectedParameter) {
      case "currentActivity":
        return [
          { name: "Working", value: 183 },
          { name: "Eating", value: 37 },
          { name: "Sleeping", value: 20 },
          { name: "Socializing", value: 42 },
          { name: "Learning", value: 15 },
        ];
      case "happiness":
        return Array.from({ length: dataPoints }, (_, i) => ({
          name: `Agent ${i + 1}`,
          value: Math.floor(Math.random() * 100), // Valor aleatorio 0-99
        }));
      case "age": // Ejemplo para un parámetro de tipo 'integer'
        return Array.from({ length: dataPoints }, (_, i) => ({
          name: `Agent ${i + 1}`,
          value: 20 + Math.floor(Math.random() * 40), // Edad entre 20 y 60
        }));
      // Agrega más casos según tus parámetros definidos en parameters.ts
      default:
        // Datos por defecto si el parámetro no coincide
        return Array.from({ length: dataPoints }, (_, i) => ({
          name: `Data ${i + 1}`,
          value: Math.floor(Math.random() * 100),
        }));
    }
  };

  // Alterna la visibilidad del sidebar (usado en móvil)
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Calcula el promedio de eficiencia para la ReferenceLine
  const averageEfficiency =
    simulationData.reduce((sum, entry) => sum + entry.efficiency, 0) /
    simulationData.length;

  // Funciones estadísticas mejoradas
  const calculateMean = (data: number[]): number => {
    if (!data.length) return 0;
    const validData = data.filter((n) => !isNaN(n));
    if (!validData.length) return 0;
    return validData.reduce((sum, value) => sum + value, 0) / validData.length;
  };

  const calculateMedian = (data: number[]): number => {
    if (!data.length) return 0;
    const validData = data.filter((n) => !isNaN(n));
    if (!validData.length) return 0;

    const sorted = [...validData].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[middle - 1] + sorted[middle]) / 2
      : sorted[middle];
  };

  const calculateStandardDeviation = (data: number[]): number => {
    if (!data.length) return 0;
    const validData = data.filter((n) => !isNaN(n));
    if (!validData.length) return 0;

    const mean = calculateMean(validData);
    const squareDiffs = validData.map((value) => Math.pow(value - mean, 2));
    const variance = calculateMean(squareDiffs);
    return Math.sqrt(variance);
  };

  const calculateCorrelation = (xData: number[], yData: number[]): number => {
    const validX = xData.filter((n) => !isNaN(n));
    const validY = yData.filter((n) => !isNaN(n));

    // Necesitamos el mismo número de puntos en ambos arrays
    if (validX.length !== validY.length || validX.length === 0) return 0;

    const xMean = calculateMean(validX);
    const yMean = calculateMean(validY);

    let numerator = 0;
    let xDenominator = 0;
    let yDenominator = 0;

    for (let i = 0; i < validX.length; i++) {
      const xDiff = validX[i] - xMean;
      const yDiff = validY[i] - yMean;
      numerator += xDiff * yDiff;
      xDenominator += xDiff * xDiff;
      yDenominator += yDiff * yDiff;
    }

    if (xDenominator === 0 || yDenominator === 0) return 0;
    return numerator / Math.sqrt(xDenominator * yDenominator);
  };
  
  const filteredData = useMemo(() => {
    return simulationData.slice(timeRange[0], timeRange[1] + 1);
  }, [timeRange]);

  
  const detectOutliers = (
    data: number[]
  ): { indices: number[]; lowerBound: number; upperBound: number } => {
    if (data.length < 4) return { indices: [], lowerBound: 0, upperBound: 0 };

    const sortedData = [...data].sort((a, b) => a - b);

    
    const q1Index = Math.floor(sortedData.length * 0.25);
    const q3Index = Math.floor(sortedData.length * 0.75);

    const q1 = sortedData[q1Index];
    const q3 = sortedData[q3Index];

    // Calcula IQR
    const iqr = q3 - q1;

    // Define límites para outliers (típicamente 1.5*IQR)
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    // Encuentra los índices de los outliers
    const indices = data
      .map((val, idx) => (val < lowerBound || val > upperBound ? idx : -1))
      .filter((idx) => idx !== -1);

    return { indices, lowerBound, upperBound };
  };

  // Calcular parámetros de regresión lineal
  const calculateRegressionLine = (
    xData: number[],
    yData: number[]
  ): { slope: number; intercept: number } => {
    // Filtramos NaN y aseguramos misma longitud
    const validIndices = xData
      .map((_, i) => i)
      .filter(
        (i) =>
          !isNaN(xData[i]) &&
          !isNaN(yData[i]) &&
          xData[i] !== null &&
          yData[i] !== null
      );

    const validX = validIndices.map((i) => xData[i]);
    const validY = validIndices.map((i) => yData[i]);

    if (validX.length < 2) return { slope: 0, intercept: 0 };

    const xMean = calculateMean(validX);
    const yMean = calculateMean(validY);

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < validX.length; i++) {
      const xDiff = validX[i] - xMean;
      numerator += xDiff * (validY[i] - yMean);
      denominator += xDiff * xDiff;
    }

    // Evitar división por cero
    const slope = denominator !== 0 ? numerator / denominator : 0;
    const intercept = yMean - slope * xMean;

    return { slope, intercept };
  };

  // Dentro del componente Analytics, agrega estos useMemos:

  // Extrae los datos primarios y secundarios con manejo de NaN
  const primaryData = useMemo(() => {
    return filteredData
      .map((item) => item[primaryVariable as keyof typeof item] as number)
      .filter(
        (value) => !isNaN(value) && value !== null && value !== undefined
      );
  }, [filteredData, primaryVariable]);

  const secondaryData = useMemo(() => {
    return filteredData
      .map((item) => item[secondaryVariable as keyof typeof item] as number)
      .filter(
        (value) => !isNaN(value) && value !== null && value !== undefined
      );
  }, [filteredData, secondaryVariable]);

  // Detectar outliers en ambas variables
  const primaryOutliers = useMemo(() => {
    return detectOutliers(primaryData);
  }, [primaryData]);

  const secondaryOutliers = useMemo(() => {
    return detectOutliers(secondaryData);
  }, [secondaryData]);

  // Filtrar outliers si es necesario
  const filteredOutlierData = useMemo(() => {
    if (showOutliers) return filteredData;

    // Combinar índices de outliers de ambas variables
    const outlierIndices = new Set([
      ...primaryOutliers.indices,
      ...secondaryOutliers.indices,
    ]);

    // Filtrar los datos para excluir outliers
    return filteredData.filter((_, index) => !outlierIndices.has(index));
  }, [
    filteredData,
    showOutliers,
    primaryOutliers.indices,
    secondaryOutliers.indices,
  ]);

  // Calcular datos para la línea de regresión
  const regressionParams = useMemo(() => {
    return calculateRegressionLine(
      filteredOutlierData.map((item) => item[primaryVariable]),
      filteredOutlierData.map((item) => item[secondaryVariable])
    );
  }, [filteredOutlierData, primaryVariable, secondaryVariable]);

  const regressionLineData = useMemo(() => {
    const { slope, intercept } = regressionParams;

    // Si no hay datos válidos, retorna un array vacío
    if (filteredOutlierData.length < 2) return [];

    // Obtener valores min/max de X para dibujar la línea
    const xValues = filteredOutlierData.map((d) => d[primaryVariable]);
    const validXValues = xValues.filter((x) => !isNaN(x));

    if (validXValues.length < 2) return [];

    const minX = Math.min(...validXValues);
    const maxX = Math.max(...validXValues);

    // Crear puntos para la línea de regresión con formato correcto
    return [
      {
        [primaryVariable]: minX,
        [secondaryVariable]: intercept + slope * minX,
      },
      {
        [primaryVariable]: maxX,
        [secondaryVariable]: intercept + slope * maxX,
      },
    ];
  }, [
    filteredOutlierData,
    primaryVariable,
    secondaryVariable,
    regressionParams,
  ]);

  // Calculate statistics
  // Modificar el cálculo de estadísticas
  const statistics = useMemo(() => {
    // Usar los datos filtrados según la opción de outliers
    const dataToAnalyze = showOutliers ? filteredData : filteredOutlierData;

    if (dataToAnalyze.length === 0) {
      return {
        primary: { mean: 0, median: 0, stdDev: 0, min: 0, max: 0 },
        secondary: { mean: 0, median: 0, stdDev: 0, min: 0, max: 0 },
        correlation: 0,
        regression: { slope: 0, intercept: 0, r2: 0 },
        outliers: {
          primaryCount: primaryOutliers.indices.length,
          secondaryCount: secondaryOutliers.indices.length,
        },
      };
    }

    const validPrimaryData = dataToAnalyze
      .map((item) => item[primaryVariable])
      .filter((n) => !isNaN(n));
    const validSecondaryData = dataToAnalyze
      .map((item) => item[secondaryVariable])
      .filter((n) => !isNaN(n));

    const correlation = calculateCorrelation(
      validPrimaryData,
      validSecondaryData
    );
    const { slope, intercept } = regressionParams;

    // Calcular R² (coeficiente de determinación)
    const r2 = correlation * correlation;

    return {
      primary: {
        mean: calculateMean(validPrimaryData),
        median: calculateMedian(validPrimaryData),
        stdDev: calculateStandardDeviation(validPrimaryData),
        min: validPrimaryData.length ? Math.min(...validPrimaryData) : 0,
        max: validPrimaryData.length ? Math.max(...validPrimaryData) : 0,
      },
      secondary: {
        mean: calculateMean(validSecondaryData),
        median: calculateMedian(validSecondaryData),
        stdDev: calculateStandardDeviation(validSecondaryData),
        min: validSecondaryData.length ? Math.min(...validSecondaryData) : 0,
        max: validSecondaryData.length ? Math.max(...validSecondaryData) : 0,
      },
      correlation,
      regression: { slope, intercept, r2 },
      outliers: {
        primaryCount: primaryOutliers.indices.length,
        secondaryCount: secondaryOutliers.indices.length,
      },
    };
  }, [
    filteredData,
    filteredOutlierData,
    showOutliers,
    primaryVariable,
    secondaryVariable,
    regressionParams,
    primaryOutliers.indices,
    secondaryOutliers.indices,
  ]);

  // Generate automated insights based on statistics
  const generateInsights = useMemo(() => {
    const insights = [];

    // Correlation insights
    if (Math.abs(statistics.correlation) > 0.7) {
      insights.push(
        `There is a strong ${statistics.correlation > 0 ? "positive" : "negative"} correlation (${statistics.correlation.toFixed(2)}) between ${primaryVariable} and ${secondaryVariable}.`
      );
    } else if (Math.abs(statistics.correlation) > 0.3) {
      insights.push(
        `There is a moderate ${statistics.correlation > 0 ? "positive" : "negative"} correlation (${statistics.correlation.toFixed(2)}) between ${primaryVariable} and ${secondaryVariable}.`
      );
    } else {
      insights.push(
        `There is a weak correlation (${statistics.correlation.toFixed(2)}) between ${primaryVariable} and ${secondaryVariable}.`
      );
    }

    // Trend insights for primary variable
    const firstHalf = primaryData.slice(0, Math.floor(primaryData.length / 2));
    const secondHalf = primaryData.slice(Math.floor(primaryData.length / 2));
    const firstHalfMean = calculateMean(firstHalf);
    const secondHalfMean = calculateMean(secondHalf);

    if (secondHalfMean > firstHalfMean * 1.1) {
      insights.push(
        `${primaryVariable} shows an increasing trend over time (${(((secondHalfMean - firstHalfMean) / firstHalfMean) * 100).toFixed(1)}% increase).`
      );
    } else if (firstHalfMean > secondHalfMean * 1.1) {
      insights.push(
        `${primaryVariable} shows a decreasing trend over time (${(((firstHalfMean - secondHalfMean) / firstHalfMean) * 100).toFixed(1)}% decrease).`
      );
    } else {
      insights.push(`${primaryVariable} remains relatively stable over time.`);
    }

    // Variability insights
    const primaryCoeffVar = statistics.primary.stdDev / statistics.primary.mean;
    if (primaryCoeffVar > 0.3) {
      insights.push(
        `${primaryVariable} shows high variability (CV = ${primaryCoeffVar.toFixed(2)}).`
      );
    } else if (primaryCoeffVar > 0.1) {
      insights.push(
        `${primaryVariable} shows moderate variability (CV = ${primaryCoeffVar.toFixed(2)}).`
      );
    } else {
      insights.push(
        `${primaryVariable} shows low variability (CV = ${primaryCoeffVar.toFixed(2)}).`
      );
    }

    return insights;
  }, [statistics, primaryVariable, secondaryVariable, primaryData]);

  // Available variables for analysis
  const availableVariables = useMemo(() => {
    return floatVariables.map((variable) => ({
      value: variable.key,
      label: variable.key, // Puedes usar un nombre más descriptivo si es necesario
    }));
  }, []);

  function handleDownload(
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ): void {
    throw new Error("Function not implemented.");
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden dark:bg-gray-900 dark:text-white">
      {/* Sidebar mejorado con animaciones y mejor estructura */}
      <div
        className={`analytics-sidebar transition-all duration-300 ease-in-out ${
          sidebarOpen ? "w-80" : "w-0 md:w-20"
        } bg-card border-r border-border h-full flex flex-col fixed  left-0 top-0 z-10 flex-shrink-0 ${
          !sidebarOpen && isMobile ? "hidden" : ""
        } dark:bg-gray-800 dark:border-gray-700`}
      >
        {/* Encabezado del Sidebar */}
        <div className="p-8 flex items-center justify-between border-b border-border dark:border-gray-700">
          {/* Título del sidebar, ahora blanco en dark mode */}
          <h2
            className={`font-semibold text-lg transition-opacity duration-300 text-foreground dark:text-white ${
              sidebarOpen ? "opacity-100" : "opacity-0 md:opacity-100"
            }`}
          >
            Analytics
          </h2>
        </div>

        {/* Elementos de Navegación */}
        <div className="flex py-6 overflow-y-auto">
          <nav className="space-y-20 px-8">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  if (isMobile) setSidebarOpen(false);
                }}
                className={`w-full flex items-center px-3 py-3 rounded-md transition-all duration-200 hover:bg-muted/80 group ${
                  activeSection === item.id
                    ? "bg-primary/10 text-primary shadow-sm dark:bg-blue-500/20 dark:text-blue-300" // Estilo activo en dark mode
                    : "text-muted-foreground dark:text-gray-400" // Estilo inactivo en dark mode
                }`}
              >
                <span className="flex-shrink-0 group-hover:text-foreground dark:group-hover:text-white">
                  {item.icon}
                </span>
                <div
                  className={`ml-3 flex flex-col transition-opacity duration-300 ${sidebarOpen ? "opacity-100" : "opacity-0 md:opacity-100"}`}
                >
                  <span className="text-sm font-medium text-left text-foreground dark:text-white">
                    {item.label}
                  </span>
                  <span className="text-xs opacity-70 truncate text-left text-muted-foreground dark:text-gray-400">
                    {item.description}
                  </span>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Logo UTB en la parte inferior */}
        <div className="mt-auto flex justify-center p-4">
          <Image
            src="/images/logo.svg"
            alt="WellProdSimulator"
            width={400}
            height={300}
            className="object-contain"
          />
        </div>
      </div>

      {/* Contenido principal mejorado */}
      <div
        className={`flex-1 flex flex-col h-screen overflow-hidden ${
          sidebarOpen ? "ml-80" : "ml-0 md:ml-20"
        } transition-all duration-300 ease-in-out`}
      >
        {/* Header con información contextual */}
        <header className="bg-background border-b border-border p-6 flex justify-between items-center flex-shrink-0 dark:bg-gray-900 dark:border-gray-700">
          <div>
            <h1 className="text-xl font-semibold text-foreground dark:text-white">
              {navigationItems.find((item) => item.id === activeSection)?.label}
            </h1>
            <p className="text-sm text-muted-foreground dark:text-gray-400">
              {
                navigationItems.find((item) => item.id === activeSection)
                  ?.description
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Botón "Go to Simulator" */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/pages/simulador")}
              className="text-white  dark:border-gray-700 dark:hover:bg-white dark:hover:text-white"
            >
              Go to Simulator
            </Button>
          </div>
        </header>

        {/* Área de Contenido Principal */}
        <main className="flex-1 overflow-y-scroll scrollbar-hide p-16 dark:bg-gray-950">
          <div className="container mx-auto max-w-8xl">
            {/* Dashboard / Home */}
            {activeSection === "home" && (
              <div className="animate-fadeIn space-y-6">
                {/* Estadísticas rápidas arriba */}
                <div className="grid md:grid-cols-3 gap-4">
                  {/* Card for Quick Stats */}
                  <Card className="col-span-3 md:col-span-1 dark:bg-gray-800 dark:border-gray-700">
                    <CardHeader className="pb-2">
                      <CardTitle className="dark:text-white">
                        Quick Stats
                      </CardTitle>
                      <CardDescription className="dark:text-gray-400">
                        Key performance metrics
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Tarjeta 1: Bienestar Emocional */}
                                <div className="bg-muted/40 p-5 rounded-lg dark:bg-gray-700/40 min-h-[140px] flex flex-col justify-between">
                                  <div>
                                    <p className="text-sm text-muted-foreground dark:text-gray-400 mb-2">
                                      Emotional Wellbeing
                                    </p>
                                    <h3 className="text-2xl font-bold dark:text-white truncate">
                                      {(() => {
                                        
                                        const wellbeingIndex = calculateWellbeingIndex(simulationData);
                                        return isNaN(wellbeingIndex) || !isFinite(wellbeingIndex) 
                                          ? "N/A" 
                                          : `${wellbeingIndex.toFixed(1)}%`;
                                      })()}
                                    </h3>
                                  </div>
                                  <p className="text-xs text-muted-foreground dark:text-gray-500 mt-2">
                                    Based on positive/negative emotions and health
                                  </p>
</div>

                        {/* Tarjeta 2: Salud Económica */}
                        <div className="bg-muted/40 p-5 rounded-lg dark:bg-gray-700/40 min-h-[140px] flex flex-col justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground dark:text-gray-400 mb-2">
                              Economic Health
                            </p>
                            <h3 className="text-2xl font-bold dark:text-white truncate">
                              {(() => {
                                // Extraer valores explícitamente
                                const moneyValues = simulationData.map(
                                  (item) => Number(item.money) || 0
                                );
                                const obligationValues = simulationData.map(
                                  (item) =>
                                    (Number(item.toPay) || 0) +
                                    (Number(item.loanAmountToPay) || 0)
                                );

                                const money = calculateMean(moneyValues);
                                const obligations =
                                  calculateMean(obligationValues);

                                // Ajustar la fórmula para evitar siempre 100%
                                const ratio =
                                  obligations > 0
                                    ? Math.min(100, (money / obligations) * 100)
                                    : money > 0
                                      ? 100
                                      : 50; // 50% si no hay dinero ni obligaciones

                                return isNaN(ratio) || !isFinite(ratio)
                                  ? "N/A"
                                  : `${ratio.toFixed(1)}%`;
                              })()}
                            </h3>
                          </div>
                          <p className="text-xs text-muted-foreground dark:text-gray-500 mt-2">
                            Relationship between income and financial
                            obligations
                          </p>
                        </div>

                        {/* Tarjeta 3: Productividad Agrícola */}
                        <div className="bg-muted/40 p-5 rounded-lg dark:bg-gray-700/40 min-h-[140px] flex flex-col justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground dark:text-gray-400 mb-2">
                              Agricultural Productivity
                            </p>
                            <h3 className="text-2xl font-bold dark:text-white truncate">
                              {(() => {
                                // Extraer correctamente y verificar que hay datos
                                const harvestValues = simulationData.map(
                                  (item) =>
                                    Number(item.totalHarvestedWeight) || 0
                                );
                                const harvest = calculateMean(harvestValues);

                                // Ajustar la normalización a un valor más apropiado (100 en lugar de 1000)
                                const normalized = Math.min(
                                  100,
                                  (harvest / 100) * 100
                                );

                                return isNaN(normalized) ||
                                  !isFinite(normalized)
                                  ? "N/A"
                                  : `${normalized.toFixed(1)}%`;
                              })()}
                            </h3>
                          </div>
                          <p className="text-xs text-muted-foreground dark:text-gray-500 mt-2">
                            {calculateTrend(
                              simulationData.map(
                                (item) => item.totalHarvestedWeight || 0
                              )
                            )}
                          </p>
                        </div>

                        {/* Tarjeta 4: Sostenibilidad de Recursos */}
                        <div className="bg-muted/40 p-5 rounded-lg dark:bg-gray-700/40 min-h-[140px] flex flex-col justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground dark:text-gray-400 mb-2">
                              Sustainability
                            </p>
                            <h3 className="text-2xl font-bold dark:text-white truncate">
                              {(() => {
                                // Obtener el valor promedio de disponibilidad de agua
                                const waterValues = simulationData.map(
                                  (item) => Number(item.waterAvailable) || 0
                                );
                                let value = calculateMean(waterValues);

                                // Primero normalizar el valor a un porcentaje si es demasiado grande
                                if (value > 10) {
                                  value = Math.min(value / 100000, 100);
                                  return `${value.toFixed(1)}%`;
                                }

                                // Si es un valor normal, mostrarlo como porcentaje
                                return `${(value * 100).toFixed(1)}%`;
                              })()}
                            </h3>
                          </div>
                          <p className="text-xs text-muted-foreground dark:text-gray-500 mt-2">
                            Availability of water and critical resources
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card for Simulation Overview Chart */}
                  <Card className="md:col-span-2 dark:bg-gray-800 dark:border-gray-700">
                    <CardHeader className="pb-2">
                      <CardTitle className="dark:text-white">
                        Simulation Efficiency Over Time
                      </CardTitle>{" "}
                      {/* Título más específico */}
                      <CardDescription className="dark:text-gray-400">
                        Efficiency metrics over simulation days
                      </CardDescription>{" "}
                      {/* Descripción más específica */}
                    </CardHeader>
                    <CardContent className="pt-0">
                      {/* Gráfico de Área con estilo de la imagen */}
                      <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          {/* Usamos AreaChart para el área rellena */}
                          <AreaChart
                            data={simulationData}
                            margin={{
                              top: 10,
                              right: 30,
                              left: 0,
                              bottom: 0,
                            }}
                          >
                            {/* Personaliza el fondo de la cuadrícula para un tema oscuro */}
                            {/* Desactivamos las líneas verticales y hacemos las horizontales sutiles */}
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#333"
                              vertical={false}
                            />
                            {/* Eje X estilizado para tema oscuro */}
                            <XAxis dataKey="name" stroke="#888" />
                            {/* Eje Y estilizado para tema oscuro, ajustando el dominio si es necesario */}
                            {/* El dominio [30, 90] se basa en la imagen de ejemplo */}
                            <YAxis stroke="#888" domain={[30, 90]} />
                            {/* Tooltip con estilo por defecto de recharts se adapta al tema */}
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#333",
                                border: "none",
                                color: "#fff",
                              }} // Estilo básico para el tooltip en dark mode
                              labelStyle={{ color: "#ddd" }} // Estilo para la etiqueta del tooltip
                              itemStyle={{ color: "#fff" }} // Estilo para los ítems del tooltip
                            />
                            {/* Legend para identificar la línea */}
                            <Legend wrapperStyle={{ color: "#ccc" }} />{" "}
                            {/* Estilo para el texto de la leyenda */}
                            {/* Define un gradiente para el área si quieres ese efecto */}
                            {/* Los colores deben coincidir con el stroke de la línea */}
                            <defs>
                              <linearGradient
                                id="colorEfficiencyArea"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="5%"
                                  stopColor="#8884d8"
                                  stopOpacity={0.8}
                                />
                                <stop
                                  offset="95%"
                                  stopColor="#8884d8"
                                  stopOpacity={0}
                                />
                              </linearGradient>
                            </defs>
                            {/* Línea y área para la eficiencia */}
                            <Area
                              type="monotone" // Tipo de curva suave
                              dataKey="totalHarvestedWeight" // Datos a mostrar
                              stroke="#8884d8" // Color de la línea (ej. azul/púrpura)
                              fillOpacity={1} // Opacidad del relleno
                              fill="url(#colorEfficiencyArea)" // Usa el gradiente para el relleno
                              strokeWidth={2} // Grosor de la línea
                              dot={false} // No mostrar puntos individuales en la línea
                              // activeDot={{ r: 5, stroke: '#8884d8', fill: '#8884d8' }} // Opcional: punto al pasar el ratón
                            />
                            {/* Agrega una línea de referencia para el promedio */}
                            <ReferenceLine
                              y={averageEfficiency} // Usa el promedio calculado
                              stroke="red" // Color de la línea promedio
                              strokeDasharray="3 3" // Estilo de línea punteada
                              // label con estilo para dark mode
                              label={{
                                value: `Average: ${averageEfficiency.toFixed(1)}%`,
                                position: "right",
                                fill: "red",
                                fontSize: 12,
                              }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="dark:bg-gray-800 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="dark:text-white">
                      Simulation Details
                    </CardTitle>
                    <CardDescription className="dark:text-gray-400">
                      Comprehensive information about the current simulation
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="dark:text-gray-300">
                        This dashboard provides an overview of the simulation
                        data. Here, you can see aggregated metrics, summary
                        charts, and key performance indicators that provide
                        insights into the overall behavior and progress of the
                        simulation.
                      </p>
                      <p className="dark:text-gray-300">
                        Use the navigation panel on the left to explore
                        different aspects of the simulation data. You can:
                      </p>
                      <ul className="list-disc pl-5 space-y-1 dark:text-gray-300">
                        <li>View detailed parameter analysis</li>
                        <li>Check individual agent status and activities</li>
                        <li>
                          Analyze relationships and distributions between
                          simulation variables
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t border-border pt-4 flex justify-end dark:border-gray-700">
                    <Button
                      onClick={() => setActiveSection("statistics")}
                      className="dark:text-white dark:border-gray-700 dark:hover:bg-gray-700 dark:hover:text-white"
                    >
                      View Statistics
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            )}

            {/* Statistics Section */}
            {activeSection === "statistics" && (
              <div className="animate-fadeIn space-y-6">
                <Card className="dark:bg-gray-800 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="dark:text-white">
                      Statistical Analysis
                    </CardTitle>
                    <CardDescription className="dark:text-gray-400">
                      Analyze relationships and distributions between simulation
                      variables
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="comparison" className="w-full">
                      <TabsList className="grid w-full grid-cols-3 mb-6 dark:bg-gray-700 dark:text-gray-300">
                        <TabsTrigger
                          value="comparison"
                          className="dark:data-[state=active]:bg-gray-900 dark:data-[state=active]:text-white"
                        >
                          Variable Comparison
                        </TabsTrigger>
                        <TabsTrigger
                          value="distribution"
                          className="dark:data-[state=active]:bg-gray-900 dark:data-[state=active]:text-white"
                        >
                          Distribution Analysis
                        </TabsTrigger>
                        <TabsTrigger
                          value="time-series"
                          className="dark:data-[state=active]:bg-gray-900 dark:data-[state=active]:text-white"
                        >
                          Time Series Analysis
                        </TabsTrigger>
                      </TabsList>

                      {/* Variable Comparison Tab */}
                      <TabsContent value="comparison" className="space-y-4">
                        <div className="bg-muted/30 p-4 rounded-lg dark:bg-gray-700/30">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <Label
                                htmlFor="primary-variable"
                                className="text-sm font-medium mb-2 block dark:text-white"
                              >
                                Primary Variable
                              </Label>
                              <Select
                                value={primaryVariable}
                                onValueChange={setPrimaryVariable}
                              >
                                <SelectTrigger
                                  id="primary-variable"
                                  className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                >
                                  <SelectValue placeholder="Select variable" />
                                </SelectTrigger>
                                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                                  {availableVariables.map((variable) => (
                                    <SelectItem
                                      key={variable.value}
                                      value={variable.value}
                                      className="dark:text-white dark:focus:bg-gray-700"
                                    >
                                      {variable.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label
                                htmlFor="secondary-variable"
                                className="text-sm font-medium mb-2 block dark:text-white"
                              >
                                Secondary Variable
                              </Label>
                              <Select
                                value={secondaryVariable}
                                onValueChange={setSecondaryVariable}
                              >
                                <SelectTrigger
                                  id="secondary-variable"
                                  className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                >
                                  <SelectValue placeholder="Select variable" />
                                </SelectTrigger>
                                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                                  {availableVariables.map((variable) => (
                                    <SelectItem
                                      key={variable.value}
                                      value={variable.value}
                                      className="dark:text-white dark:focus:bg-gray-700"
                                    >
                                      {variable.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="mt-4">
                            <Label
                              htmlFor="time-range"
                              className="text-sm font-medium mb-2 block dark:text-white"
                            >
                              Time Range:{" "}
                              {simulationData[timeRange[0]]?.name || "N/A"} -{" "}
                              {simulationData[timeRange[1]]?.name || "N/A"}
                            </Label>
                            <Slider
                              id="time-range"
                              min={0}
                              max={simulationData.length - 1}
                              step={1}
                              value={timeRange}
                              onValueChange={handleTimeRangeChange} // Usa el nuevo controlador
                              className="my-4"
                            />
                          </div>
                          <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="show-regression"
                                checked={showRegressionLine}
                                onCheckedChange={setShowRegressionLine}
                              />
                              <Label
                                htmlFor="show-regression"
                                className="dark:text-white"
                              >
                                Show Regression Line
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="show-outliers"
                                checked={showOutliers}
                                onCheckedChange={setShowOutliers}
                              />
                              <Label
                                htmlFor="show-outliers"
                                className="dark:text-white"
                              >
                                Include Outliers
                              </Label>
                            </div>
                          </div>
                        </div>

                        {/* Scatter Plot for Variable Comparison */}
                        <div className="bg-card border border-border rounded-lg p-6 dark:bg-gray-800 dark:border-gray-700">
                          <div className="mb-4 flex justify-between items-center">
                            <div>
                              <h3 className="text-lg font-medium dark:text-white">
                                {
                                  availableVariables.find(
                                    (v) => v.value === primaryVariable
                                  )?.label
                                }{" "}
                                vs{" "}
                                {
                                  availableVariables.find(
                                    (v) => v.value === secondaryVariable
                                  )?.label
                                }
                              </h3>
                              <p className="text-sm text-muted-foreground dark:text-gray-400">
                                Correlation: {statistics.correlation.toFixed(3)}{" "}
                                {Math.abs(statistics.correlation) > 0.7
                                  ? "(Strong)"
                                  : Math.abs(statistics.correlation) > 0.3
                                    ? "(Moderate)"
                                    : "(Weak)"}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className="dark:border-gray-700 dark:text-white"
                            >
                              {filteredData.length} data points
                            </Badge>
                          </div>

                          <div className="h-96 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <div className="h-96 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <ScatterChart
                                    margin={{
                                      top: 20,
                                      right: 30,
                                      bottom: 20,
                                      left: 20,
                                    }}
                                  >
                                    <CartesianGrid
                                      strokeDasharray="3 3"
                                      stroke="#333"
                                      opacity={0.5}
                                    />
                                    <XAxis
                                      type="number"
                                      dataKey={primaryVariable}
                                      name={
                                        availableVariables.find(
                                          (v) => v.value === primaryVariable
                                        )?.label
                                      }
                                      stroke="#888"
                                      domain={["auto", "auto"]}
                                      label={{
                                        value: availableVariables.find(
                                          (v) => v.value === primaryVariable
                                        )?.label,
                                        position: "bottom",
                                        fill: "#888",
                                      }}
                                    />
                                    <YAxis
                                      type="number"
                                      dataKey={secondaryVariable}
                                      name={
                                        availableVariables.find(
                                          (v) => v.value === secondaryVariable
                                        )?.label
                                      }
                                      stroke="#888"
                                      domain={["auto", "auto"]}
                                      label={{
                                        value: availableVariables.find(
                                          (v) => v.value === secondaryVariable
                                        )?.label,
                                        angle: -90,
                                        position: "left",
                                        fill: "#888",
                                      }}
                                    />
                                    <Tooltip
                                      cursor={{ strokeDasharray: "3 3" }}
                                      contentStyle={{
                                        backgroundColor: "#1f2937",
                                        border: "1px solid #374151",
                                        borderRadius: "6px",
                                        color: "#fff",
                                      }}
                                      formatter={(value, name) => [
                                        value,
                                        availableVariables.find(
                                          (v) => v.value === name
                                        )?.label,
                                      ]}
                                    />
                                    <Scatter
                                      name="Variables"
                                      data={filteredOutlierData}
                                      fill="#8884d8"
                                    />
                                    {showRegressionLine && (
                                      <Line
                                        type="linear"
                                        data={regressionLineData}
                                        dataKey={secondaryVariable}
                                        stroke="#ff7300"
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={false}
                                        legendType="none"
                                        name="Línea de regresión"
                                      />
                                    )}
                                  </ScatterChart>
                                </ResponsiveContainer>
                              </div>
                            </ResponsiveContainer>
                          </div>

                          {/* Statistical Summary */}
                          <div className="mt-6 grid md:grid-cols-2 gap-6">
                            <div className="bg-muted/30 p-4 rounded-lg dark:bg-gray-700/30">
                              <h4 className="text-md font-medium mb-3 dark:text-white">
                                {
                                  availableVariables.find(
                                    (v) => v.value === primaryVariable
                                  )?.label
                                }{" "}
                                Statistics
                              </h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-xs text-muted-foreground dark:text-gray-400">
                                    Mean
                                  </p>
                                  <p className="text-sm font-medium dark:text-white">
                                    {statistics.primary.mean.toFixed(2)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground dark:text-gray-400">
                                    Median
                                  </p>
                                  <p className="text-sm font-medium dark:text-white">
                                    {statistics.primary.median
                                      ? statistics.primary.median.toFixed(2)
                                      : "N/A"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground dark:text-gray-400">
                                    Std. Deviation
                                  </p>
                                  <p className="text-sm font-medium dark:text-white">
                                    {statistics.primary.stdDev.toFixed(2)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground dark:text-gray-400">
                                    Range
                                  </p>
                                  <p className="text-sm font-medium dark:text-white">
                                    {statistics.primary.min.toFixed(1)} -{" "}
                                    {statistics.primary.max.toFixed(1)}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="bg-muted/30 p-4 rounded-lg dark:bg-gray-700/30">
                              <h4 className="text-md font-medium mb-3 dark:text-white">
                                {
                                  availableVariables.find(
                                    (v) => v.value === secondaryVariable
                                  )?.label
                                }{" "}
                                Statistics
                              </h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-xs text-muted-foreground dark:text-gray-400">
                                    Mean
                                  </p>
                                  <p className="text-sm font-medium dark:text-white">
                                    {statistics.secondary.mean.toFixed(2)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground dark:text-gray-400">
                                    Median
                                  </p>
                                  <p className="text-sm font-medium dark:text-white">
                                    {statistics.secondary.median
                                      ? statistics.secondary.median.toFixed(2)
                                      : "N/A"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground dark:text-gray-400">
                                    Std. Deviation
                                  </p>
                                  <p className="text-sm font-medium dark:text-white">
                                    {statistics.secondary.stdDev.toFixed(2)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground dark:text-gray-400">
                                    Range
                                  </p>
                                  <p className="text-sm font-medium dark:text-white">
                                    {statistics.secondary.min.toFixed(1)} -{" "}
                                    {statistics.secondary.max.toFixed(1)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                          {/* Información de regresión (cuando está activada) */}
                          {showRegressionLine && (
                            <div className="mt-4 bg-muted/30 p-4 rounded-lg dark:bg-gray-700/30">
                              <h4 className="text-md font-medium mb-3 dark:text-white">
                                Regression Analysis
                              </h4>
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <p className="text-xs text-muted-foreground dark:text-gray-400">
                                    Equation
                                  </p>
                                  <p className="text-sm font-medium dark:text-white">
                                    y = {statistics.regression.slope.toFixed(4)}
                                    x +{" "}
                                    {statistics.regression.intercept.toFixed(4)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground dark:text-gray-400">
                                    R² Value
                                  </p>
                                  <p className="text-sm font-medium dark:text-white">
                                    {statistics.regression.r2.toFixed(4)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground dark:text-gray-400">
                                    Significance
                                  </p>
                                  <p className="text-sm font-medium dark:text-white">
                                    {statistics.regression.r2 > 0.7
                                      ? "Strong"
                                      : statistics.regression.r2 > 0.3
                                        ? "Moderate"
                                        : "Weak"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Información de outliers (cuando están excluidos) */}
                          {!showOutliers &&
                            (statistics.outliers.primaryCount > 0 ||
                              statistics.outliers.secondaryCount > 0) && (
                              <div className="mt-4 bg-muted/30 p-4 rounded-lg dark:bg-gray-700/30">
                                <h4 className="text-md font-medium mb-3 dark:text-white">
                                  Excluded Outliers
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-xs text-muted-foreground dark:text-gray-400">
                                      {
                                        availableVariables.find(
                                          (v) => v.value === primaryVariable
                                        )?.label
                                      }
                                    </p>
                                    <p className="text-sm font-medium dark:text-white">
                                      {statistics.outliers.primaryCount}{" "}
                                      Excluded Outliers
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground dark:text-gray-400">
                                      {
                                        availableVariables.find(
                                          (v) => v.value === secondaryVariable
                                        )?.label
                                      }
                                    </p>
                                    <p className="text-sm font-medium dark:text-white">
                                      {statistics.outliers.secondaryCount}{" "}
                                      outliers excluidos
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                          {/* Automated Insights */}
                          <div className="mt-6">
                            <h4 className="text-md font-medium mb-3 dark:text-white">
                              Automated Insights
                            </h4>
                            <Alert className="dark:bg-gray-700/30 dark:border-gray-600">
                              <AlertDescription>
                                <ul className="list-disc pl-5 space-y-1 dark:text-gray-300">
                                  {generateInsights.map((insight, index) => (
                                    <li key={index}>{insight}</li>
                                  ))}
                                </ul>
                              </AlertDescription>
                            </Alert>
                          </div>
                        </div>
                      </TabsContent>

                      {/* Distribution Analysis Tab */}
                <TabsContent value="distribution" className="space-y-4">
                  <DistributionAnalysis data={filteredData} />
                </TabsContent>

                      {/* Time Series Analysis Tab */}
                      <TabsContent value="time-series" className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground dark:text-gray-400">
                            <TimeSeriesAnalysis data={simulationData} />
                          </p>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Agents Section */}
            {activeSection === "agents" && (
              <div className="animate-fadeIn space-y-6">
                {selectedAgent ? (
                  <AgentDetailView
                    agentId={selectedAgent}
                    agentData={getAgentData(selectedAgent)}
                    onBack={() => setSelectedAgent(null)}
                    averageEfficiency={averageEfficiency}
                  />
                ) : (
                  <Card className="dark:bg-gray-800 dark:border-gray-700">
                    <CardHeader>
                      <CardTitle className="dark:text-white">
                        Agent Management
                      </CardTitle>
                      <CardDescription className="dark:text-gray-400">
                        View and analyze individual agent status and behavior
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium mb-4 dark:text-white">
                          Agent Activity Summary
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                          {/* Stats */}
                          <div className="bg-muted/40 p-4 rounded-lg dark:bg-gray-700/40 md:col-span-1">
                            <div className="grid md:grid-cols-3 gap-4">
                              <div className="md:col-span-3">
                                <p className="text-sm text-muted-foreground dark:text-gray-400 mb-2">
                                  Agent Status Distribution
                                </p>
                              </div>
                              <div className="md:col-span-1">
                                <p className="text-sm text-muted-foreground dark:text-gray-400">
                                  Active
                                </p>
                                <h3 className="text-2xl font-bold dark:text-white">
                                  {activityData.find(
                                    (d) => d.name === "Working"
                                  )?.value || 0}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1 dark:text-gray-500">
                                  {/* Cálculo de porcentaje con manejo de división por cero */}
                                  {activityData.reduce(
                                    (sum, d) => sum + d.value,
                                    0
                                  ) > 0
                                    ? (
                                        ((activityData.find(
                                          (d) => d.name === "Working"
                                        )?.value || 0) /
                                          activityData.reduce(
                                            (sum, d) => sum + d.value,
                                            0
                                          )) *
                                        100
                                      ).toFixed(0)
                                    : 0}
                                  % of total
                                </p>
                              </div>
                              <div className="md:col-span-1">
                                <p className="text-sm text-muted-foreground dark:text-gray-400">
                                  Idle
                                </p>
                                <h3 className="text-2xl font-bold dark:text-white">
                                  {activityData.find((d) => d.name === "Idle")
                                    ?.value || 0}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1 dark:text-gray-500">
                                  {activityData.reduce(
                                    (sum, d) => sum + d.value,
                                    0
                                  ) > 0
                                    ? (
                                        ((activityData.find(
                                          (d) => d.name === "Idle"
                                        )?.value || 0) /
                                          activityData.reduce(
                                            (sum, d) => sum + d.value,
                                            0
                                          )) *
                                        100
                                      ).toFixed(0)
                                    : 0}
                                  % of total
                                </p>
                              </div>
                              <div className="md:col-span-1">
                                <p className="text-sm text-muted-foreground dark:text-gray-400">
                                  Terminated
                                </p>
                                <h3 className="text-2xl font-bold dark:text-white">
                                  {activityData.find(
                                    (d) => d.name === "Terminated"
                                  )?.value || 0}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1 dark:text-gray-500">
                                  {activityData.reduce(
                                    (sum, d) => sum + d.value,
                                    0
                                  ) > 0
                                    ? (
                                        ((activityData.find(
                                          (d) => d.name === "Terminated"
                                        )?.value || 0) /
                                          activityData.reduce(
                                            (sum, d) => sum + d.value,
                                            0
                                          )) *
                                        100
                                      ).toFixed(0)
                                    : 0}
                                  % of total
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Pie Chart */}
                          <div className="bg-muted/40 p-4 rounded-lg dark:bg-gray-700/40 md:col-span-1">
                            <p className="text-sm text-muted-foreground dark:text-gray-400 mb-2">
                              Agent Status Visualization
                            </p>
                            <div className="h-64 w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={activityData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={80}
                                    dataKey="value"
                                    label={({ name, percent }) =>
                                      `${name}: ${(percent * 100).toFixed(0)}%`
                                    }
                                  >
                                    {activityData.map((entry, index) => (
                                      <Cell
                                        key={`cell-${index}`}
                                        fill={COLORS[index % COLORS.length]}
                                      />
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
                      </div>

                      {/* Agent List */}
                      <div className="mt-6">
                        <h3 className="text-lg font-medium mb-4 dark:text-white">
                          Available Agents
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {loadedAgents.length === 0 ? (
                            <p className="text-muted-foreground dark:text-gray-400 col-span-3">
                              Loading agents...
                            </p>
                            ) : (
                              loadedAgents.map((agentName, index) => {
                                // Extraer datos del agente desde el WebSocket
                                const agentInfo = agentTaskLogs[agentName] || {};
                                let agentStatus = "Active";
                                
                                try {
                                  // Determinar el estado basado en los datos del agente
                                  let agentStateData: AgentState = {};
                                  if (agentInfo.state) {
                                    if (typeof agentInfo.state === 'string') {
                                      agentStateData = JSON.parse(agentInfo.state);
                                    } else {
                                      agentStateData = agentInfo.state;
                                    }
                                  }
                                  
                                  const health = agentStateData.health || 70;
                                  const lastUpdateTime = agentLastUpdate[agentName] || 0;
                                  const now = Date.now();
                                  
                                  // Criterios para determinar el estado
                                  if (health <= 10 || !simulationActive || (now - lastUpdateTime > TIMEOUT_THRESHOLD && lastUpdateTime > 0)) {
                                    agentStatus = "Terminated";
                                  } else if (health < 30) {
                                    agentStatus = "Critical";
                                  } else if (health < 60) {
                                    agentStatus = "Struggling";
                                  } else {
                                    agentStatus = "Active";
                                  }
                                } catch (error) {
                                  console.error("Error procesando estado del agente:", error);
                                }
                                
                                return (
                                  <Card
                                    key={agentName}
                                    className="dark:bg-gray-800 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer"
                                    onClick={() => {
                                      setSelectedAgent(`${index + 1}`);
                                    }}
                                  >
                                    <CardContent className="p-4">
                                      <div className="flex items-center space-x-3">
                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center 
                                          ${agentStatus === "Active" ? "dark:bg-green-900/30" : 
                                            agentStatus === "Struggling" ? "dark:bg-yellow-900/30" :
                                            agentStatus === "Critical" ? "dark:bg-red-900/30" :
                                            "dark:bg-gray-900/30"}`}>
                                          <Users className={`h-5 w-5 
                                            ${agentStatus === "Active" ? "text-green-500" : 
                                              agentStatus === "Struggling" ? "text-yellow-500" :
                                              agentStatus === "Critical" ? "text-red-500" :
                                              "text-gray-500"}`} />
                                        </div>
                                        <div>
                                          <h4 className="font-medium dark:text-white">
                                            Family {index + 1}
                                          </h4>
                                          <div className="flex items-center">
                                            <span className={`w-2 h-2 rounded-full mr-2
                                              ${agentStatus === "Active" ? "bg-green-500" : 
                                                agentStatus === "Struggling" ? "bg-yellow-500" :
                                                agentStatus === "Critical" ? "bg-red-500" :
                                                "bg-gray-500"}`}></span>
                                            <p className="text-xs text-muted-foreground dark:text-gray-400">
                                              {agentName} {agentStatus === "Terminated" ? "(Terminated)" : ""}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              })
                            )}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="border-t border-border pt-4 flex justify-between dark:border-gray-700">
                      <Button
                        variant="outline"
                        onClick={() => setActiveSection("statistics")}
                        className="dark:text-white dark:border-gray-700 dark:hover:bg-gray-700 dark:hover:text-white"
                      >
                        Back to statistics
                      </Button>
                    </CardFooter>
                  </Card>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
