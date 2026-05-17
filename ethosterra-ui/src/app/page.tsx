'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useWebSocket } from '@/hooks/useWebSocket';
import { WorldMap } from '@/components/simulation/WorldMap';
import { ExperimentLauncher } from '@/components/simulation/ExperimentLauncher';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/wpsViewer';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

/* ─── PRESETS ─── */
const PRESETS = [
  { label: 'Custom', agents: 5, years: 1, money: 1500000, land: 6, tools: 10, seeds: 10, water: 10 },
  { label: 'Estrés', agents: 40, years: 1, money: 1500000, land: 2, tools: 5, seeds: 5, water: 2 },
  { label: 'Pobreza', agents: 60, years: 2, money: 100000, land: 1, tools: 2, seeds: 2, water: 0 },
  { label: 'Tecnología', agents: 30, years: 2, money: 2000000, land: 6, tools: 20, seeds: 20, water: 30 },
  { label: 'Latifundio', agents: 15, years: 3, money: 5000000, land: 12, tools: 30, seeds: 50, water: 50 },
  { label: 'Solidaridad', agents: 80, years: 1, money: 200000, land: 2, tools: 5, seeds: 5, water: 5 },
];

/* ─── HELPERS ─── */
function fmtCOP(n: number) {
  return '$' + n.toLocaleString('es-CO', { maximumFractionDigits: 0 });
}
function pct(n: number) { return Math.max(0, Math.min(100, n * 100)).toFixed(0); }
function healthClass(v: number) { return v > 60 ? 'good' : v > 30 ? 'warn' : 'bad'; }

/* ─── COMPONENTS ─── */

function FarmCard({ f }: { f: any }) {
  const h = pct(f.health);
  return (
    <div className="agent-card stagger-1">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-[#F4F1DE]">
            {f.name?.replace(/singlePeasantFamily/, 'Familia ') || '—'}
          </h3>
          <span className="pill mt-1">{f.currentGoal || 'Sin meta'}</span>
        </div>
        <span className="text-[9px] font-mono text-[#6B7C7A] tracking-widest uppercase">{h}%</span>
      </div>
      <div className="health-bar mb-4">
        <div className={`health-bar-fill ${healthClass(+h)}`} style={{ width: `${h}%` }} />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <div className="text-[9px] text-[#6B7C7A] tracking-widest uppercase mb-0.5">Dinero</div>
          <div className="font-mono text-sm text-[#E6B84C]">{fmtCOP(f.money)}</div>
        </div>
        <div>
          <div className="text-[9px] text-[#6B7C7A] tracking-widest uppercase mb-0.5">Tierra</div>
          <div className="font-mono text-sm text-[#F4F1DE]">{f.land || '—'}</div>
        </div>
        <div>
          <div className="text-[9px] text-[#6B7C7A] tracking-widest uppercase mb-0.5">Herr.</div>
          <div className="font-mono text-sm text-[#F4F1DE]">{f.tools}</div>
        </div>
        <div>
          <div className="text-[9px] text-[#6B7C7A] tracking-widest uppercase mb-0.5">Salud</div>
          <div className="font-mono text-sm text-[#F4F1DE]">{h}%</div>
        </div>
      </div>
      {f.taskLog?.[f.taskLog.length - 1] && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <p className="text-xs text-[#6B7C7A] italic leading-relaxed line-clamp-2">
            «{f.taskLog[f.taskLog.length - 1]}»
          </p>
        </div>
      )}
    </div>
  );
}

const TREATMENT_IDS = [
  'E401','E402','E403','E404','E405','E406','E407','E408','E409',
  'E410','E411','E412','E413','E414','E415','E416','E417','E418',
  'E419','E420','E421','E422','E423','E424','E425','E426','E427',
];

function useReportStatus() {
  const [fileStatus, setFileStatus] = useState<{
    exists: boolean; filename?: string; sizeKb?: number; generatedAt?: string;
  } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [fr, sr] = await Promise.all([
        fetch('/api/report', { cache: 'no-store' }).then(r => r.json()),
        fetch('/api/report/status', { cache: 'no-store' }).then(r => r.json()),
      ]);
      setFileStatus(fr);
      setGenerating(sr.generating ?? false);
    } catch {}
  }, []);

  const generate = async (opts: {
    ollama_url: string; model: string; max_episodes: number; treatment?: string; mode?: string;
  }) => {
    setGenerating(true);
    setShowConfig(false);
    try {
      await fetch('/api/report/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts),
      });
    } catch {
      setGenerating(false);
    }
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 6000);
    return () => clearInterval(id);
  }, [refresh]);

  return { fileStatus, generating, showConfig, setShowConfig, generate };
}

