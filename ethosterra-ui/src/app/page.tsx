'use client';

import { useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { WorldMap } from '@/components/simulation/WorldMap';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/wpsViewer';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

/* ─── PRESETS ─── */
const PRESETS = [
  { label: 'Custom', agents: 5, years: 1, money: 1500000, tools: 10, seeds: 10, water: 10 },
  { label: 'Estrés', agents: 40, years: 1, money: 1500000, tools: 5, seeds: 5, water: 2 },
  { label: 'Pobreza', agents: 60, years: 2, money: 100000, tools: 2, seeds: 2, water: 0 },
  { label: 'Tecnología', agents: 30, years: 2, money: 2000000, tools: 20, seeds: 20, water: 30 },
  { label: 'Latifundio', agents: 15, years: 3, money: 5000000, tools: 30, seeds: 50, water: 50 },
  { label: 'Solidaridad', agents: 80, years: 1, money: 200000, tools: 5, seeds: 5, water: 5 },
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

function TopBar({ date, count, running, onStop }: any) {
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
  const [tools, setTools] = useState(10);
  const [seeds, setSeeds] = useState(10);
  const [water, setWater] = useState(10);
  const [speed, setSpeed] = useState(0.001);

  function apply(name: string) {
    const p = PRESETS.find(x => x.label === name); if (!p) return;
    setPreset(name); setAgents(p.agents); setYears(p.years);
    setMoney(p.money); setTools(p.tools); setSeeds(p.seeds); setWater(p.water);
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
        </div>

        {error && (
          <div className="mb-4 p-3 bg-[#D95D39]/10 border border-[#D95D39]/20 text-[#E07A5F] font-mono text-[11px]">
            {error}
          </div>
        )}

        <button onClick={() => onStart({ agents, years, money, tools, seeds, water, speed })}
          disabled={loading} className="btn-start w-full">
          {loading ? 'Iniciando...' : 'Iniciar simulación'}
        </button>
      </div>
    </div>
  );
}

/* ─── PAGE ─── */
export default function SimulatorPage() {
  const { farms, currentDate, agentCount, isRunning, connected } = useWebSocket();
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

      <TopBar date={currentDate} count={agentCount || farms.length} running={isRunning} onStop={handleStop} />

      {!isRunning && farms.length === 0 && !started ? (
        <main className="relative z-10 flex items-center justify-center min-h-[calc(100vh-45px)] p-6">
          <ConfigForm loading={loading} error={error} onStart={handleStart} />
        </main>
      ) : (
        <main className="relative z-10 p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricTile label="Agentes activos" value={`${activeC}/${agentCount || farms.length}`} color="#E07A5F" />
            <MetricTile label="Dinero total" value={fmtCOP(totalM)} color="#E6B84C" />
            <MetricTile label="Salud promedio" value={`${pct(avgH)}%`} color={+pct(avgH) > 50 ? '#2D6A4F' : '#E07A5F'} />
            <MetricTile label="Fecha actual" value={currentDate || '—'} color="#F4F1DE" />
          </div>
          <div className="mb-6">
            <WorldMap />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {farms.map((f: any) => <FarmCard key={f.name} f={f} />)}
          </div>
          {farms.length === 0 && !loading && (
            <div className="text-center py-24">
              <div className="font-mono text-[11px] text-[#6B7C7A] tracking-[0.2em] uppercase">
                Esperando datos de simulación...
              </div>
              <div className="mt-4 text-[#6B7C7A]/30 text-sm">ws://localhost:8000/wpsViewer</div>
            </div>
          )}
        </main>
      )}
    </div>
  );
}
