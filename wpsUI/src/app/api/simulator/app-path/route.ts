/**
 * /api/simulator/app-path
 *
 * GET → ruta base de la aplicación  (reemplaza: get-app-path)
 *
 * En Docker, process.cwd() apunta a /app (WORKDIR del Dockerfile).
 * El UI construye rutas como:
 *   path.join(appPath, "/src/wps/logs/wpsSimulator.csv")
 * que coincide con WPS_LOGS_PATH=/app/src/wps/logs
 */
import { NextResponse } from "next/server";
// Forzar renderizado dinámico para que process.cwd() se evalúe en runtime
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({ path: process.cwd() });
}
