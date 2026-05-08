"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface ParcelData {
  id: string;
  x: number;
  y: number;
  kind: string;
  neighbors: string[];
  is_cultivable: boolean;
}

interface ParcelState {
  id: string;
  x: number;
  y: number;
  stage: string;
  crop_type: string;
  owner: string;
  secure: number;
  money: number;
}

interface WorldMapData {
  type: "map";
  parcels: Record<string, ParcelData>;
  states: Record<string, ParcelState>;
}

const STAGE_COLORS: Record<string, string> = {
  NONE: "#8B7355",
  FALLOW: "#A0826D",
  PLANTING: "#90EE90",
  GROWING: "#228B22",
  HARVEST_READY: "#DAA520",
  HARVESTED: "#CD853F",
  IRRIGATED: "#4682B4",
  TREATED: "#9370DB",
};

const SECURE_COLORS = ["#FF4444", "#FF8866", "#FFAA44", "#88CC44", "#44AA44"];

function getSecureColor(secure: number): string {
  const idx = Math.max(0, Math.min(4, Math.floor((secure + 1) * 2)));
  return SECURE_COLORS[idx];
}

export function WorldMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<WorldMapData | null>(null);
  const [hoveredParcel, setHoveredParcel] = useState<ParcelState | null>(null);
  const [showSecurity, setShowSecurity] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const parcelPositionsRef = useRef<Map<string, { x: number; y: number; w: number; h: number }>>(new Map());

  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const parcels = Object.entries(data.parcels);
    if (parcels.length === 0) return;

    const allX = parcels.map(([, p]) => p.x);
    const allY = parcels.map(([, p]) => p.y);
    const minX = Math.min(...allX);
    const maxX = Math.max(...allX);
    const minY = Math.min(...allY);
    const maxY = Math.max(...allY);

    const padding = 40;
    const w = canvas.width - padding * 2;
    const h = canvas.height - padding * 2;
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const scale = Math.min(w / rangeX, h / rangeY);

    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const positions = new Map<string, { x: number; y: number; w: number; h: number }>();

    for (const [id, parcel] of parcels) {
      const px = padding + (parcel.x - minX) * scale;
      const py = padding + (parcel.y - minY) * scale;
      const size = Math.max(8, scale * 0.8);

      const state = data.states[id];
      let color = parcel.is_cultivable ? "#3a3a4e" : "#2a2a3e";

      if (state) {
        if (showSecurity) {
          color = getSecureColor(state.secure);
        } else if (state.stage && STAGE_COLORS[state.stage]) {
          color = STAGE_COLORS[state.stage];
        }
      }

      ctx.fillStyle = color;
      ctx.strokeStyle = "#444";
      ctx.lineWidth = 0.5;
      ctx.fillRect(px - size / 2, py - size / 2, size, size);
      ctx.strokeRect(px - size / 2, py - size / 2, size, size);

      positions.set(id, { x: px - size / 2, y: py - size / 2, w: size, h: size });
    }

    parcelPositionsRef.current = positions;
  }, [data, showSecurity]);

  useEffect(() => {
    const wsUrl = `ws://${window.location.hostname}:8000/wpsViewer`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const msg = event.data;
      if (msg.startsWith("m=")) {
        try {
          const mapData = JSON.parse(msg.slice(2));
          if (mapData.type === "map") {
            setData(mapData);
          }
        } catch {
          // ignore parse errors
        }
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    drawMap();
  }, [drawMap]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let found: ParcelState | null = null;
    for (const [id, pos] of parcelPositionsRef.current.entries()) {
      if (mx >= pos.x && mx <= pos.x + pos.w && my >= pos.y && my <= pos.y + pos.h) {
        found = data?.states[id] || null;
        break;
      }
    }
    setHoveredParcel(found);
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <p>Conectando al mapa del mundo...</p>
      </div>
    );
  }

  const parcelCount = Object.keys(data.parcels).length;
  const stateCount = Object.keys(data.states).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">
          Mapa del Mundo ({parcelCount} parcelas, {stateCount} activas)
        </h3>
        <button
          onClick={() => setShowSecurity(!showSecurity)}
          className={`px-2 py-1 text-xs rounded ${
            showSecurity
              ? "bg-red-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          {showSecurity ? "Inseguridad" : "Cultivo"}
        </button>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={600}
          height={400}
          className="w-full border border-gray-700 rounded cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredParcel(null)}
        />
        {hoveredParcel && (
          <div className="absolute top-2 right-2 bg-gray-800 border border-gray-600 rounded p-2 text-xs text-gray-300 shadow-lg">
            <p><span className="text-gray-500">ID:</span> {hoveredParcel.id}</p>
            <p><span className="text-gray-500">Dueño:</span> {hoveredParcel.owner || "-"}</p>
            <p><span className="text-gray-500">Etapa:</span> {hoveredParcel.stage}</p>
            <p><span className="text-gray-500">Cultivo:</span> {hoveredParcel.crop_type || "-"}</p>
            <p><span className="text-gray-500">Seguridad:</span> {hoveredParcel.secure.toFixed(2)}</p>
            <p><span className="text-gray-500">Dinero:</span> ${hoveredParcel.money.toLocaleString()}</p>
          </div>
        )}
      </div>
      <div className="flex gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 inline-block bg-[#8B7355] rounded-sm"></span> NONE
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 inline-block bg-[#90EE90] rounded-sm"></span> PLANTING
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 inline-block bg-[#228B22] rounded-sm"></span> GROWING
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 inline-block bg-[#DAA520] rounded-sm"></span> HARVEST
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 inline-block bg-[#A0826D] rounded-sm"></span> FALLOW
        </span>
      </div>
    </div>
  );
}
