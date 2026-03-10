"use client";
import { useEffect, useState, useMemo } from "react";
import { fetchCSVData } from "@/lib/csvUtils";
import { floatVariables } from "@/components/charts/datatabs/TabContent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function useStatisticalAnalysis() {
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [primaryVariable, setPrimaryVariable] = useState<string>(floatVariables[0].key);
  const [secondaryVariable, setSecondaryVariable] = useState<string>(floatVariables[1].key);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchCSVData();
        const rows = data.split("\n").map((row) => row.split(",").map((cell) => cell.trim()));
        setCsvData(rows);
      } catch (error) {
        console.error("Error loading CSV data:", error);
      }
    };

    loadData();

    // Actualización en tiempo real
    const interval = setInterval(loadData, 5000); // Actualiza cada 5 segundos
    return () => clearInterval(interval);
  }, []);

  const comparisonData = useMemo(() => {
    if (csvData.length === 0) return [];
    const headers = csvData[0];
    const primaryIndex = headers.indexOf(primaryVariable);
    const secondaryIndex = headers.indexOf(secondaryVariable);

    if (primaryIndex === -1 || secondaryIndex === -1) {
      console.error("Selected variables not found in CSV headers.");
      return [];
    }

    return csvData.slice(1).map((row) => {
      const primaryValue = parseFloat(row[primaryIndex]);
      const secondaryValue = parseFloat(row[secondaryIndex]);
      return {
        x: isNaN(primaryValue) ? 0 : primaryValue,
        y: isNaN(secondaryValue) ? 0 : secondaryValue,
      };
    });
  }, [csvData, primaryVariable, secondaryVariable]);

  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="dark:text-white">Statistical Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-4">
          <Select value={primaryVariable} onValueChange={setPrimaryVariable}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Primary Variable" />
            </SelectTrigger>
            <SelectContent>
              {floatVariables.map((variable) => (
                <SelectItem key={variable.key} value={variable.key}>
                  {variable.key}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={secondaryVariable} onValueChange={setSecondaryVariable}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Secondary Variable" />
            </SelectTrigger>
            <SelectContent>
              {floatVariables.map((variable) => (
                <SelectItem key={variable.key} value={variable.key}>
                  {variable.key}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="h-80">
          {comparisonData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="x"
                  name={primaryVariable}
                  label={{ value: primaryVariable, position: "bottom", fill: "#888" }}
                  stroke="#888"
                />
                <YAxis
                  dataKey="y"
                  name={secondaryVariable}
                  label={{ value: secondaryVariable, angle: -90, position: "left", fill: "#888" }}
                  stroke="#888"
                />
                <Tooltip
                  formatter={(value, name) => [
                    value,
                    name === "x" ? primaryVariable : secondaryVariable,
                  ]}
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "6px",
                    color: "#fff",
                  }}
                />
                <Scatter data={comparisonData} fill="#8884d8" />
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400">No data available for the selected variables.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
