/**
 * /api/simulator/file?path=<ruta>
 *
 * GET    → verificar si existe el archivo  (reemplaza: file-exists)
 * DELETE → eliminar el archivo             (reemplaza: delete-file)
 *
 * Seguridad: solo se permiten rutas dentro de WPS_LOGS_PATH.
 * Cualquier intento de acceder fuera devuelve 403 Forbidden.
 */
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const LOGS_DIR = path.resolve(
  process.env.WPS_LOGS_PATH ?? path.join(process.cwd(), "src", "wps", "logs"),
);

/**
 * Verifica que `filePath` resuelve dentro de LOGS_DIR.
 * Previene path traversal (../) y rutas absolutas externas.
 */
function isPathSafe(filePath: string): boolean {
  // Rechazo rápido ante presencia de ".." (defensa en profundidad)
  if (filePath.includes("..")) return false;
  const resolved = path.resolve(filePath);
  // La ruta resuelta debe estar dentro de LOGS_DIR
  return resolved.startsWith(LOGS_DIR + path.sep) || resolved === LOGS_DIR;
}

// ----- GET: ¿existe el archivo? -----
export async function GET(req: NextRequest) {
  const filePath = req.nextUrl.searchParams.get("path");
  if (!filePath) {
    return NextResponse.json(
      { exists: false, error: "Parámetro path requerido" },
      { status: 400 },
    );
  }
  if (!isPathSafe(filePath)) {
    return NextResponse.json(
      {
        exists: false,
        error: "Acceso denegado: ruta fuera del directorio de logs",
      },
      { status: 403 },
    );
  }
  return NextResponse.json({ exists: fs.existsSync(filePath) });
}

// ----- DELETE: eliminar archivo -----
export async function DELETE(req: NextRequest) {
  const filePath = req.nextUrl.searchParams.get("path");
  if (!filePath) {
    return NextResponse.json(
      { success: false, error: "Parámetro path requerido" },
      { status: 400 },
    );
  }
  if (!isPathSafe(filePath)) {
    return NextResponse.json(
      {
        success: false,
        error: "Acceso denegado: ruta fuera del directorio de logs",
      },
      { status: 403 },
    );
  }
  try {
    await fs.promises.unlink(filePath);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 },
    );
  }
}