function ReportConfigPanel({ onClose, onGenerate }: {
  onClose: () => void;
  onGenerate: (opts: { ollama_url: string; model: string; max_episodes: number; treatment?: string; mode: string }) => void;
}) {
  const [ollamaUrl, setOllamaUrl] = useState('http://ollama:11434');
  const [model, setModel] = useState('gemma3:4b');
  const [maxEpisodes, setMaxEpisodes] = useState(5);
  const [treatment, setTreatment] = useState('');
  const [mode, setMode] = useState('episodes');

  return (
    <div className="fixed top-12 right-6 w-80 bg-[#1A2327] border border-white/10 shadow-2xl" style={{ zIndex: 9999, animation: 'fadeUp 0.15s ease-out' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <span className="font-mono text-[10px] text-[#6B7C7A] tracking-[0.2em] uppercase">Generar informe</span>
        <button onClick={onClose} className="text-[#6B7C7A] hover:text-[#F4F1DE] text-sm leading-none">✕</button>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <div className="metric-label mb-1">Modo de análisis</div>
          <select className="input-field" value={mode} onChange={e => setMode(e.target.value)}>
            <option value="episodes">Por episodios (eventos clave)</option>
            <option value="monthly">Mensual (todos los años, 1 llamada)</option>
          </select>
          <p className="text-[9px] text-[#6B7C7A]/60 font-mono mt-1">
            {mode === 'monthly'
              ? 'Agrega datos mes a mes — más rápido, cubre toda la simulación'
              : 'Detecta crisis, cosechas y cambios emocionales en detalle'}
          </p>
        </div>
        <div>
          <div className="metric-label mb-1">Modelo LLM</div>
          <input className="input-field" value={model} onChange={e => setModel(e.target.value)} placeholder="gemma3:4b" />
        </div>
        <div>
          <div className="metric-label mb-1">URL Ollama</div>
          <input className="input-field" value={ollamaUrl} onChange={e => setOllamaUrl(e.target.value)} placeholder="http://localhost:11434" />
          <p className="text-[9px] text-[#6B7C7A]/60 font-mono mt-1">
            Servicio ollama del compose, o localhost:11434 local
          </p>
        </div>
        {mode === 'episodes' && (
          <div>
            <div className="metric-label mb-1">Episodios máx por tratamiento</div>
            <input type="number" className="input-field" value={maxEpisodes}
              onChange={e => setMaxEpisodes(+e.target.value)} min={1} max={50} />
          </div>
        )}
        <div>
          <div className="metric-label mb-1">Tratamiento</div>
          <select className="input-field" value={treatment} onChange={e => setTreatment(e.target.value)}>
            <option value="">Todos (E401–E427)</option>
            {TREATMENT_IDS.map(id => <option key={id} value={id}>{id}</option>)}
          </select>
        </div>
        <button
          onClick={() => onGenerate({
            ollama_url: ollamaUrl,
            model,
            max_episodes: maxEpisodes,
            treatment: treatment || undefined,
            mode,
          })}
          className="btn-start w-full"
        >
          Generar
        </button>
        <p className="text-[9px] text-[#6B7C7A]/40 font-mono text-center">
          {mode === 'monthly'
            ? 'Modo mensual: ~1–3 min por tratamiento'
            : 'Modo episodios: ~2–10 min según cantidad'}
        </p>
      </div>
    </div>
  );
}

function ReportButton({ highlight }: { highlight: boolean }) {
  const { fileStatus, generating, showConfig, setShowConfig, generate } = useReportStatus();

  return (
    <>
      {showConfig && createPortal(
        <ReportConfigPanel onClose={() => setShowConfig(false)} onGenerate={generate} />,
        document.body
      )}
      {generating ? (
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-[#E6B84C] tracking-[0.15em] uppercase animate-pulse">
            Generando informe…
          </span>
          <a
            href="/api/report/log"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[9px] text-[#6B7C7A] hover:text-[#F4F1DE] tracking-[0.1em] no-underline transition-colors"
          >
            ver log ↗
          </a>
        </div>
      ) : fileStatus?.exists ? (
        <div className="flex items-center gap-3">
          {highlight && (
            <span className="font-mono text-[9px] text-[#2D6A4F] bg-[#2D6A4F]/20 px-2 py-0.5 rounded-full tracking-widest uppercase animate-pulse">
              Nuevo
            </span>
          )}
          <button
            onClick={() => setShowConfig(true)}
            className="font-mono text-[10px] text-[#6B7C7A] hover:text-[#E6B84C] tracking-[0.15em] uppercase transition-colors"
          >
            Regenerar
          </button>
          <a
            href="/api/report/file"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10px] text-[#E6B84C] hover:text-[#F4A261] tracking-[0.15em] uppercase no-underline transition-colors"
            title={`${fileStatus.filename} · ${fileStatus.sizeKb} KB`}
          >
            Ver Informe →
          </a>
        </div>
      ) : (
        <button
          onClick={() => setShowConfig(true)}
          className="font-mono text-[10px] text-[#6B7C7A] hover:text-[#E6B84C] tracking-[0.15em] uppercase transition-colors"
        >
          Generar Informe
        </button>
      )}
    </>
  );
}

function TopBar({ date, count, running, onStop, reportHighlight }: any) {
  return (
    <header className="flex items-center gap-6 px-6 py-3 border-b border-white/5 bg-black/20 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <span className={`status-dot ${running ? 'running' : 'stopped'}`} />
        <span className="font-mono text-[10px] text-[#6B7C7A] tracking-[0.2em] uppercase">
          {running ? 'Simulando' : 'Detenido'}
        </span>
      </div>
      <div className="w-px h-4 bg-white/10" />
      <span className="font-mono text-[11px] text-[#F4F1DE] tracking-wider">{date || '—'}</span>
      <span className="font-mono text-[10px] text-[#6B7C7A] tracking-wider">{count} agentes</span>
      <div className="flex-1" />
      <ReportButton highlight={reportHighlight} />
      <div className="w-px h-4 bg-white/10" />
      <a href="/analytics" className="font-mono text-[10px] text-[#E6B84C] hover:text-[#F4A261] tracking-[0.15em] uppercase no-underline transition-colors">
        Analytics →
      </a>
      {running && <button onClick={onStop} className="btn-stop">Detener</button>}
    </header>
  );
}

function MetricTile({ label, value, color }: any) {
  return (
    <div className={`stat-tile ${'stagger-' + (Math.random() > 0.5 ? 2 : 3)}`}>
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{ color }}>{value}</div>
    </div>
  );
}

function ConfigForm({ loading, error, onStart }: any) {
  const [preset, setPreset] = useState('Custom');
  const [agents, setAgents] = useState(5);
  const [years, setYears] = useState(1);
  const [money, setMoney] = useState(1500000);
  const [land, setLand] = useState(6);
  const [tools, setTools] = useState(10);
  const [seeds, setSeeds] = useState(10);
  const [water, setWater] = useState(10);
  const [speed, setSpeed] = useState(0.1);
  const [emotions, setEmotions] = useState(1);
  const [training, setTraining] = useState(1);
  const [irrigation, setIrrigation] = useState(1);

  function apply(name: string) {
    const p = PRESETS.find(x => x.label === name); if (!p) return;
    setPreset(name); setAgents(p.agents); setYears(p.years);
    setMoney(p.money); setLand(p.land); setTools(p.tools); setSeeds(p.seeds); setWater(p.water);
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div style={{ animation: 'fadeUp 0.7s ease-out both' }}>
        <h1 className="text-6xl font-light tracking-tight text-[#F4F1DE] leading-none mb-3">
          Ethos<span className="text-[#E07A5F]">Terra</span>
        </h1>
        <p className="font-mono text-[11px] text-[#6B7C7A] tracking-[0.2em] uppercase mb-12">
          Simulador social · Familias campesinas · Colombia
        </p>
      </div>

      <div style={{ animation: 'fadeUp 0.7s ease-out 0.15s both' }} className="bg-[#1A2327] border border-white/5 p-8">
        <h2 className="font-mono text-[10px] text-[#6B7C7A] tracking-[0.25em] uppercase mb-6">
          Configuración del experimento
        </h2>

        <div className="mb-8">
          <div className="metric-label mb-3">Plantillas</div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(p => (
              <button key={p.label} onClick={() => apply(p.label)}
                className={`preset-btn ${preset === p.label ? 'active' : ''}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5 mb-6">
          <div>
            <div className="metric-label">Familias</div>
            <input type="number" className="input-field" value={agents}
              onChange={e => { setPreset('Custom'); setAgents(+e.target.value); }} min={1} max={500} />
          </div>
          <div>
            <div className="metric-label">Años</div>
            <input type="number" className="input-field" value={years}
              onChange={e => { setPreset('Custom'); setYears(+e.target.value); }} min={1} max={10} />
          </div>
          <div>
            <div className="metric-label">Tierras</div>
            <input type="number" className="input-field" value={land}
              onChange={e => { setPreset('Custom'); setLand(+e.target.value); }} min={1} max={100} />
          </div>
          <div>
            <div className="metric-label">Dinero (COP)</div>
            <input type="number" className="input-field" value={money}
              onChange={e => { setPreset('Custom'); setMoney(+e.target.value); }} step={100000} />
          </div>
          <div>
            <div className="metric-label">Herramientas</div>
            <input type="number" className="input-field" value={tools}
              onChange={e => { setPreset('Custom'); setTools(+e.target.value); }} min={0} />
          </div>
          <div>
            <div className="metric-label">Semillas</div>
            <input type="number" className="input-field" value={seeds}
              onChange={e => { setPreset('Custom'); setSeeds(+e.target.value); }} min={0} />
          </div>
          <div>
            <div className="metric-label">Agua</div>
            <input type="number" className="input-field" value={water}
              onChange={e => { setPreset('Custom'); setWater(+e.target.value); }} min={0} />
          </div>
          <div>
            <div className="metric-label">Velocidad</div>
            <select className="input-field" value={speed}
              onChange={e => setSpeed(+e.target.value)}>
              <option value={0.5}>Lenta (0.5s/día)</option>
              <option value={0.1}>Normal (0.1s/día)</option>
              <option value={0.02}>Rápida (20ms/día)</option>
              <option value={0.005}>Turbo (5ms/día)</option>
            </select>
          </div>
          <div>
            <div className="metric-label">Emociones</div>
            <select className="input-field" value={emotions}
              onChange={e => { setPreset('Custom'); setEmotions(+e.target.value); }}>
              <option value={1}>Activadas</option>
              <option value={0}>Desactivadas</option>
            </select>
          </div>
          <div>
            <div className="metric-label">Capacitación</div>
            <select className="input-field" value={training}
              onChange={e => { setPreset('Custom'); setTraining(+e.target.value); }}>
              <option value={1}>Activada</option>
              <option value={0}>Desactivada</option>
            </select>
          </div>
        </div>

        <button onClick={() => onStart({ agents, years, money, land, tools, seeds, water, speed, emotions, training, irrigation })}
          disabled={loading} className="btn-start w-full">
          {loading ? 'Iniciando...' : 'Iniciar simulación'}
        </button>
      </div>
    </div>
  );
}

/* ─── PAGE ─── */
export default function SimulatorPage() {
  const { farms, currentDate, agentCount, isRunning, connected, simulationJustEnded, mapData, progress, clearEndedFlag } = useWebSocket();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [started, setStarted] = useState(false);

  const avgH = farms.length ? farms.reduce((s: number, f: any) => s + f.health, 0) / farms.length : 0;
  const totalM = farms.reduce((s: number, f: any) => s + f.money, 0);
  const activeC = farms.filter((f: any) => f.currentGoal && f.currentGoal !== 'Idle').length;

  const handleStart = async (config: any) => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/start`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.started) { setStarted(true); setTimeout(() => setLoading(false), 2000); }
      else { setError(data.error || 'No se pudo iniciar la simulación'); setLoading(false); }
    } catch {
      setError(`No se puede conectar con ${API_URL}. ¿Está corriendo el simulador?`);
      setLoading(false);
    }
  };

  const handleStop = async () => {
    try { await fetch(`${API_URL}/stop`, { method: 'POST' }); } catch {}
  };

  return (
    <div className="min-h-screen relative">
      <div className="noise-overlay" />
      <div className="geo-pattern" />

      <TopBar date={currentDate} count={agentCount || farms.length} running={isRunning} onStop={handleStop} reportHighlight={simulationJustEnded} />

      <main className="relative z-10 p-6">
        {/* World map — always visible */}
        <div className="mb-6">
          <WorldMap data={mapData} />
        </div>

        {!isRunning && farms.length === 0 && !started ? (
          /* Pre-simulation: config form */
          <div className="flex flex-col items-center gap-8">
            <ConfigForm loading={loading} error={error} onStart={handleStart} />
            <div className="w-full max-w-2xl">
              <ExperimentLauncher />
            </div>
          </div>
        ) : (
          /* Simulation running or finished */
          <>
            {progress && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] text-[#6B7C7A] tracking-widest uppercase">Simulación — {progress.date}</span>
                  <span className="font-mono text-[11px] text-[#E6B84C]">{progress.pct.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-[#0A1217] h-1.5 rounded">
                  <div className="h-1.5 bg-[#E6B84C] rounded transition-all duration-500" style={{ width: `${progress.pct}%` }} />
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <MetricTile label="Agentes activos" value={`${activeC}/${agentCount || farms.length}`} color="#E07A5F" />
              <MetricTile label="Dinero total" value={fmtCOP(totalM)} color="#E6B84C" />
              <MetricTile label="Salud promedio" value={`${pct(avgH)}%`} color={+pct(avgH) > 50 ? '#2D6A4F' : '#E07A5F'} />
              <MetricTile label="Fecha actual" value={currentDate || '—'} color="#F4F1DE" />
            </div>
            <div className="mb-6">
              <ExperimentLauncher />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {farms.map((f: any) => <FarmCard key={f.name} f={f} />)}
            </div>
            {farms.length === 0 && !loading && (
              <div className="text-center py-16">
                <div className="font-mono text-[11px] text-[#6B7C7A] tracking-[0.2em] uppercase">
                  Esperando datos de simulación...
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
