'use client';

import { useState, useEffect, useRef } from 'react';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/wpsViewer';

interface FarmData {
  name: string;
  health: number;
  money: number;
  land: string;
  tools: number;
  currentGoal: string;
  taskLog: string[];
  state: string;
}

export function useWebSocket() {
  const [farms, setFarms] = useState<FarmData[]>([]);
  const [currentDate, setCurrentDate] = useState('');
  const [agentCount, setAgentCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [connected, setConnected] = useState(false);
  const startedRef = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    function connect() {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        ws.send('setup');
      };

      ws.onmessage = (evt) => {
        const msg = evt.data;
        if (msg.startsWith('q=')) {
          const count = parseInt(msg.slice(2));
          setAgentCount(count);
        } else if (msg.startsWith('d=')) {
          setCurrentDate(msg.slice(2));
        } else if (msg.startsWith('j=')) {
          if (!startedRef.current) {
            startedRef.current = true;
            setIsRunning(true);
          }
          try {
            const data = JSON.parse(msg.slice(2));
            let stateObj: any = {};
            try { stateObj = JSON.parse(data.state || '{}'); } catch {}
            const farm: FarmData = {
              name: data.name || 'Desconocido',
              health: stateObj.health ?? data.life ?? 0,
              money: stateObj.money ?? data.amount ?? 0,
              land: stateObj.land ?? data.farmId ?? '',
              tools: stateObj.tools ?? data.count ?? 0,
              currentGoal: stateObj.currentGoal || stateObj.current_goal || '',
              taskLog: data.taskLog || [],
              state: data.state || '',
            };
            setFarms(prev => {
              const idx = prev.findIndex(f => f.name === farm.name);
              if (idx >= 0) { const n = [...prev]; n[idx] = farm; return n; }
              return [...prev, farm];
            });
          } catch {}
        } else if (msg.startsWith('e=')) {
          setIsRunning(false);
          startedRef.current = false;
        }
      };

      ws.onclose = () => {
        setConnected(false);
        setIsRunning(false);
        startedRef.current = false;
        setTimeout(() => connect(), 3000);
      };
      ws.onerror = () => { ws.close(); };
    }

    connect();
    return () => { wsRef.current?.close(); };
  }, []);

  return { farms, currentDate, agentCount, isRunning, connected };
}
