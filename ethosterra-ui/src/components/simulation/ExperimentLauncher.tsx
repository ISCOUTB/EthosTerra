"use client";

import { useState, useEffect, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

interface Treatment {
  id: string;
  money: number;
  land: number;
  emotions: boolean;
  cultivado?: number;
  salud?: number;
  status?: string;
}

interface ExperimentState {
  treatments: Treatment[];
  total: number;
  completed: number;
  current: string | null;
  results: Treatment[];
  running: boolean;
  agents: number;
  years: number;
  started_at?: string;
  finished_at?: string;
}

const PRESETS = [
  {
    label: "Experimento 4 (Coherencia)",
    agents: 5,
    years: 5,
    money_levels: [750000, 1500000, 3000000],
    land_levels: [2, 6, 12],
    emotion_levels: [1, 0],
    description: "18 tratamientos, 5 años, world.400",
  },
  {
    label: "Rápido (3×2×2)",
    agents: 3,
    years: 1,
    money_levels: [750000, 1500000, 3000000],
    land_levels: [2, 6],
    emotion_levels: [1, 0],
    description: "12 tratamientos rápidos (1 año)",
  },
  {
    label: "Mini Test",
    agents: 2,
    years: 1,
    money_levels: [750000],
    land_levels: [2],
    emotion_levels: [1],
    description: "1 tratamiento para verificar",
  },
];

function fmtCOP(n: number) {
  return "$" + n.toLocaleString("es-CO", { maximumFractionDigits: 0 });
}

export function ExperimentLauncher() {
  const [experiment, setExperiment] = useState<ExperimentState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPreset, setSelectedPreset] = useState(PRESETS[0]);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/experiment/status`);
      const data = await res.json();
      setExperiment(data);
    } catch {
      // API not available
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleStart = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/experiment/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agents: selectedPreset.agents,
          years: selectedPreset.years,
          money_levels: selectedPreset.money_levels,
          land_levels: selectedPreset.land_levels,
          emotion_levels: selectedPreset.emotion_levels,
        }),
      });
      const data = await res.json();
      if (!data.started) {
        setError("No se pudo iniciar el experimento. ¿Hay otro corriendo?");
      }
    } catch {
      setError(`No se puede conectar con ${API_URL}`);
    }
    setLoading(false);
  };

  const handleStop = async () => {
    try {
      await fetch(`${API_URL}/experiment/stop`, { method: "POST" });
    } catch {}
  };

  const isRunning = experiment?.running;
  const progress = experiment ? (experiment.completed / experiment.total) * 100 : 0;

  return (
    <div className="bg-[#1A2327] border border-white/5 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-mono text-[10px] text-[#6B7C7A] tracking-[0.25em] uppercase">
            Experimentos
          </h2>
          <p className="text-xs text-[#6B7C7A]/50 mt-1 max-w-md">
            Ejecuta experimentos por lotes desde el contenedor. Los tratamientos se ejecutan secuencialmente.
          </p>
        </div>
        {isRunning && (
          <button onClick={handleStop} className="btn-stop text-[10px]">
            Detener
          </button>
        )}
      </div>

      {!isRunning && experiment?.total === 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => setSelectedPreset(p)}
                className={`p-3 border text-left transition-colors ${
                  selectedPreset.label === p.label
                    ? "border-[#E6B84C] bg-[#E6B84C]/5"
                    : "border-white/5 hover:border-white/10 bg-transparent"
                }`}
              >
                <div className="text-xs font-medium text-[#F4F1DE]">{p.label}</div>
                <div className="text-[10px] text-[#6B7C7A] mt-1">{p.description}</div>
                <div className="text-[9px] text-[#6B7C7A]/50 mt-2 font-mono">
                  {p.agents} agentes · {p.years} años · {p.money_levels.length * p.land_levels.length * p.emotion_levels.length} tratamientos
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={handleStart}
            disabled={loading}
            className="btn-start w-full"
          >
            {loading ? "Iniciando..." : "Iniciar experimento"}
          </button>

          {error && (
            <div className="p-3 bg-[#D95D39]/10 border border-[#D95D39]/20 text-[#E07A5F] font-mono text-[11px]">
              {error}
            </div>
          )}
        </>
      )}

      {(isRunning || (experiment && experiment.total > 0)) && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-[10px] text-[#6B7C7A] font-mono">
            <span>
              {experiment?.completed}/{experiment?.total} completados
            </span>
            {experiment?.current && (
              <span className="text-[#E6B84C]">▶ {experiment.current}</span>
            )}
            <span>
              {experiment?.agents} agentes · {experiment?.years} años
            </span>
            <span className="text-[#6B7C7A]/50">
              {experiment?.started_at}
            </span>
          </div>

          <div className="w-full bg-[#0A1217] h-1">
            <div
              className="h-1 bg-[#E6B84C] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {experiment && experiment.results.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] font-mono">
                <thead>
                  <tr className="text-[#6B7C7A] text-left">
                    <th className="p-1.5">Trat</th>
                    <th className="p-1.5">Dinero</th>
                    <th className="p-1.5">Tierra</th>
                    <th className="p-1.5">Emo</th>
                    <th className="p-1.5 text-right">Cultivado</th>
                    <th className="p-1.5 text-right">Salud</th>
                    <th className="p-1.5">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {experiment.results.map((r) => (
                    <tr
                      key={r.id}
                      className={`border-t border-white/5 ${
                        r.status === "done" ? "text-[#F4F1DE]/80" : "text-[#D95D39]"
                      }`}
                    >
                      <td className="p-1.5 text-[#6B7C7A]">{r.id}</td>
                      <td className="p-1.5">{fmtCOP(r.money)}</td>
                      <td className="p-1.5">{r.land}</td>
                      <td className="p-1.5">{r.emotions ? "Sí" : "No"}</td>
                      <td className="p-1.5 text-right">
                        {r.cultivado !== undefined ? r.cultivado.toFixed(0) : "-"}
                      </td>
                      <td className="p-1.5 text-right">
                        {r.salud !== undefined ? r.salud.toFixed(1) + "%" : "-"}
                      </td>
                      <td className="p-1.5">
                        {r.status === "done" ? (
                          <span className="text-[#2D6A4F]">✓</span>
                        ) : r.status === "timeout" ? (
                          <span className="text-[#E6B84C]">⏱</span>
                        ) : (
                          <span className="text-[#D95D39]">⚠</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {experiment?.finished_at && (
            <div className="text-[9px] text-[#6B7C7A]/50 font-mono text-center">
              Finalizado: {experiment.finished_at}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
