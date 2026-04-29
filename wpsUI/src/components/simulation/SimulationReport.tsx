"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  TrendingUp,
  Wallet,
  Sprout,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import Papa from "papaparse";
import { cn } from "@/lib/utils";
import { floatVariables } from "../charts/datatabs/TabContent";

interface SimulationReportProps {
  isOpen: boolean;
  onClose: () => void;
}

interface StatsSummary {
  totalHarvest: number;
  avgHealth: number;
  totalWealth: number;
  duration: string;
  peasantCount: number;
  finalHappiness: number;
}

const SimulationReport: React.FC<SimulationReportProps> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<StatsSummary | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchFinalData = async () => {
      setLoading(true);
      console.log("Report: Fetching final data...");
      try {
        const res = await fetch("/api/simulator/csv");
        const json = await res.json();
        
        if (json.success && json.data) {
          console.log("Report: CSV data received, parsing...");
          Papa.parse(json.data, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              const rawData = results.data as any[];
              console.log(`Report: Parsed ${rawData.length} rows.`);
              setData(rawData);
              calculateSummary(rawData);
              setLoading(false);
            },
            error: (err) => {
              console.error("Report: PapaParse error", err);
              setLoading(false);
            }
          });
        } else {
          console.warn("Report: No data or success:false", json);
          setLoading(false);
        }
      } catch (e) {
        console.error("Report: Fetch error", e);
        setLoading(false);
      }
    };

    fetchFinalData();
  }, [isOpen]);

  const calculateSummary = (rawData: any[]) => {
    if (rawData.length === 0) return;

    const lastStep = rawData[rawData.length - 1];
    const agents = new Set(rawData.map(d => d.Agent));
    
    // Agregados
    let totalHarvest = 0;
    let sumHealth = 0;
    let totalWealth = 0;
    let sumHappiness = 0;

    // Tomamos el último estado de cada agente para el resumen final
    agents.forEach(agent => {
        const agentData = rawData.filter(d => d.Agent === agent);
        const last = agentData[agentData.length - 1];
        if (last) {
            totalHarvest += parseFloat(last.totalHarvestedWeight || 0);
            sumHealth += parseFloat(last.health || 0);
            totalWealth += parseFloat(last.money || 0);
            sumHappiness += parseFloat(last.HappinessSadness || 0);
        }
    });

    setSummary({
      totalHarvest,
      avgHealth: sumHealth / agents.size,
      totalWealth,
      duration: lastStep.internalCurrentDate || "N/A",
      peasantCount: agents.size,
      finalHappiness: sumHappiness / agents.size,
    });
  };

  const chartData = useMemo(() => {
    if (data.length === 0) return [];
    
    // Agrupar por fecha para tendencias globales
    const dateGroups = data.reduce((acc: any, curr) => {
        const date = curr.internalCurrentDate;
        if (!acc[date]) acc[date] = { date, health: 0, money: 0, count: 0 };
        acc[date].health += parseFloat(curr.health || 0);
        acc[date].money += parseFloat(curr.money || 0);
        acc[date].count += 1;
        return acc;
    }, {});

    return Object.values(dateGroups).map((d: any) => ({
        date: d.date,
        avgHealth: d.health / d.count,
        totalMoney: d.money,
    }));
  }, [data]);

  const generateConclusion = () => {
    if (!summary) return "";
    const health = summary.avgHealth;
    const wealth = summary.totalWealth;

    if (health > 80 && wealth > 1000) {
        return "The simulation was highly successful. The peasant families managed to maintain excellent health while growing their wealth significantly. The land distribution and market conditions were optimal.";
    } else if (health < 40) {
        return "The simulation reveals a critical situation. Peasant wellbeing declined sharply. This suggests that resources or environmental conditions were insufficient to sustain the population.";
    } else {
        return "The community reached a stable equilibrium. While growth was moderate, health levels remained sustainable for the majority of the population.";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#0f1417] border-[#272d34] text-white custom-scrollbar">
        <DialogHeader className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="text-emerald-500 w-6 h-6" />
            <DialogTitle className="text-2xl font-clash font-bold uppercase tracking-tight">
              Simulation Final Report
            </DialogTitle>
          </div>
          <DialogDescription className="text-gray-400">
            Comprehensive analysis of productivity, wellbeing, and socio-economic trends.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Activity className="w-12 h-12 text-sky-500 animate-spin" />
            <p className="text-gray-500 animate-pulse">Generating insights...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard 
                title="Population" 
                value={summary?.peasantCount.toString() || "0"} 
                icon={Users} 
                color="text-sky-400" 
                detail="Active Agents"
              />
              <StatCard 
                title="Total Wealth" 
                value={`$${summary?.totalWealth.toLocaleString()}`} 
                icon={Wallet} 
                color="text-emerald-400"
                detail="Community Assets"
              />
              <StatCard 
                title="Avg Health" 
                value={`${summary?.avgHealth.toFixed(1)}%`} 
                icon={Activity} 
                color="text-rose-400"
                detail="Overall Wellbeing"
              />
              <StatCard 
                title="Total Harvest" 
                value={`${summary?.totalHarvest.toFixed(0)}kg`} 
                icon={Sprout} 
                color="text-amber-400"
                detail="Productivity"
              />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="bg-[#181c20] border-[#272d34] overflow-hidden">
                <CardHeader className="p-4 border-b border-[#272d34] bg-black/20">
                  <CardTitle className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2">
                    <TrendingUp className="w-3 h-3" />
                    Health Trend
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorHealth" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#fb7185" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#fb7185" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#272d34" vertical={false} />
                      <XAxis dataKey="date" hide />
                      <YAxis domain={[0, 100]} stroke="#4b5563" fontSize={10} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f1417', border: '1px solid #272d34' }}
                        itemStyle={{ color: '#fb7185' }}
                      />
                      <Area type="monotone" dataKey="avgHealth" stroke="#fb7185" fillOpacity={1} fill="url(#colorHealth)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-[#181c20] border-[#272d34] overflow-hidden">
                <CardHeader className="p-4 border-b border-[#272d34] bg-black/20">
                  <CardTitle className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2">
                    <Wallet className="w-3 h-3" />
                    Economic Growth
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#272d34" vertical={false} />
                      <XAxis dataKey="date" hide />
                      <YAxis stroke="#4b5563" fontSize={10} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f1417', border: '1px solid #272d34' }}
                        itemStyle={{ color: '#10b981' }}
                      />
                      <Line type="monotone" dataKey="totalMoney" stroke="#10b981" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Conclusion Section */}
            <div className="bg-[#2664eb]/10 border border-[#2664eb]/30 rounded-xl p-6 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <AlertCircle className="w-24 h-24 text-[#2664eb]" />
               </div>
               <div className="relative z-10">
                   <h3 className="text-lg font-bold font-clash mb-3 flex items-center gap-2 text-sky-400">
                     <Clock className="w-5 h-5" />
                     Simulation Insights
                   </h3>
                   <p className="text-gray-300 leading-relaxed italic">
                     "{generateConclusion()}"
                   </p>
                   <div className="mt-4 pt-4 border-t border-[#2664eb]/20 flex items-center justify-between text-[11px] text-gray-500">
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-sky-500" />
                            Simulation ended on: <b>{summary?.duration}</b>
                        </span>
                        <span className="uppercase font-bold tracking-widest text-sky-500/50">EthosTerra Engine</span>
                   </div>
               </div>
            </div>

            <button
                onClick={onClose}
                className="w-full py-4 bg-[#2664eb] hover:bg-[#1e4bbf] text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-sky-500/20 flex items-center justify-center gap-2 group"
            >
                Close Report & Reset View
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const StatCard = ({ title, value, icon: Icon, color, detail }: any) => (
  <Card className="bg-[#181c20] border-[#272d34]">
    <CardContent className="p-4">
      <div className="flex justify-between items-start mb-2">
        <p className="text-[10px] font-bold uppercase text-gray-500">{title}</p>
        <Icon className={cn("w-4 h-4", color)} />
      </div>
      <div className="space-y-1">
        <h4 className="text-xl font-bold font-mono">{value}</h4>
        <p className="text-[9px] text-gray-600 italic">{detail}</p>
      </div>
    </CardContent>
  </Card>
);

export default SimulationReport;
