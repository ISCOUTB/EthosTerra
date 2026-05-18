'use client';

import { useState, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

const METRICS = [
  { key: 'money',            label: 'Dinero',          color: '#E6B84C' },
  { key: 'health',           label: 'Salud',            color: '#E07A5F' },
  { key: 'happiness',        label: 'Felicidad',        color: '#F4A261' },
  { key: 'harvested_weight', label: 'Cosecha (kg)',     color: '#2D6A4F' },
  { key: 'food_security',    label: 'Seg. Alimentaria', color: '#1B4332' },
  { key: 'days_in_crisis',   label: 'Días en crisis',   color: '#D95D39' },
];

const TREATMENT_IDS = Array.from({ length: 27 }, (_, i) => `E${401 + i}`);

export default function AnalyticsPage() {
  const [data, setData]           = useState<any[]>([]);
  const [metric, setMetric]       = useState('money');
  const [agent, setAgent]         = useState('all');
  const [loading, setLoading]     = useState(false);
  const [source, setSource]       = useState<'live' | string>('live');
  const [sourceLabel, setSourceLabel] = useState('Simulación en vivo');

  const loadCsv = useCallback((treatment: string) => {
    setLoading(true);
    setData([]);
    const url = treatment === 'live' ? '/api/csv' : `/api/csv?treatment=${treatment}`;
    fetch(url)
      .then(r => r.json())
      .then(j => {
        if (!j.data || typeof j.data !== 'string' || !j.data.trim()) {
          setData([]);
          return;
        }
        const result = Papa.parse(j.data, { header: true, skipEmptyLines: true, dynamicTyping: false });
        setData(result.data as any[]);
        setSourceLabel(treatment === 'live' ? `Simulación en vivo (${j.rows} filas)` : `${treatment} — ${j.rows.toLocaleString()} filas`);
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadCsv(source); }, [source, loadCsv]);

  const agents = [...new Set(data.map((d: any) => d.agent).filter(Boolean))];
  const chartData = data
    .filter((d: any) => agent === 'all' || d.agent === agent)
    .map((d: any) => ({ date: d.date, value: +((d as any)[metric] || 0) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const m = METRICS.find(x => x.key === metric);
  const summaryVals = chartData.map(d => d.value).filter(v => !isNaN(v));
  const avg = summaryVals.length ? summaryVals.reduce((a, b) => a + b, 0) / summaryVals.length : 0;
  const max = summaryVals.length ? Math.max(...summaryVals) : 0;
  const min = summaryVals.length ? Math.min(...summaryVals) : 0;

  const exportCsv = () => {
    const csv = Papa.unparse(data);
    const b = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = source === 'live' ? 'simulacion_live.csv' : `${source}_wpsSimulator.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-[#12181B] text-[#F4F1DE]">
      <div className="noise-overlay" style={{ opacity: 0.02, position: 'fixed' }} />
      <header className="flex items-center gap-4 px-6 py-3 border-b border-white/5 bg-black/20 backdrop-blur-sm flex-wrap">
        <a href="/" className="font-mono text-[10px] text-[#6B7C7A] hover:text-[#F4F1DE] tracking-[0.15em] uppercase no-underline transition-colors">← Volver</a>
        <h1 className="font-mono text-[10px] text-[#6B7C7A] tracking-[0.25em] uppercase">Analytics</h1>

        {/* Selector de fuente de datos */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] text-[#6B7C7A] uppercase tracking-widest">Fuente:</span>
          <select
            className="input-field w-auto text-[10px]"
            value={source}
            onChange={e => setSource(e.target.value)}
          >
            <option value="live">Simulación en vivo</option>
            <optgroup label="Experimento E5 (Taguchi L27)">
              {TREATMENT_IDS.map(id => (
                <option key={id} value={id}>{id}</option>
              ))}
            </optgroup>
          </select>
        </div>

        <div className="flex-1" />
        <span className="font-mono text-[9px] text-[#6B7C7A]">{loading ? 'Cargando…' : sourceLabel}</span>
        <button
          onClick={exportCsv}
          disabled={!data.length}
          className="btn-stop"
        >
          Exportar CSV
        </button>
      </header>

      <main className="p-6 relative z-10">
        <div className="flex flex-wrap gap-3 mb-6">
          <select className="input-field w-auto" value={metric} onChange={e => setMetric(e.target.value)}>
            {METRICS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
          <select className="input-field w-auto" value={agent} onChange={e => setAgent(e.target.value)}>
            <option value="all">Todos los agentes</option>
            {agents.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="h-96 flex items-center justify-center font-mono text-xs text-[#6B7C7A]">Cargando datos…</div>
        ) : chartData.length === 0 ? (
          <div className="h-96 flex items-center justify-center font-mono text-xs text-[#6B7C7A] text-center px-8">
            {source === 'live'
              ? 'Sin datos en vivo. Ejecuta una simulación o selecciona un tratamiento del experimento E5.'
              : `Sin datos para ${source}. Verifica que el CSV exista en data/experiments/E5/${source}/.`}
          </div>
        ) : (
          <div className="bg-[#1A2327] border border-white/5 p-6 mb-6" style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={m?.color} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={m?.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" stroke="#6B7C7A" fontSize={9} tick={{ fill: '#6B7C7A', fontFamily: 'DM Mono' }} />
                <YAxis stroke="#6B7C7A" fontSize={9} tick={{ fill: '#6B7C7A', fontFamily: 'DM Mono' }} />
                <Tooltip contentStyle={{ background: '#1A2327', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, fontSize: 11, color: '#F4F1DE' }} />
                <Area type="monotone" dataKey="value" stroke={m?.color} fill="url(#grad)" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Resumen estadístico */}
        {!loading && chartData.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[['Promedio', avg], ['Máximo', max], ['Mínimo', min]].map(([label, val]) => (
              <div key={label as string} className="bg-[#1A2327] border border-white/5 p-4 text-center">
                <div className="text-[9px] text-[#6B7C7A] tracking-widest uppercase mb-1">{label}</div>
                <div className="font-mono text-sm text-[#F4F1DE]">
                  {metric === 'money' ? `$${(val as number).toLocaleString('es-CO', { maximumFractionDigits: 0 })}` : (val as number).toFixed(3)}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {METRICS.map(m => {
            const vals = data
              .filter((d: any) => agent === 'all' || d.agent === agent)
              .map((d: any) => +((d as any)[m.key] || 0))
              .filter(v => !isNaN(v));
            const a = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
            return (
              <div key={m.key} onClick={() => setMetric(m.key)}
                className={`bg-[#1A2327] border p-4 text-center cursor-pointer transition-colors ${metric === m.key ? 'border-white/20' : 'border-white/5 hover:border-white/10'}`}>
                <div className="w-2 h-2 mb-2 mx-auto rounded-full" style={{ backgroundColor: m.color }} />
                <div className="text-[9px] text-[#6B7C7A] tracking-widest uppercase mb-1">{m.label}</div>
                <div className="font-mono text-sm text-[#F4F1DE]">
                  {m.key === 'money' ? `$${a.toFixed(0)}` : a.toFixed(3)}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
