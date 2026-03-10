"use client";

import { useState } from "react";
import {
  Download,
  Eye,
  FileSpreadsheet,
  Loader2,
  BarChart,
  ArrowLeft,
  Info,
} from "lucide-react";
import { useRouter } from "next/navigation";
import moment from "moment";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  fetchCSVData,
  type CSVData,
  calculateStatistics,
} from "@/lib/csvUtils";

export function DownloadSection() {
  const router = useRouter();
  const { toast } = useToast();

  // State for data and UI
  const [previewData, setPreviewData] = useState<CSVData[]>([]);
  const [allData, setAllData] = useState<CSVData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedParam, setSelectedParam] = useState<string>("");
  const [numericParams, setNumericParams] = useState<string[]>([]);
  const [stats, setStats] = useState<any>(null);

  // Load preview data
  const loadPreviewData = async () => {
    setIsLoading(true);

    try {
      const data = await fetchCSVData();

      if (!data || data.length === 0) {
        toast({
          title: "Error",
          description: "No data available to display",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Save all data and preview first 5 rows
      setAllData(data);
      setPreviewData(data.slice(0, 5));
      setShowPreview(true);

      // Identify numeric parameters
      const params = Object.keys(data[0]).filter((key) => {
        const value = data[0][key];
        return (
          typeof value === "number" ||
          (typeof value === "string" && !isNaN(Number(value)))
        );
      });

      setNumericParams(params);

      // Select first parameter by default
      if (params.length > 0 && !selectedParam) {
        setSelectedParam(params[0]);
        updateStats(params[0], data);
      }

      toast({
        title: "Data loaded",
        description: `${data.length} records loaded successfully.`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: `Error loading preview: ${err instanceof Error ? err.message : String(err)}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update statistics when selected parameter changes
  const updateStats = (param: string, data: CSVData[]) => {
    const processedData = data.map((row) => ({
      value:
        typeof row[param] === "number"
          ? (row[param] as number)
          : Number(row[param]),
    }));

    const calculatedStats = calculateStatistics(processedData);

    // Calculate distribution for histogram
    const values = processedData.map((item) => item.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const bucketCount = 5;
    const bucketSize = range / bucketCount;

    const distribution = Array(bucketCount).fill(0);

    values.forEach((value) => {
      const bucketIndex = Math.min(
        Math.floor((value - min) / bucketSize),
        bucketCount - 1
      );
      distribution[bucketIndex]++;
    });

    const maxCount = Math.max(...distribution);
    const normalizedDistribution = distribution.map(
      (count) => (count / maxCount) * 100
    );

    setStats({
      ...calculatedStats,
      distribution: normalizedDistribution,
      min,
      max,
    });
  };

  // Handle parameter change
  const handleParamChange = (param: string) => {
    setSelectedParam(param);
    updateStats(param, allData);
  };

  // Download full CSV
  const downloadCSV = async () => {
    setIsLoading(true);

    try {
      const data = await fetchCSVData();

      if (!data || data.length === 0) {
        toast({
          title: "Error",
          description: "No data available to download",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const headers = Object.keys(data[0]);
      const csv = Papa.unparse({ fields: headers, data });

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

      toast({
        title: "Download complete",
        description: `${data.length} records downloaded successfully.`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: `Error downloading CSV: ${err instanceof Error ? err.message : String(err)}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Format values by type
  const formatValue = (value: any) => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "number" && !Number.isInteger(value)) {
      return value.toFixed(4);
    }
    return String(value);
  };

  // Render skeleton while loading
  const renderSkeleton = () => (
    <div className="space-y-4 mt-6 slide-in">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="border border-border rounded-md">
        <div className="p-4 space-y-4">
          <div className="flex space-x-4">
            {Array(5)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} className="h-6 w-24" />
              ))}
          </div>
          {Array(5)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="flex space-x-4">
                {Array(5)
                  .fill(0)
                  .map((_, j) => (
                    <Skeleton key={j} className="h-6 w-24" />
                  ))}
              </div>
            ))}
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Array(4)
            .fill(0)
            .map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
        </div>
      </div>
    </div>
  );

  // Render data preview
  const renderPreview = () => {
    if (!showPreview) return null;
    if (isLoading) return renderSkeleton();
    if (!previewData || previewData.length === 0) {
      return (
        <div className="text-center py-4 text-muted-foreground">
          No data available to display
        </div>
      );
    }

    const columns = Object.keys(previewData[0]);

    return (
      <div className="space-y-4 mt-6 slide-in">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium flex items-center font-clash">
        <Eye className="mr-2 h-5 w-5 text-muted-foreground" />
        Data Preview
        </h3>
        <Badge variant="outline" className="bg-secondary border-border">
        Showing 5 rows
        </Badge>
      </div>

      <div className="border border-border rounded-md overflow-x-auto">
        <div className="w-full min-w-max">
        <ScrollArea className="h-[300px] custom-scrollbar ">
          <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50">
            {columns.map((column) => (
              <TableHead
              key={column}
              className="whitespace-nowrap font-clash"
              >
              {column}
              </TableHead>
            ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewData.map((row, rowIndex) => (
            <TableRow
              key={rowIndex}
              className="border-border hover:bg-secondary/30"
            >
              {columns.map((column) => (
              <TableCell
                key={`${rowIndex}-${column}`}
                className="whitespace-nowrap"
              >
                {formatValue(row[column])}
              </TableCell>
              ))}
            </TableRow>
            ))}
          </TableBody>
          </Table>
        </ScrollArea>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        This preview shows the first 5 rows of the data to be downloaded.
      </p>
      </div>
    );
  };

  return (
    <Card className="analytics-card overflow-hidden">
      <CardHeader className="bg-secondary/30 border-b border-border">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-2xl font-clash">
            <Download className="mr-2 h-6 w-6 text-primary" />
            Export Simulation Data
          </CardTitle>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border bg-secondary hover:bg-secondary/80"
                  onClick={() => router.push("/pages/simulador")}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Simulator
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Return to the simulator page</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <CardDescription className="text-base text-muted-foreground">
          Download the simulation results for detailed analysis.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={loadPreviewData}
                  variant="outline"
                  disabled={isLoading}
                  className="w-full sm:w-auto border-border bg-secondary hover:bg-secondary/80 focus-ring"
                >
                  {isLoading && !showPreview ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Eye className="mr-2 h-4 w-4" />
                      View Preview
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Load simulation data preview</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={downloadCSV}
                  disabled={isLoading}
                  className="w-full sm:w-auto bg-primary hover:bg-primary/80 text-primary-foreground focus-ring"
                >
                  {isLoading && showPreview ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Download Simulation CSV
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Download all data in CSV format</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {renderPreview()}
      </CardContent>

      <CardFooter className="flex flex-col text-sm text-muted-foreground border-t border-border pt-4">
        <p>
          The data includes metrics such as health, resources, harvests, and
          agents' emotional states.
        </p>
      </CardFooter>
    </Card>
  );
}
