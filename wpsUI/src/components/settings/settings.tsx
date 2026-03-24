"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  InfoIcon,
  HelpCircle,
  Terminal,
  Rocket,
  Users,
  Coins,
  Wallet,
  Landmark,
  Sprout,
  Trees,
  Tractor,
  Brain,
  Network,
  Droplets,
  GraduationCap,
  HeartPulse,
  Wrench,
  Wheat,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";

// --- Componentes Auxiliares Visuales ---

interface VisualCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  isSelected: boolean;
  onClick: () => void;
  colorClass?: string;
}

const VisualCard = ({ title, description, icon, isSelected, onClick, colorClass = "border-primary" }: VisualCardProps) => (
  <motion.div
    whileHover={{ scale: 1.03 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={cn(
      "cursor-pointer p-3 rounded-xl border-2 transition-all duration-300 flex flex-col items-center text-center gap-2",
      isSelected 
        ? `bg-[#1a232b] ${colorClass} shadow-[0_0_15px_rgba(59,130,246,0.15)]` 
        : "bg-[#14181c] border-[#272d34] hover:border-gray-500 opacity-70 hover:opacity-100"
    )}
  >
    <div className={cn("p-2 rounded-full", isSelected ? "bg-primary/20 text-primary" : "bg-gray-800 text-gray-400")}>
      {icon}
    </div>
    <div>
      <h4 className="font-bold text-sm text-white mb-1">{title}</h4>
      <p className="text-xs text-gray-400 leading-tight">{description}</p>
    </div>
  </motion.div>
);

// --- Plantillas de Experimentos ---

interface ExperimentTemplate {
  id: string;
  name: string;
  description: string;
  explanation: string;
  icon: React.ReactNode;
  config: {
    agents: number;
    money: number;
    land: number;
    personality: number;
    worldSize: number;
    emotions: boolean;
    irrigation: boolean;
    training: boolean;
    years: number;
    water: number;
    seeds: number;
    tools: number;
    variance?: number;
    criminality?: number;
    steptime?: number;
    perturbation?: string;
    trainingSlots?: number;
  };
}

const EXPERIMENT_TEMPLATES: ExperimentTemplate[] = [
  {
    id: "custom",
    name: "Personalizado",
    description: "Configuración manual de todos los parámetros de la simulación.",
    explanation: "Este modo te permite ajustar cada variable del ecosistema de forma independiente. Ideal para pruebas específicas de estrés o validación de hipótesis únicas.",
    icon: <Terminal className="w-5 h-5 text-blue-400" />,
    config: {
      agents: 20, money: 1500000, land: 2, personality: 0.5, worldSize: 100,
      water: 10, seeds: 50, tools: 20,
      emotions: true, irrigation: true, training: false, years: 1,
      variance: 0.4, criminality: 3, steptime: 40, trainingSlots: 50,
    }
  },
  {
    id: "stress",
    name: "Coste del Estrés",
    description: "Evaluación del impacto emocional (eBDI) en la productividad.",
    explanation: "El éxito no depende solo del capital, sino de cómo las familias gestionan el miedo al fracaso ante malas cosechas. Útil para ver si personalidades sensibles colapsan antes que las resilientes.",
    icon: <HeartPulse className="w-5 h-5 text-rose-400" />,
    config: {
      agents: 40, money: 1500000, land: 6, personality: 0.5, worldSize: 400,
      water: 10, seeds: 40, tools: 15,
      emotions: true, irrigation: false, training: false, years: 2,
      variance: 0.4, criminality: 5, steptime: 40, trainingSlots: 30,
    }
  },
  {
    id: "poverty",
    name: "Trampa de Pobreza",
    description: "Resiliencia con recursos mínimos y alta fragmentación.",
    explanation: "Con parcelas ínfimas y capital bajo, las familias entran en un ciclo de deuda. Busca observar si surge apoyo mutuo en la red para evitar la quiebra colectiva.",
    icon: <Sprout className="w-5 h-5 text-orange-400" />,
    config: {
      agents: 60, money: 100000, land: 2, personality: 0.5, worldSize: 400,
      water: 0, seeds: 15, tools: 5,
      emotions: true, irrigation: false, training: false, years: 1,
      variance: 0.2, criminality: 10, steptime: 40, trainingSlots: 20,
    }
  },
  {
    id: "tech",
    name: "Revolución Tecno",
    description: "Máxima productividad comunitaria con riego y capacitación.",
    explanation: "Escenario ideal con infraestructura y conocimiento. Las familias deberían alcanzar excedentes de riqueza. Valida el techo de cristal productivo del modelo.",
    icon: <Tractor className="w-5 h-5 text-green-400" />,
    config: {
      agents: 30, money: 2000000, land: 6, personality: 0.5, worldSize: 400,
      water: 25, seeds: 80, tools: 40,
      emotions: true, irrigation: true, training: true, years: 3,
      variance: 0.6, criminality: 2, steptime: 30, trainingSlots: 100,
    }
  },
  {
    id: "latifundio",
    name: "Latifundio/Crisis",
    description: "Desajuste entre tierra extensa y poca mano de obra.",
    explanation: "Demasiada tierra para poca gente. Observa si hay abandono de parcelas por agotamiento o si la capacitación compensa la falta de personal.",
    icon: <Trees className="w-5 h-5 text-indigo-400" />,
    config: {
      agents: 15, money: 1500000, land: 12, personality: 0.5, worldSize: 800,
      water: 15, seeds: 60, tools: 30,
      emotions: true, irrigation: false, training: true, years: 2,
      variance: 0.5, criminality: 8, steptime: 40, trainingSlots: 50,
    }
  },
  {
    id: "chaos",
    name: "Hacinamiento",
    description: "Competencia feroz en espacio reducido con alta densidad.",
    explanation: "Densidad extrema de contactos en matriz 10x10. El mapa de red será un hervidero. Verifica la capacidad del motor y líderes económicos emergentes.",
    icon: <Network className="w-5 h-5 text-purple-400" />,
    config: {
      agents: 100, money: 1500000, land: 2, personality: 0.5, worldSize: 100,
      water: 10, seeds: 50, tools: 20,
      emotions: true, irrigation: true, training: true, years: 1,
      variance: 0.8, criminality: 15, steptime: 50, trainingSlots: 150,
    }
  },
  {
    id: "drought",
    name: "Sequía Extrema",
    description: "Supervivencia con infraestructura hídrica nula.",
    explanation: "Sin riego, las familias dependen totalmente del clima. Veremos si la capacitación ayuda a optimizar el recurso o si la falta de agua es un bloqueador absoluto.",
    icon: <Droplets className="w-5 h-5 text-blue-300" />,
    config: {
      agents: 30, money: 1500000, land: 2, personality: 0.5, worldSize: 400,
      water: 0, seeds: 30, tools: 15,
      emotions: true, irrigation: false, training: true, years: 1,
      variance: 0.4, criminality: 5, steptime: 40, trainingSlots: 15,
    }
  },
  {
    id: "elite",
    name: "Élite Agraria",
    description: "Simular un modelo de grandes terratenientes y alta riqueza.",
    explanation: "Pocos agentes controlan casi todo el mapa extenso. Ideal para observar si una élite mantiene la productividad o si la falta de vecinos afecta el dinamismo.",
    icon: <Landmark className="w-5 h-5 text-emerald-400" />,
    config: {
      agents: 5, money: 5000000, land: 12, personality: 0.5, worldSize: 800,
      water: 40, seeds: 120, tools: 60,
      emotions: true, irrigation: true, training: true, years: 2,
      variance: 0.3,
      criminality: 1,
      steptime: 40,
      trainingSlots: 40
    }
  },
  {
    id: "solidarity",
    name: "Red Solidaria",
    description: "Muchos agentes con pocos recursos individuales.",
    explanation: "Agentes pobres pero numerosos. El objetivo es ver si la alta densidad de interacciones fomenta el intercambio para mitigar la falta de capital.",
    icon: <Users className="w-5 h-5 text-blue-400" />,
    config: {
      agents: 80, money: 200000, land: 2, personality: 0.5, worldSize: 400,
      water: 5, seeds: 20, tools: 8,
      emotions: true, irrigation: false, training: false, years: 1,
      variance: 0.1, criminality: 12, steptime: 40, trainingSlots: 10,
    }
  },
  {
    id: "investment",
    name: "Inversión Semilla",
    description: "Crecimiento acelerado con alto capital inicial.",
    explanation: "Agentes con excedentes desde el día 1. Útil para ver qué tan rápido 'limpian' el mercado o si el exceso de dinero desincentiva el trabajo.",
    icon: <Coins className="w-5 h-5 text-yellow-400" />,
    config: {
      agents: 12, money: 8000000, land: 6, personality: 0.5, worldSize: 400,
      water: 30, seeds: 100, tools: 50,
      emotions: true, irrigation: true, training: true, years: 2,
      variance: 0.7, criminality: 3, steptime: 40, trainingSlots: 100,
    }
  },
];

export default function SimulatorConfigPage() {
  const [agents, setAgents] = useState(20);
  const [money, setMoney] = useState(1500000);
  const [land, setLand] = useState(2);
  const [personality, setPersonality] = useState(0.5);
  const [tools, setTools] = useState(20);
  const [seeds, setSeeds] = useState(50);
  const [water, setWater] = useState(0);
  const [worldSize, setWorldSize] = useState<number>(100);
  const [irrigation, setIrrigation] = useState(true);
  const [emotions, setEmotions] = useState(true);
  const [training, setTraining] = useState(false);
  const [years, setYears] = useState(1);
  const [variance, setVariance] = useState(0.4);
  const [criminality, setCriminality] = useState(3);
  const [steptime, setSteptime] = useState(40);
  const [perturbation, setPerturbation] = useState("");
  const [trainingSlots, setTrainingSlots] = useState(50);
  const [showTourButton, setShowTourButton] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<string | null>("custom");
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const applyTemplate = (template: ExperimentTemplate) => {
    setAgents(template.config.agents);
    setMoney(template.config.money);
    setLand(template.config.land);
    setPersonality(template.config.personality);
    setWorldSize(template.config.worldSize);
    setEmotions(template.config.emotions);
    setIrrigation(template.config.irrigation);
    setTraining(template.config.training);
    setYears(template.config.years);
    if (template.config.variance !== undefined) setVariance(template.config.variance);
    if (template.config.criminality !== undefined) setCriminality(template.config.criminality);
    if (template.config.steptime !== undefined) setSteptime(template.config.steptime);
    if (template.config.perturbation !== undefined) setPerturbation(template.config.perturbation);
    if (template.config.trainingSlots !== undefined) setTrainingSlots(template.config.trainingSlots);
    setWater(template.config.water);
    setSeeds(template.config.seeds);
    setTools(template.config.tools);
    setActiveTemplate(template.id);
  };

  const router = useRouter();

  useEffect(() => {
    // Import dinámico: driver.js accede a window/document y falla en SSR si se importa estáticamente
    import("@/components/drive/tour.js").then(({ shouldShowSettingsTourThisSession, startSettingsTour }) => {
      if (shouldShowSettingsTourThisSession()) {
        const timer = setTimeout(() => {
          startSettingsTour();
        }, 1000);
        return () => clearTimeout(timer);
      }
    });
  }, []);

  const buildArgs = () => {
    const argsObj = {
      mode: "single",
      env: "local",
      agents,
      money,
      land,
      personality,
      tools,
      seeds,
      water,
      irrigation: irrigation ? 1 : 0,
      emotions: emotions ? 1 : 0,
      training: training ? 1 : 0,
      years,
      world: worldSize.toString(),
      variance,
      criminality,
      step: steptime,
      perturbation: perturbation || "none",
      trainingslots: trainingSlots,
    };
    return Object.entries(argsObj)
      .filter(([_, value]) => value !== undefined && value !== null)
      .flatMap(([key, value]) => [
        `-${key}`,
        String(value),
      ]);
  };

  const handleExecuteExe = async (): Promise<boolean> => {
    setIsStarting(true);
    setStartError(null);
    try {
      await fetch("/api/simulator/csv", { method: "DELETE" });
      const res = await fetch("/api/simulator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ args: buildArgs() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Error al iniciar la simulación");
      return true;
    } catch (error: any) {
      const msg = error.message || "Error desconocido al iniciar la simulación";
      console.error("[EthosTerra] Error iniciando simulación:", msg);
      setStartError(msg);
      return false;
    } finally {
      setIsStarting(false);
    }
  };

  const handleStartSimulation = async () => {
    localStorage.setItem("map_size", worldSize.toString());
    const started = await handleExecuteExe();
    if (started) {
      router.push("/pages/simulador");
    }
  };

  // Comando simulado para la terminal
  const buildTerminalCommand = () => {
    const args = buildArgs().join(" ");
    return `>_ java -jar wps-simulator.jar ${args}`;
  };

  const handleStartTour = () => {
    import("@/components/drive/tour.js").then(({ startSettingsTour }) => {
      startSettingsTour(true);
    });
  };

  // Lógica dinámica de iconos
  const getMoneyIcon = () => {
    if (money < 1000000) return <Coins className="w-6 h-6 text-yellow-500" />;
    if (money < 5000000) return <Wallet className="w-6 h-6 text-green-400" />;
    return <Landmark className="w-6 h-6 text-emerald-300" />;
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[#0f1417] text-[#ffffff] py-8 pl-20 lg:pl-24 pr-4 sm:pr-6 lg:pr-8 font-archivo pb-32">
        <div className="max-w-5xl mx-auto space-y-8">
          
          <div className="flex flex-col items-center justify-center text-center space-y-3 mb-6">
            <h1 className="text-2xl md:text-3xl font-extrabold font-clash tracking-tight text-white flex items-center gap-3">
              <Rocket className="w-8 h-8 text-primary" />
              Diseño del Experimento
            </h1>
            <p className="text-gray-400 max-w-xl text-[13px]">
              Configura las condiciones iniciales del ecosistema, la demografía y los recursos. Observa cómo el sistema parametriza el motor BESA en tiempo real.
            </p>
          </div>

          {/* 0. Plantillas (Quick Start) */}
          <section className="bg-[#171c1f] p-4 rounded-2xl border border-primary/20 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 bg-primary/10 rounded-bl-xl border-b border-l border-primary/20">
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Configuración Rápida</span>
            </div>
            <h2 className="text-lg font-semibold mb-3 text-white flex items-center gap-2">
              <Rocket className="w-4 h-4 text-primary" /> Escenarios Preconfigurados
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {EXPERIMENT_TEMPLATES.map((tpl) => (
                <Tooltip key={tpl.id}>
                  <TooltipTrigger asChild>
                    <motion.div
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => applyTemplate(tpl)}
                      className={cn(
                        "cursor-pointer p-3 rounded-xl border transition-all flex flex-col items-center text-center gap-2",
                        activeTemplate === tpl.id
                          ? "bg-primary/10 border-primary shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                          : "bg-black/30 border-gray-800 hover:border-gray-500 opacity-80 hover:opacity-100"
                      )}
                    >
                      <div className={cn("p-2 rounded-lg", activeTemplate === tpl.id ? "bg-primary/20" : "bg-gray-900")}>
                        {tpl.icon}
                      </div>
                      <span className="text-[10px] font-bold text-white uppercase truncate w-full">{tpl.name}</span>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#171c1f] border-primary/30 text-white max-w-xs p-3">
                    <p className="font-bold text-xs mb-1 text-primary">{tpl.name}</p>
                    <p className="text-[10px] leading-relaxed text-gray-300">{tpl.description}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>

            {/* Explicación Dinámica */}
            <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20 shadow-inner h-[100px] flex items-center overflow-hidden">
              {activeTemplate ? (
                <div className="flex gap-3 items-start">
                  <div className="p-2 bg-primary/20 rounded-lg shrink-0">
                    <InfoIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-primary uppercase mb-1 tracking-wider">Objetivo del Escenario</p>
                    <p className="text-sm text-gray-300 leading-relaxed italic line-clamp-2">
                       "{EXPERIMENT_TEMPLATES.find(t => t.id === activeTemplate)?.explanation}"
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 items-start opacity-40">
                  <div className="p-2 bg-gray-800 rounded-lg shrink-0">
                    <HelpCircle className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1 tracking-wider">Selecciona un Escenario</p>
                    <p className="text-sm text-gray-500 leading-relaxed italic">
                      Selecciona una de las plantillas superiores para ver su objetivo y configuración.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Ecosistema y Parcelas (Tarjetas Visuales) */}
            <section className="bg-[#171c1f] p-4 rounded-2xl border border-[#272d34] shadow-lg">
              <h2 className="text-lg font-semibold mb-3 text-white flex items-center gap-2">
                <Trees className="w-4 h-4 text-green-400" /> Tierras (Parcelas)
              </h2>
              <div className="grid grid-cols-3 gap-2">
                <VisualCard 
                  title="Subsist. (2)" 
                  description="Riesgo alto."
                  icon={<Sprout className="w-5 h-5" />}
                  isSelected={land === 2}
                  onClick={() => setLand(2)}
                  colorClass="border-orange-500/50"
                />
                <VisualCard 
                  title="Óptimo (6)" 
                  description="Equilibrado."
                  icon={<Trees className="w-5 h-5" />}
                  isSelected={land === 6}
                  onClick={() => setLand(6)}
                  colorClass="border-green-500/60"
                />
                <VisualCard 
                  title="Latifund. (12)" 
                  description="Demanda lab."
                  icon={<Tractor className="w-5 h-5" />}
                  isSelected={land === 12}
                  onClick={() => setLand(12)}
                  colorClass="border-red-500/50"
                />
              </div>
            </section>

            {/* 1.5 Dimensión del Mapa */}
            <section className="bg-[#171c1f] p-4 rounded-2xl border border-[#272d34] shadow-lg">
              <h2 className="text-lg font-semibold mb-3 text-white flex items-center gap-2">
                <Network className="w-4 h-4 text-indigo-400" /> Dimensión Terreno
              </h2>
              <div className="grid grid-cols-3 gap-2">
                <VisualCard 
                  title="Pequeño (100)" 
                  description="Matriz 10x10"
                  icon={<Sprout className="w-5 h-5" />}
                  isSelected={worldSize === 100}
                  onClick={() => setWorldSize(100)}
                  colorClass="border-indigo-500/50"
                />
                <VisualCard 
                  title="Estándar (400)" 
                  description="Matriz 20x20"
                  icon={<Trees className="w-5 h-5" />}
                  isSelected={worldSize === 400}
                  onClick={() => setWorldSize(400)}
                  colorClass="border-blue-500/60"
                />
                <VisualCard 
                  title="Extenso (800)" 
                  description="Matriz 40x20"
                  icon={<Network className="w-5 h-5" />}
                  isSelected={worldSize === 800}
                  onClick={() => setWorldSize(800)}
                  colorClass="border-purple-500/50"
                />
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 2. Demografía y Capital */}
            <section className="bg-[#171c1f] p-4 rounded-2xl border border-[#272d34] shadow-lg space-y-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" /> Sociedad y Recursos
              </h2>
              
              <div className="grid grid-cols-1 gap-4">
                {/* Agentes Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-gray-300 flex items-center gap-2 text-xs">
                      Familias (Agentes)
                    </Label>
                    <span className="font-mono bg-black px-2 py-0.5 rounded text-primary text-xs">{agents}</span>
                  </div>
                  <Slider value={[agents]} onValueChange={(v) => setAgents(v[0])} min={1} max={500} step={1} />
                </div>

                {/* Dinero Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-gray-300 flex items-center gap-2 text-xs">
                      Capital Inicial (COP)
                    </Label>
                    <span className="font-mono bg-black px-2 py-0.5 rounded text-green-400 text-xs">
                      ${money.toLocaleString("es-CO")}
                    </span>
                  </div>
                  <Slider value={[money]} onValueChange={(v) => setMoney(v[0])} min={100000} max={10000000} step={50000} />
                </div>

                {/* Cupos Entrenamiento Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-gray-300 flex items-center gap-2 text-xs">
                      Cupos Entrenamiento (Anual)
                    </Label>
                    <span className="font-mono bg-black px-2 py-0.5 rounded text-yellow-400 text-xs">
                      {trainingSlots}
                    </span>
                  </div>
                  <Slider value={[trainingSlots]} onValueChange={(v) => setTrainingSlots(v[0])} min={0} max={500} step={5} />
                </div>

                {/* Agua Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-gray-300 flex items-center gap-2 text-xs">
                      <Droplets className="w-3 h-3 text-blue-400" /> Agua Inicial
                    </Label>
                    <span className="font-mono bg-black px-2 py-0.5 rounded text-blue-400 text-xs">{water}</span>
                  </div>
                  <Slider value={[water]} onValueChange={(v) => setWater(v[0])} min={0} max={100} step={5} />
                </div>

                {/* Semillas Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-gray-300 flex items-center gap-2 text-xs">
                      <Wheat className="w-3 h-3 text-amber-400" /> Semillas Iniciales
                    </Label>
                    <span className="font-mono bg-black px-2 py-0.5 rounded text-amber-400 text-xs">{seeds}</span>
                  </div>
                  <Slider value={[seeds]} onValueChange={(v) => setSeeds(v[0])} min={0} max={200} step={5} />
                </div>

                {/* Herramientas Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-gray-300 flex items-center gap-2 text-xs">
                      <Wrench className="w-3 h-3 text-orange-400" /> Herramientas Iniciales
                    </Label>
                    <span className="font-mono bg-black px-2 py-0.5 rounded text-orange-400 text-xs">{tools}</span>
                  </div>
                  <Slider value={[tools]} onValueChange={(v) => setTools(v[0])} min={0} max={100} step={5} />
                </div>
              </div>

              {/* Personalidad Visual Picker */}
              <div className="pt-2 border-t border-[#272d34]">
                <div className="grid grid-cols-2 gap-2">
                  <div 
                    onClick={() => setPersonality(0)}
                    className={cn("cursor-pointer p-2 rounded-lg border text-center transition-colors flex items-center justify-center gap-2", personality === 0 ? "bg-purple-900/20 border-purple-500 text-white" : "border-gray-800 text-gray-500 hover:border-gray-600")}
                  >
                    <Brain className="w-4 h-4" />
                    <span className="text-[10px] font-semibold uppercase">Homogéneo</span>
                  </div>
                  <div 
                    onClick={() => setPersonality(0.5)}
                    className={cn("cursor-pointer p-2 rounded-lg border text-center transition-colors flex items-center justify-center gap-2", personality === 0.5 ? "bg-purple-900/20 border-purple-500 text-white" : "border-gray-800 text-gray-500 hover:border-gray-600")}
                  >
                    <Network className="w-4 h-4" />
                    <span className="text-[10px] font-semibold uppercase">Diverso</span>
                  </div>
                </div>
              </div>
            </section>

            {/* 3. Políticas y Complementos (Switches) */}
            <section className="bg-[#171c1f] p-4 rounded-2xl border border-[#272d34] shadow-lg flex flex-col justify-between">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-2">
                  <HeartPulse className="w-4 h-4 text-rose-400" /> Reglas
                </h2>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-black/30 border border-gray-800/50">
                    <div className="flex items-center gap-2">
                      <HeartPulse className={cn("w-4 h-4", emotions ? 'text-rose-400' : 'text-gray-500')} />
                      <span className="text-xs text-white font-medium">Módulo eBDI</span>
                    </div>
                    <Switch checked={emotions} onCheckedChange={setEmotions} />
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-black/30 border border-gray-800/50">
                    <div className="flex items-center gap-2">
                      <Droplets className={cn("w-4 h-4", irrigation ? 'text-blue-400' : 'text-gray-500')} />
                      <span className="text-xs text-white font-medium">Riego</span>
                    </div>
                    <Switch checked={irrigation} onCheckedChange={setIrrigation} />
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-black/30 border border-gray-800/50">
                    <div className="flex items-center gap-2">
                      <GraduationCap className={cn("w-4 h-4", training ? 'text-yellow-400' : 'text-gray-500')} />
                      <span className="text-xs text-white font-medium">Capacitación</span>
                    </div>
                    <Switch checked={training} onCheckedChange={setTraining} />
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-800/50">
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-gray-400 text-[10px] uppercase">Años Simulación</Label>
                    <span className="text-xs font-mono text-primary font-bold">{years}a</span>
                  </div>
                  <Slider value={[years]} onValueChange={(v) => setYears(v[0])} min={1} max={10} step={1} />
                </div>
              </div>
            </section>

            {/* 3.5 Parámetros Avanzados (Acordeón) */}
            <section className="bg-[#171c1f] rounded-2xl border border-primary/10 shadow-lg overflow-hidden">
              <button 
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                className="w-full p-4 flex items-center justify-between hover:bg-primary/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-primary" />
                  <h2 className="text-lg font-semibold text-white">Configuración Avanzada</h2>
                </div>
                {isAdvancedOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </button>
              
              {isAdvancedOpen && (
                <div className="p-4 pt-0 space-y-4 border-t border-primary/5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Variance Slider */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label className="text-gray-400 text-[10px] uppercase flex items-center gap-1">
                          Heterogeneidad <InfoIcon className="w-3 h-3 opacity-50" />
                        </Label>
                        <span className="font-mono text-primary text-xs">{variance.toFixed(1)}</span>
                      </div>
                      <Slider value={[variance]} onValueChange={(v) => setVariance(v[0])} min={0.1} max={1.0} step={0.1} />
                    </div>

                    {/* Criminality Slider */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label className="text-gray-400 text-[10px] uppercase flex items-center gap-1">
                          Inseguridad <InfoIcon className="w-3 h-3 opacity-50" />
                        </Label>
                        <span className="font-mono text-rose-400 text-xs">{criminality}%</span>
                      </div>
                      <Slider value={[criminality]} onValueChange={(v) => setCriminality(v[0])} min={0} max={50} step={1} />
                    </div>

                    {/* Steptime Slider */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label className="text-gray-400 text-[10px] uppercase flex items-center gap-1">
                          Velocidad Ciclo <InfoIcon className="w-3 h-3 opacity-50" />
                        </Label>
                        <span className="font-mono text-blue-400 text-xs">{steptime}ms</span>
                      </div>
                      <Slider value={[steptime]} onValueChange={(v) => setSteptime(v[0])} min={10} max={200} step={10} />
                    </div>

                    {/* Perturbation Input */}
                    <div className="space-y-2">
                      <Label className="text-gray-400 text-[10px] uppercase">Tag de Perturbación</Label>
                      <Input 
                        value={perturbation} 
                        onChange={(e) => setPerturbation(e.target.value)}
                        placeholder="ej: sequia_2024"
                        className="bg-black/50 border-gray-800 text-xs h-8 focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Mensaje de error si la simulación no arrancó */}
          {startError && (
            <div className="mt-4 p-3 rounded-lg bg-red-900/50 border border-red-500 text-red-200 text-sm">
              <strong>Error al iniciar la simulación:</strong> {startError}
            </div>
          )}

          {/* 4. Terminal Inferior y Botón de Inicio Fijo */}
          <div className="fixed bottom-0 left-0 right-0 bg-[#0f1417]/90 backdrop-blur-md border-t border-[#272d34] p-4 lg:pl-[16rem]">
            <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between">
              
              {/* Consola */}
              <div className="flex-1 w-full bg-black rounded-lg p-3 border border-gray-800 flex items-start gap-2">
                <Terminal className="w-5 h-5 text-gray-500 shrink-0 mt-1" />
                <code className="text-green-400 text-xs opacity-80 select-all break-all leading-relaxed">
                  {buildTerminalCommand()}
                </code>
              </div>

              <motion.button
                className="shrink-0 bg-primary text-white py-3 px-8 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]"
                whileHover={isStarting ? {} : { scale: 1.05 }}
                whileTap={isStarting ? {} : { scale: 0.95 }}
                disabled={isStarting}
                onClick={handleStartSimulation}
              >
                {isStarting ? <span className="animate-pulse">🚀 Inicializando JVM...</span> : <><Rocket className="w-5 h-5" /> Iniciar Experimento</>}
              </motion.button>
            </div>
          </div>

          {/* Botón de ayuda flotante */}
          <div className="fixed top-24 right-4 flex flex-col gap-2 z-50">
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
                Ver Tour
              </Button>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
