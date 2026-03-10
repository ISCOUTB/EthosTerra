/**
 * /api/simulator/csv
 *
 * GET    → leer contenido del CSV   (reemplaza: read-csv)
 * DELETE → vaciar el CSV            (reemplaza: clear-csv)
 */
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const LOGS_DIR =
  process.env.WPS_LOGS_PATH ?? path.join(process.cwd(), "src", "wps", "logs");
const CSV_PATH = path.join(LOGS_DIR, "wpsSimulator.csv");

// ----- GET: leer CSV -----
export async function GET() {
  try {
    if (!fs.existsSync(CSV_PATH)) {
      return NextResponse.json(
        { success: false, error: "Archivo no encontrado" },
        { status: 404 },
      );
    }
    const data = fs.readFileSync(CSV_PATH, "utf-8");
    if (!data.trim()) {
      return NextResponse.json(
        { success: false, error: "Archivo CSV vacío" },
        { status: 204 },
      );
    }
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 },
    );
  }
}

// ----- DELETE: vaciar CSV -----
export async function DELETE() {
  try {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
    fs.writeFileSync(CSV_PATH, "");
    return NextResponse.json({ success: true, path: CSV_PATH });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 },
    );
  }
}
