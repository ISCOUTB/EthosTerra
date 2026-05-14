'use client';

import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

const METRICS = [
  { key: 'money', label: 'Dinero', color: '#E6B84C' },
  { key: 'health', label: 'Salud', color: '#E07A5F' },
  { key: 'happiness', label: 'Felicidad', color: '#F4A261' },
  { key: 'harvested_weight', label: 'Cosecha (kg)', color: '#2D6A4F' },
  { key: 'food_security', label: 'Seg. Alimentaria', color: '#1B4332' },
  { key: 'days_in_crisis', label: 'Días en crisis', color: '#D95D39' },
];

export default function AnalyticsPage() {
  const [data, setData] = useState<any[]>([]);
  const [metric, setMetric] = useState('money');
  const [agent, setAgent] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/csv').then(r => r.json()).then(j => {
      if (!j.data || typeof j.data !== 'string') {
        setData([]);
        return;
      }
      try {
        const result = Papa.parse(j.data, { header: true, skipEmptyLines: true, dynamicTyping: false });
        if (result.errors && result.errors.length > 0) {
          console.warn('CSV parse warnings:', result.errors.slice(0, 3));
        }
        setData(result.data as any[]);
      } catch (err) {
        console.error('CSV parse error:', err);
        setData([]);
      }
    }).catch(err => {
      console.error('CSV fetch error:', err);
      setData([]);
    }).finally(() => setLoading(false));
  }, []);

  const agents = [...new Set(data.map(d => d.agent).filter(Boolean))];
  const chartData = data
    .filter(d => agent === 'all' || d.agent === agent)
    .map(d => ({ date: d.date, value: +((d as any)[metric] || 0) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const m = METRICS.find(x => x.key === metric);

  const summaryVals = chartData.map(d => d.value).filter(v => !isNaN(v));
  const avg = summaryVals.length ? summaryVals.reduce((a, b) => a + b, 0) / summaryVals.length : 0;
  const max = summaryVals.length ? Math.max(...summaryVals) : 0;
  const min = summaryVals.length ? Math.min(...summaryVals) : 0;

  return (
    <div className="min-h-screen bg-[#12181B] text-[#F4F1DE]">
      <div className="noise-overlay" style={{ opacity: 0.02, position: 'fixed' }} />
      <header className="flex items-center gap-6 px-6 py-3 border-b border-white/5 bg-black/20 backdrop-blur-sm">
        <a href="/" className="font-mono text-[10px] text-[#6B7C7A] hover:text-[#F4F1DE] tracking-[0.15em] uppercase no-underline transition-colors">← Volver</a>
        <h1 className="font-mono text-[10px] text-[#6B7C7A] tracking-[0.25em] uppercase">Analytics</h1>
        <div className="flex-1" />
        <button onClick={() => {
          const csv = Papa.unparse(data); const b = new Blob([csv]);
          const a = document.createElement('a'); a.href = URL.createObjectURL(b);
          a.download = 'wpsSimulator.csv'; a.click();
        }} disabled={!data.length}
          className="btn-stop">Exportar CSV</button>
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
          <div className="h-96 flex items-center justify-center font-mono text-xs text-[#6B7C7A]">Cargando...</div>
        ) : chartData.length === 0 ? (
          <div className="h-96 flex items-center justify-center font-mono text-xs text-[#6B7C7A]">Sin datos. Ejecuta una simulación primero.</div>
        ) : (
          <div className="bg-[#1A2327] border border-white/5 p-6 mb-6" style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={`grad`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={m?.color} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={m?.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" stroke="#6B7C7A" fontSize={9} tick={{ fill: '#6B7C7A', fontFamily: 'DM Mono' }} />
                <YAxis stroke="#6B7C7A" fontSize={9} tick={{ fill: '#6B7C7A', fontFamily: 'DM Mono' }} />
                <Tooltip contentStyle={{ background: '#1A2327', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, fontSize: 11, color: '#F4F1DE' }} />
                <Area type="monotone" dataKey="value" stroke={m?.color} fill={`url(#grad)`} strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {METRICS.map(m => {
            const vals = chartData.map(d => d.value).filter(v => !isNaN(v));
            const a = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
            return (
              <div key={m.key} onClick={() => setMetric(m.key)} className="bg-[#1A2327] border border-white/5 p-4 text-center cursor-pointer hover:border-white/10 transition-colors">
                <div className="w-2 h-2 mb-2 mx-auto rounded-full" style={{ backgroundColor: m.color }} />
                <div className="text-[9px] text-[#6B7C7A] tracking-widest uppercase mb-1">{m.label}</div>
                <div className="font-mono text-sm text-[#F4F1DE]">{m.key === 'money' ? `$${a.toFixed(0)}` : a.toFixed(2)}</div>
                <div className="text-[9px] text-[#6B7C7A] mt-1 font-mono">{a.toFixed(1)}</div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
