import Papa from "papaparse";
import moment from "moment";

export interface CSVData {
  [key: string]: string | number;
}

export const fetchCSVData = async (): Promise<CSVData[]> => {
  try {
    const response = await window.electronAPI.readCsv();
    if (!response.success || !response.data) {
      throw new Error(response.error || "Error al leer el archivo CSV");
    }

    console.log("Contenido del archivo CSV:", response.data); // Log para depuración

    return new Promise((resolve, reject) => {
      if (!response.data) {
        return reject(new Error("El archivo CSV está vacío o no se pudo leer."));
      }

      Papa.parse(response.data, {
        header: true,
        complete: (results) => resolve(results.data as CSVData[]),
        error: (error: Error) => reject(error), // Especificar el tipo de 'error'
      });
    });
  } catch (error) {
    console.error("Error al leer el archivo CSV:", error);
    return [];
  }
};

export const processCSVData = (data: CSVData[], parameter: string) => {
  return data.map((row) => ({
    date: moment(row.internalCurrentDate as string).format("YYYY-MM-DD"),
    value: Number.parseFloat(row[parameter] as string) || 0,
  }));
};

export const calculateStatistics = (data: CSVData[]) => {
  const values = data.map((row) => row.value as number);
  const avg = values.reduce((acc, val) => acc + val, 0) / values.length || 0;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const stdDev =
    Math.sqrt(
      values.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) /
        values.length
    ) || 0;

  return { avg, max, min, stdDev };
};
