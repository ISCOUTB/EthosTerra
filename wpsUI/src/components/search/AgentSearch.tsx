"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";

interface Agent {
  Agent?: string;
  [key: string]: string | number | undefined;
}

export default function AgentSearch() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/simulator/csv");
        if (!response.ok) throw new Error("Error obteniendo el CSV");

        const json = await response.json();
        if (!json.success) throw new Error(json.error ?? "Error en el CSV");

        // json.data contiene el texto CSV crudo
        const text: string = json.data;
        const rows = text.split("\n");
        const headers = rows[0].split(",");

        const parsedAgents = rows.slice(1).map((row) => {
          const values = row.split(",");
          return headers.reduce((obj, header, index) => {
            obj[header] = values[index];
            return obj;
          }, {} as Agent);
        });

        setAgents(parsedAgents);
      } catch (error) {
        console.error("Error al obtener datos:", error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() !== "") {
      const filtered = agents.filter((agent) => {
        const agentName = agent.Agent?.toString().toLowerCase() || "";
        return agentName.includes(searchTerm.toLowerCase());
      });
      setFilteredAgents(filtered);
    } else {
      setFilteredAgents([]);
    }
  }, [searchTerm, agents]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search an Agent</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Name of the agent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
          {searchTerm.trim() !== "" && (
            <>
              {filteredAgents.length > 0 ? (
                <div className="space-y-4">
                  {filteredAgents.map((agent, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-lg mb-2">
                          {agent.Agent || "Agente sin nombre"}
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(agent).map(
                            ([key, value]) =>
                              key !== "Agent" && (
                                <div key={key} className="flex justify-between">
                                  <span className="font-medium">{key}:</span>
                                  <span>{value}</span>
                                </div>
                              ),
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p>No se encontraron agentes.</p>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
