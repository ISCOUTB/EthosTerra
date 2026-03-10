"use client";

import React, { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Papa from "papaparse";

interface RangeChartProps {
  parameter: string;
  color: string;
  type: "float" | "integer"; // Agregar la propiedad 'type'
  agent: string | null; // Agente seleccionado
}

export const RangeChart: React.FC<RangeChartProps> = ({ parameter, color, type, agent }) => {
  const [data, setData] = useState<any[]>([]);

  // Modifica useEffect para cargar datos cuando cambian las props
useEffect(() => {
  const loadData = async () => {
    try {
      console.log(`Cargando datos para parámetro: ${parameter}, agente: ${agent || 'todos'}`);
      const response = await window.electronAPI.readCsv();
      if (!response.success || !response.data) {
        throw new Error(response.error || "Error al leer el archivo CSV");
      }

      // Analizar el CSV correctamente con Papa
      Papa.parse(response.data, {
        header: true,
        complete: (results) => {
          console.log(`CSV parseado: ${results.data.length} filas`);
          const filteredData = results.data
            .filter((row: any) => row.internalCurrentDate) 
            .filter((row: any) => !agent || row.Agent === agent)
            .map((row: any) => ({
              date: row.internalCurrentDate,
              value: parseFloat(row[parameter]), 
            }))
            .filter((row) => !isNaN(row.value));

          console.log(`Datos filtrados para ${parameter}: ${filteredData.length} entradas`);
          setData(filteredData);
        },
        error: (error) => {
          console.error("Error al parsear CSV:", error);
        },
      });
    } catch (error) {
      console.error("Error al cargar datos:", error);
    }
  };

  loadData();

  // Actualizar cada 2 segundos
  const interval = setInterval(loadData, 2000);
  return () => clearInterval(interval);
}, [parameter, agent]); // Dependencias: recarga cuando cambia parámetro o agente

  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.8} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#2c2c2c" strokeDasharray="3 3" /> {/* Oscurecer cuadrículas */}
          <XAxis
            dataKey="date"
            ticks={
              data.length > 2
                ? [
                    data[0]?.date,
                    data[Math.floor(data.length / 2)]?.date,
                    data[data.length - 1]?.date,
                  ]
                : data.map((d) => d.date)
            }
            tickFormatter={(date) => date}
          />
        <YAxis
          tickFormatter={(value) => {
            if (parameter === "money") {
              if (Math.abs(value) >= 1_000_000) {
                return (value / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
              }
              if (Math.abs(value) >= 1_000) {
                return (value / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
              }
              return Number(value).toLocaleString("es-ES", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 2,
                minimumFractionDigits: 0,
              });
            }
            return value;
          }}
        />
        <Tooltip />
        <Area type="monotone" dataKey="value" stroke={color} fill="url(#colorGradient)" />
      </AreaChart>
    </ResponsiveContainer>
  );
};
