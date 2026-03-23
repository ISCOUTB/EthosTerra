/**
 * /api/simulator
 *
 * GET  → estado del proceso Java  (reemplaza: check-java-process)
 * POST → lanzar simulación        (reemplaza: execute-exe)
 * DELETE → matar proceso Java     (reemplaza: kill-java-process)
 */
import { NextRequest, NextResponse } from "next/server";
import { execFile, exec } from "child_process";
import path from "path";
import {
  getJavaProcess,
  setJavaProcess,
  clearJavaProcess,
} from "@/lib/javaProcessState";

const JAR_PATH =
  process.env.WPS_JAR_PATH ?? path.join(process.cwd(), "wps-simulator.jar");
const JAVA_BIN = "java";

// ---------------------------------------------------------------------------
// Sanitización de argumentos del simulador
// ---------------------------------------------------------------------------
const ALLOWED_FLAGS = new Set([
  "-agents",
  "-money",
  "-land",
  "-personality",
  "-tools",
  "-seeds",
  "-water",
  "-irrigation",
  "-emotions",
  "-training",
  "-world",
  "-years",
  "-env",
  "-mode",
  "-nodes",
  "-variance",
  "-criminality",
  "-step",
  "-perturbation",
  "-trainingslots",
]);

// Caracteres que indican intento de inyección de comandos
const DANGEROUS_CHARS = /[;|&$`\\]/;

// Valores válidos: alfanuméricos + . _ / - (sin espacios embebidos)
const SAFE_VALUE = /^[\w./_-]+$/;

interface SanitizeResult {
  valid: boolean;
  cleaned: string[];
  error?: string;
}

function sanitizeArgs(raw: unknown): SanitizeResult {
  if (!Array.isArray(raw)) {
    return { valid: false, cleaned: [], error: "args debe ser un array" };
  }
  const cleaned: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") {
      return {
        valid: false,
        cleaned: [],
        error: "Cada argumento debe ser string",
      };
    }
    if (DANGEROUS_CHARS.test(item)) {
      return {
        valid: false,
        cleaned: [],
        error: `Argumento contiene caracteres no permitidos: "${item}"`,
      };
    }
    if (item.startsWith("-")) {
      if (!ALLOWED_FLAGS.has(item)) {
        return {
          valid: false,
          cleaned: [],
          error: `Flag no reconocido: "${item}". Flags permitidos: ${[...ALLOWED_FLAGS].join(", ")}`,
        };
      }
    } else {
      // Valor asociado al flag anterior
      if (!SAFE_VALUE.test(item)) {
        return {
          valid: false,
          cleaned: [],
          error: `Valor de argumento no válido: "${item}"`,
        };
      }
    }
    cleaned.push(item);
  }
  return { valid: true, cleaned };
}

// ----- GET: estado del proceso -----
export async function GET() {
  const running = getJavaProcess() !== null;
  return NextResponse.json({ running });
}

// ----- POST: iniciar simulación (no bloqueante — responde de inmediato) -----
export async function POST(req: NextRequest) {
  // Ignoramos exePath (parámetro Electron) y usamos siempre el JAR de la variable de entorno
  const body = await req.json().catch(() => ({}));

  // Validar y limpiar argumentos antes de pasarlos a execFile
  const { valid, cleaned, error: argsError } = sanitizeArgs(body.args ?? []);
  if (!valid) {
    return NextResponse.json(
      { success: false, error: argsError ?? "Argumentos inválidos" },
      { status: 400 },
    );
  }

  // Si ya hay un proceso corriendo, rechazar
  if (getJavaProcess() !== null) {
    return NextResponse.json(
      { success: false, error: "Ya hay una simulación en curso" },
      { status: 409 },
    );
  }

  // Lanzar el JAR de forma asíncrona (fire-and-forget)
  // El cliente detecta el fin mediante polling a GET /api/simulator
  const child = execFile(
    JAVA_BIN,
    ["-jar", JAR_PATH, ...cleaned],
    { maxBuffer: 50 * 1024 * 1024, detached: process.platform !== "win32" },
    (error, _stdout, stderr) => {
      clearJavaProcess();
      if (error && !(stderr && stderr.includes("Unrecognized option"))) {
        console.error("[wpsSimulator] error:", stderr || error.message);
      }
    },
  );
  setJavaProcess(child);

  return NextResponse.json({ success: true, started: true, pid: child.pid });
}

// ----- DELETE: matar proceso Java -----
export async function DELETE() {
  const child = getJavaProcess();
  if (!child) {
    return NextResponse.json(
      { success: false, message: "No hay proceso Java activo" },
      { status: 404 },
    );
  }

  try {
    // En Linux dentro del contenedor usamos kill; en Windows taskkill
    if (process.platform === "win32") {
      if (child) exec(`taskkill /pid ${child.pid} /f /t`);
      exec(`taskkill /F /FI "WINDOWTITLE eq wps-simulator*" /T`);
    } else {
      if (child && child.pid) {
        try { process.kill(-child.pid, "SIGKILL"); } catch(e) {}
      }
      // Fallback definitivo (evita zombies de Hot Reloads de Next.js)
      exec(`pkill -9 -f "wps-simulator.jar"`);
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    // ESRCH = el proceso ya terminó por sí solo; el estado sigue siendo sucio
    // → limpiar de todas formas y devolver success (el objetivo se logró)
    if (err.code === "ESRCH") {
      return NextResponse.json({
        success: true,
        message: "Proceso ya había terminado",
      });
    }
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 },
    );
  } finally {
    // Limpiar el handle en cualquier caso: killed o ya-muerto
    clearJavaProcess();
  }
}
