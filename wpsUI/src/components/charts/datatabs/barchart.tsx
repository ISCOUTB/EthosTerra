"use client";

import React, { useState, useEffect } from "react";
import { TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Label,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";

// Configuración del gráfico para el parámetro "money"
const chartConfig = {
  money: {
    label: "Money",
    color: "#007bff", // Color azul para la barra
    colorbg: "#007bff", // Color azul para el fondo
    description: "Cantidad de dinero que posee el agente.",
  },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-blue-600 text-white p-2 rounded-md shadow-md">
        <p className="font-semibold">{label}</p>
        <p className="text-lg">{payload[0].value}</p>
      </div>
    );
  }
  return null;
};

export default function BarChartComponent() {
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    // Simulación de datos de dinero durante el año con 4 registros
    const simulatedData = [
      { years: "Enero", money: 1200 },
      { years: "Abril", money: 1500 },
      { years: "Julio", money: 1800 },
      { years: "Octubre", money: 2100 },
    ];
    setChartData(simulatedData);
  }, []);

  return (
    <Card>
      <CardHeader></CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="years"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => value.slice(0, 3)}
              >
                <Label value="Month" offset={-18} position="insideBottom" />
              </XAxis>
              <YAxis tickLine={false} axisLine={false}>
                <Label
                  value="Money"
                  angle={-90}
                  position="insideLeft"
                  style={{ textAnchor: "start", fontSize: 20 }}
                />
              </YAxis>
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="money" fill={chartConfig.money.color} radius={10} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-xl">
        <div className="leading-none text-muted-foreground">
          Showing the agent's money over the last period
        </div>
      </CardFooter>
    </Card>
  );
}
