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
import { InfoIcon, HelpCircle } from "lucide-react";

interface ConfigOptionProps {
  id?: string;
  title: string;
  description: string;
  tooltipInfo: string;
  children: React.ReactNode;
}

const ConfigOption = ({
  id,
  title,
  description,
  tooltipInfo,
  children,
}: ConfigOptionProps) => (
  <motion.div
    id={id}
    className="bg-[#181c20] text-[#ffffff] p-6 rounded-lg border border-[#272d34]"
    whileHover={{ scale: 1.02 }}
    transition={{ type: "spring", stiffness: 300 }}
  >
    <div className="flex items-center gap-2 mb-2">
      <h3 className="text-lg font-semibold">{title}</h3>
      <Tooltip>
        <TooltipTrigger asChild>
          <InfoIcon className="h-4 w-4 text-[hsl(217.9,10.6%,64.9%)] cursor-help" />
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{tooltipInfo}</p>
        </TooltipContent>
      </Tooltip>
    </div>
    <p className="text-sm text-[hsl(217.9,10.6%,64.9%)] mb-4">{description}</p>
    {children}
  </motion.div>
);

export default function SimulatorConfigPage() {
  const [agents, setAgents] = useState(2);
  const [money, setMoney] = useState(75000);
  const [land, setLand] = useState(2);
  const [personality, setPersonality] = useState(0);
  const [tools, setTools] = useState(20);
  const [seeds, setSeeds] = useState(50);
  const [water, setWater] = useState(0);
  const [irrigation, setIrrigation] = useState(0);
  const [emotions, setEmotions] = useState(0);
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
      irrigation,
      emotions,
      years,
      world: 400,
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
      const appPath = await window.electronAPI.getAppPath();
      // Usar template literal en lugar de path.join (evita problemas del polyfill en browser)
      const csvPath = `${appPath}/src/wps/logs/wpsSimulator.csv`;
      if (await window.electronAPI.fileExists(csvPath)) {
        await window.electronAPI.deleteFile(csvPath);
      }
      const args = buildArgs();
      const exePath = `${appPath}/src/wps/wpsSimulator-1.0.exe`;
      await window.electronAPI.executeExe(exePath, args);
      return true;
    } catch (error: any) {
      if (!error.message?.includes("Unrecognized option")) {
        const msg = error.message || "Error desconocido al iniciar la simulación";
        console.error("[WPS] Error iniciando simulación:", msg);
        setStartError(msg);
      } else {
        // "Unrecognized option" es esperado en Linux — Java arrancó correctamente
        return true;
      }
      return false;
    } finally {
      setIsStarting(false);
    }
  };

  const handleStartSimulation = async () => {
    const started = await handleExecuteExe();
    if (started) {
      router.push("/pages/simulador");
    }
  };

  const handleStartTour = () => {
    import("@/components/drive/tour.js").then(({ startSettingsTour }) => {
      startSettingsTour(true);
    });
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[#111418] text-[#ffffff] py-12 px-4 sm:px-6 lg:px-8 font-archivo">
        <div className="max-w-6xl mx-auto">
          <motion.h1
            className="text-4xl font-extrabold text-center mb-12 p-4 rounded-lg font-clash"
            style={{ backgroundColor: "#004d66" }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            WellProdSimulator Configuration
          </motion.h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ConfigOption
              id="config-agents"
              title="Agents"
              description="Number of peasant agents participating in the simulation."
              tooltipInfo="Agents represent individual farmers..."
            >
              <Slider
                value={[agents]}
                onValueChange={(v) => setAgents(v[0])}
                min={1}
                max={1000}
                step={1}
                className="mt-2"
              />
              <p className="text-sm mt-2">Current Agents: {agents}</p>
            </ConfigOption>

            <ConfigOption
              id="config-money"
              title="Money"
              description="Initial amount of money each agent starts with."
              tooltipInfo="Starting capital for each agent..."
            >
              <Input
                type="number"
                placeholder={String(money)}
                onChange={(e) => setMoney(Number(e.target.value))}
                className="mt-2"
              />
            </ConfigOption>

            <ConfigOption
              id="config-land"
              title="Land"
              description="Number of farmland plots available."
              tooltipInfo="Total land plots in the simulation..."
            >
              <Slider
                value={[land]}
                onValueChange={(v) => {
                  const allowed = [2, 6, 12];
                  const nearest = allowed.reduce((p, c) =>
                    Math.abs(c - v[0]) < Math.abs(p - v[0]) ? c : p,
                  );
                  setLand(nearest);
                }}
                min={2}
                max={12}
                step={4}
                className="mt-2"
              />
              <p className="text-sm mt-2">Current Lands: {land}</p>
            </ConfigOption>

            <ConfigOption
              id="config-personality"
              title="Personality"
              description="Index representing each agent's personality traits."
              tooltipInfo="Affects how agents make decisions..."
            >
              <Input
                type="number"
                placeholder={String(personality)}
                onChange={(e) => setPersonality(Number(e.target.value))}
                className="mt-2"
              />
            </ConfigOption>

            <ConfigOption
              id="config-tools"
              title="Tools"
              description="Amount of farming tools available."
              tooltipInfo="Tools increase farming efficiency..."
            >
              <Input
                type="number"
                placeholder={String(tools)}
                onChange={(e) => setTools(Number(e.target.value))}
                className="mt-2"
              />
            </ConfigOption>

            <ConfigOption
              id="config-seeds"
              title="Seeds"
              description="Number of seeds available for planting."
              tooltipInfo="Seeds are essential for crop production..."
            >
              <Input
                type="number"
                placeholder={String(seeds)}
                onChange={(e) => setSeeds(Number(e.target.value))}
                className="mt-2"
              />
            </ConfigOption>

            <ConfigOption
              id="config-water"
              title="Water"
              description="Initial water resources available."
              tooltipInfo="Water is crucial for crop growth..."
            >
              <Input
                type="number"
                placeholder={String(water)}
                onChange={(e) => setWater(Number(e.target.value))}
                className="mt-2"
              />
            </ConfigOption>

            <ConfigOption
              id="config-irrigation"
              title="Irrigation"
              description="Irrigation system level (0 = none, higher = better)."
              tooltipInfo="Better irrigation systems improve yields..."
            >
              <Input
                type="number"
                placeholder={String(irrigation)}
                onChange={(e) => setIrrigation(Number(e.target.value))}
                className="mt-2"
              />
            </ConfigOption>

            <ConfigOption
              id="config-emotions"
              title="Emotions"
              description="Emotional complexity level for agents."
              tooltipInfo="Determines how emotions affect decisions..."
            >
              <Input
                type="number"
                placeholder={String(emotions)}
                onChange={(e) => setEmotions(Number(e.target.value))}
                className="mt-2"
              />
            </ConfigOption>

            <ConfigOption
              id="config-years"
              title="Years"
              description="Number of years the simulation should run."
              tooltipInfo="Simulation duration..."
            >
              <Slider
                value={[years]}
                onValueChange={(v) => setYears(v[0])}
                min={1}
                max={100}
                step={1}
                className="mt-2"
              />
              <p className="text-sm mt-2">Current Years: {years}</p>
            </ConfigOption>
          </div>

          {/* Mensaje de error si la simulación no arrancó */}
          {startError && (
            <div className="mt-4 p-3 rounded-lg bg-red-900/50 border border-red-500 text-red-200 text-sm">
              <strong>Error al iniciar la simulación:</strong> {startError}
            </div>
          )}

          <motion.button
            className="mt-4 w-full bg-[hsl(221.2,83.2%,53.3%)] text-white py-3 px-6 rounded-lg font-semibold hover:bg-[hsl(221.2,83.2%,53.3%)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={isStarting ? {} : { scale: 1.02 }}
            whileTap={isStarting ? {} : { scale: 0.98 }}
            disabled={isStarting}
            onClick={handleStartSimulation}
          >
            {isStarting ? "Starting simulation…" : "Save Configuration"}
          </motion.button>

          {/* Botón de ayuda flotante */}
          <div className="fixed bottom-4 right-4 flex flex-col gap-2">
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
