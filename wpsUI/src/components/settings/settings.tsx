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
  HeartPulse
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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
      "cursor-pointer p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center text-center gap-3",
      isSelected 
        ? `bg-[#1a232b] ${colorClass} shadow-[0_0_15px_rgba(59,130,246,0.15)]` 
        : "bg-[#14181c] border-[#272d34] hover:border-gray-500 opacity-70 hover:opacity-100"
    )}
  >
    <div className={cn("p-3 rounded-full", isSelected ? "bg-primary/20 text-primary" : "bg-gray-800 text-gray-400")}>
      {icon}
    </div>
    <div>
      <h4 className="font-bold text-sm text-white mb-1">{title}</h4>
      <p className="text-xs text-gray-400 leading-tight">{description}</p>
    </div>
  </motion.div>
);

export default function SimulatorConfigPage() {
  const [agents, setAgents] = useState(20);
  const [money, setMoney] = useState(1500000);
  const [land, setLand] = useState(2);
  const [personality, setPersonality] = useState(0.5);
  const [tools, setTools] = useState(20);
  const [seeds, setSeeds] = useState(50);
  const [water, setWater] = useState(0);
  const [worldSize, setWorldSize] = useState<number>(400);
  const [irrigation, setIrrigation] = useState(true);
  const [emotions, setEmotions] = useState(true);
  const [training, setTraining] = useState(false);
  const [years, setYears] = useState(2);
  const [showTourButton, setShowTourButton] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

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
    };
    return Object.entries(argsObj).flatMap(([key, value]) => [
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
          
          <div className="flex flex-col items-center justify-center text-center space-y-3 mb-8">
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center justify-center p-3 bg-primary/10 text-primary rounded-full mb-2"
            >
              <Rocket className="w-8 h-8" />
            </motion.div>
            <h1 className="text-4xl font-extrabold font-clash tracking-tight text-white">
              Diseño del Experimento
            </h1>
            <p className="text-gray-400 max-w-xl text-sm">
              Configura las condiciones iniciales del ecosistema, la demografía y los recursos. Observa cómo el sistema parametriza el motor BESA en tiempo real.
            </p>
          </div>

          {/* 1. Ecosistema y Parcelas (Tarjetas Visuales) */}
          <section className="bg-[#171c1f] p-6 rounded-2xl border border-[#272d34] shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
              <Trees className="w-5 h-5 text-green-400" /> Entorno Agrícola (Parcelas por familia)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <VisualCard 
                title="Subsistencia (2)" 
                description="Baja carga de trabajo, pero alto riesgo de quiebra ante crisis."
                icon={<Sprout className="w-6 h-6" />}
                isSelected={land === 2}
                onClick={() => setLand(2)}
                colorClass="border-orange-500/50"
              />
              <VisualCard 
                title="Óptimo (6)" 
                description="Equilibrio recomendado entre producción y capacidad de gestión."
                icon={<Trees className="w-6 h-6" />}
                isSelected={land === 6}
                onClick={() => setLand(6)}
                colorClass="border-green-500/60"
              />
              <VisualCard 
                title="Latifundio (12)" 
                description="Alta demanda laboral, riesgo de abandono de parcelas."
                icon={<Tractor className="w-6 h-6" />}
                isSelected={land === 12}
                onClick={() => setLand(12)}
                colorClass="border-red-500/50"
              />
            </div>
          </section>

          {/* 1.5 Dimensión del Mapa */}
          <section className="bg-[#171c1f] p-6 rounded-2xl border border-[#272d34] shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
              <Network className="w-5 h-5 text-indigo-400" /> Extensión del Terreno Simulado
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <VisualCard 
                title="Pequeño (100)" 
                description="Iteraciones rápidas, baja complejidad de red. Matriz 10x10."
                icon={<Sprout className="w-6 h-6" />}
                isSelected={worldSize === 100}
                onClick={() => setWorldSize(100)}
                colorClass="border-indigo-500/50"
              />
              <VisualCard 
                title="Estándar (400)" 
                description="Balance óptimo entre carga visual y comportamiento social. Matriz 20x20."
                icon={<Trees className="w-6 h-6" />}
                isSelected={worldSize === 400}
                onClick={() => setWorldSize(400)}
                colorClass="border-blue-500/60"
              />
              <VisualCard 
                title="Extenso (800)" 
                description="Alta ocupación. Simula redes de competencia complejas. Matriz 40x20."
                icon={<Network className="w-6 h-6" />}
                isSelected={worldSize === 800}
                onClick={() => setWorldSize(800)}
                colorClass="border-purple-500/50"
              />
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 2. Demografía y Capital */}
            <section className="bg-[#171c1f] p-6 rounded-2xl border border-[#272d34] shadow-lg space-y-8">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" /> Sociedad y Recursos
              </h2>
              
              {/* Agentes Slider */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-gray-300 flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" /> Familias (Agentes)
                  </Label>
                  <span className="font-mono bg-black px-2 py-1 rounded text-primary text-sm">{agents}</span>
                </div>
                <Slider value={[agents]} onValueChange={(v) => setAgents(v[0])} min={1} max={500} step={1} />
              </div>

              {/* Dinero Slider */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-gray-300 flex items-center gap-2">
                    {getMoneyIcon()} Capital Inicial (COP)
                  </Label>
                  <span className="font-mono bg-black px-2 py-1 rounded text-green-400 text-sm">
                    ${money.toLocaleString("es-CO")}
                  </span>
                </div>
                <Slider value={[money]} onValueChange={(v) => setMoney(v[0])} min={100000} max={10000000} step={50000} />
              </div>

              {/* Personalidad Visual Picker */}
              <div className="space-y-4 pt-4 border-t border-[#272d34]">
                <Label className="text-gray-300 flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4 text-purple-400" /> Perfil de Personalidad
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    onClick={() => setPersonality(0)}
                    className={cn("cursor-pointer p-3 rounded-lg border text-center transition-colors", personality === 0 ? "bg-purple-900/20 border-purple-500 text-white" : "border-gray-800 text-gray-500 hover:border-gray-600")}
                  >
                    <Brain className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-xs font-semibold">Homogéneo (0.0)</span>
                  </div>
                  <div 
                    onClick={() => setPersonality(0.5)}
                    className={cn("cursor-pointer p-3 rounded-lg border text-center transition-colors", personality === 0.5 ? "bg-purple-900/20 border-purple-500 text-white" : "border-gray-800 text-gray-500 hover:border-gray-600")}
                  >
                    <Network className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-xs font-semibold">Diverso (0.5)</span>
                  </div>
                </div>
              </div>
            </section>

            {/* 3. Políticas y Complementos (Switches) */}
            <section className="bg-[#171c1f] p-6 rounded-2xl border border-[#272d34] shadow-lg flex flex-col justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-6">
                  <HeartPulse className="w-5 h-5 text-rose-400" /> Reglas del Mundo
                </h2>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-gray-800/50 hover:border-gray-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${emotions ? 'bg-rose-500/20 text-rose-400' : 'bg-gray-800 text-gray-500'}`}><HeartPulse className="w-5 h-5" /></div>
                      <div>
                        <p className="font-semibold text-sm text-white">Módulo Emocional (eBDI)</p>
                        <p className="text-xs text-gray-500">Agentes sienten miedo, alegría y estrés.</p>
                      </div>
                    </div>
                    <Switch checked={emotions} onCheckedChange={setEmotions} />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-gray-800/50 hover:border-gray-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${irrigation ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-800 text-gray-500'}`}><Droplets className="w-5 h-5" /></div>
                      <div>
                        <p className="font-semibold text-sm text-white">Infraestructura de Riego</p>
                        <p className="text-xs text-gray-500">Permite mitigar impactos de sequías.</p>
                      </div>
                    </div>
                    <Switch checked={irrigation} onCheckedChange={setIrrigation} />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-gray-800/50 hover:border-gray-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${training ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-800 text-gray-500'}`}><GraduationCap className="w-5 h-5" /></div>
                      <div>
                        <p className="font-semibold text-sm text-white">Programas de Capacitación</p>
                        <p className="text-xs text-gray-500">Aumenta eficiencia de siembra a largo plazo.</p>
                      </div>
                    </div>
                    <Switch checked={training} onCheckedChange={setTraining} />
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-2">
                <Label className="text-gray-400 text-xs uppercase tracking-wider">Años de Simulación ({years})</Label>
                <Slider value={[years]} onValueChange={(v) => setYears(v[0])} min={1} max={10} step={1} />
              </div>
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
              <div className="flex-1 w-full bg-black rounded-lg p-3 border border-gray-800 flex items-start gap-2 overflow-x-auto">
                <Terminal className="w-5 h-5 text-gray-500 shrink-0" />
                <code className="text-green-400 text-xs whitespace-nowrap opacity-80 select-all">
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
