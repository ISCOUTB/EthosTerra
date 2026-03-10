import { Download } from "lucide-react";
import moment from "moment";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fetchCSVData } from "@/lib/csvUtils";

export function DownloadSection() {
  const downloadCSV = async () => {
    try {
      const data = await fetchCSVData();

      if (!data || data.length === 0) {
        console.error("No hay datos disponibles para descargar");
        return;
      }

      const headers = Object.keys(data[0]);
      const csv = Papa.unparse({
        fields: headers,
        data: data,
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `simulation_results_${moment().format("YYYY-MM-DD_HH-mm")}.csv`
      );
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error al descargar el CSV:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Download Simulation Results</CardTitle>
        <CardDescription>
          Download the complete simulation data in CSV format for more detailed
          analysis.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={downloadCSV}>
          <Download className="mr-2 h-4 w-4" /> Descargar CSV
        </Button>
      </CardContent>
    </Card>
  );
}