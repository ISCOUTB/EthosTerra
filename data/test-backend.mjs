/**
 * Suite de verificación del backend WellProdSim
 * Ejecutar: node /tmp/test-backend.mjs
 */
// IP real del contenedor Docker (Next.js standalone no escucha en 127.0.0.1)
const BASE = process.env.BASE_URL || "http://localhost:3000";

const results = [];
let pass = 0, fail = 0;

function log(label, status, body, expectedStatus) {
  const ok = expectedStatus === undefined ? null : status === expectedStatus;
  const tag = ok === null ? "INFO" : ok ? "PASS" : "FAIL";
  if (ok === true) pass++;
  if (ok === false) fail++;
  const preview = String(body).substring(0, 70).replace(/\n/g, " ");
  console.log(`${tag} | ${label.padEnd(40)} | HTTP ${status} | ${preview}`);
  results.push({ label, status, ok });
}

async function post(path, body) {
  return fetch(BASE + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function runTests() {
  console.log("=".repeat(80));
  console.log("  WellProdSim Backend Test Suite");
  console.log("=".repeat(80));

  // ── BLOQUE 1: API /api/simulator ──────────────────────────────────────────

  // T1: GET estado del simulador
  let r = await fetch(`${BASE}/api/simulator`);
  log("T01 GET /api/simulator (estado)", r.status, await r.text(), 200);

  // T2: DELETE sin proceso activo → 404
  r = await fetch(`${BASE}/api/simulator`, { method: "DELETE" });
  log("T02 DELETE /api/simulator (sin proceso)", r.status, await r.text(), 404);

  // T3: POST args válidos → 200 (inicia Java) o 409 (ya corriendo)
  r = await post("/api/simulator", { args: ["-agents", "5", "-years", "1"] });
  const t3body = await r.text();
  const t3ok = r.status === 200 || r.status === 409;
  log("T03 POST args válidos (-agents 5 -years 1)", r.status, t3body, undefined);
  console.log(`     → ${t3ok ? "PASS" : "FAIL"} (esperado 200|409, got ${r.status})`);
  if (t3ok) pass++; else fail++;

  // T4: POST duplicado → 409 (ya hay proceso)
  r = await post("/api/simulator", { args: ["-agents", "5"] });
  log("T04 POST duplicado → 409", r.status, await r.text(), 409);

  // ── BLOQUE 2: Seguridad args ──────────────────────────────────────────────

  // Matar proceso antes de tests de sanitización para no interferir
  await fetch(`${BASE}/api/simulator`, { method: "DELETE" });
  await new Promise((res) => setTimeout(res, 500));

  // T5: Inyección con ; → 400
  r = await post("/api/simulator", { args: ["-agents", "5; rm -rf /"] });
  log("T05 Inyección ; en valor", r.status, await r.text(), 400);

  // T6: Inyección con | → 400
  r = await post("/api/simulator", { args: ["-agents", "5|cat /etc/passwd"] });
  log("T06 Inyección | en valor", r.status, await r.text(), 400);

  // T7: Inyección con $ → 400
  r = await post("/api/simulator", {
    args: ["-agents", "$(cat /etc/passwd)"],
  });
  log("T07 Inyección $ en valor", r.status, await r.text(), 400);

  // T8: Flag desconocido → 400
  r = await post("/api/simulator", { args: ["--unknown-flag", "val"] });
  log("T08 Flag desconocido --unknown-flag", r.status, await r.text(), 400);

  // T9: Flag JVM inyectado → 400
  r = await post("/api/simulator", {
    args: ["-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005"],
  });
  log("T09 Inyección flag JVM -agentlib", r.status, await r.text(), 400);

  // T10: args no es array → 400
  r = await post("/api/simulator", { args: "no soy array" });
  log("T10 args no es array", r.status, await r.text(), 400);

  // T11: args válidos con múltiples flags → 200 o 409
  r = await post("/api/simulator", {
    args: [
      "-agents", "10",
      "-money", "1000",
      "-land", "50",
      "-years", "2",
      "-mode", "test",
    ],
  });
  const t11body = await r.text();
  const t11ok = r.status === 200 || r.status === 409;
  log("T11 POST args múltiples válidos", r.status, t11body, undefined);
  console.log(`     → ${t11ok ? "PASS" : "FAIL"} (esperado 200|409, got ${r.status})`);
  if (t11ok) pass++; else fail++;

  // Matar proceso
  await fetch(`${BASE}/api/simulator`, { method: "DELETE" });

  // ── BLOQUE 3: Seguridad /api/simulator/file ───────────────────────────────

  // T12: Path traversal /etc/passwd → 403
  r = await fetch(`${BASE}/api/simulator/file?path=/etc/passwd`);
  log("T12 PathTraversal /etc/passwd", r.status, await r.text(), 403);

  // T13: Path traversal ../../etc/shadow → 403
  r = await fetch(`${BASE}/api/simulator/file?path=../../etc/shadow`);
  log("T13 PathTraversal ../../etc/shadow", r.status, await r.text(), 403);

  // T14: Path traversal al JAR → 403
  r = await fetch(`${BASE}/api/simulator/file?path=/app/wps-simulator.jar`);
  log("T14 PathTraversal /app/wps-simulator.jar", r.status, await r.text(), 403);

  // T15: Ruta válida dentro de logs (archivo inexistente → 200 con exists:false)
  r = await fetch(
    `${BASE}/api/simulator/file?path=/app/src/wps/logs/wpsSimulator.csv`
  );
  const t15b = await r.text();
  log("T15 Ruta válida en logs", r.status, t15b, 200);

  // T16: Sin parámetro path → 400
  r = await fetch(`${BASE}/api/simulator/file`);
  log("T16 GET /api/simulator/file sin path", r.status, await r.text(), 400);

  // ── BLOQUE 4: CSV endpoint ────────────────────────────────────────────────

  // T17: GET /api/simulator/csv → 404 o 204 (no hay CSV aún)
  r = await fetch(`${BASE}/api/simulator/csv`);
  const t17body = await r.text();
  const t17ok = [200, 204, 404].includes(r.status);
  log("T17 GET /api/simulator/csv (sin datos)", r.status, t17body, undefined);
  if (!t17ok) fail++; else pass++;
  console.log(`     → ${t17ok ? "PASS" : "FAIL"} (esperado 200|204|404, got ${r.status})`);

  // T18: GET /api/getCsv eliminado → 404
  r = await fetch(`${BASE}/api/getCsv`);
  log("T18 GET /api/getCsv (debe ser 404)", r.status, await r.text(), 404);

  // ── BLOQUE 5: Otros endpoints ─────────────────────────────────────────────

  // T19: app-path
  r = await fetch(`${BASE}/api/simulator/app-path`);
  log("T19 GET /api/simulator/app-path", r.status, await r.text(), 200);

  // T20: Página raíz de Next.js
  r = await fetch(`${BASE}/`);
  log("T20 GET / (frontend)", r.status, `html:${r.headers.get("content-type")}`, 200);

  // ── RESUMEN ───────────────────────────────────────────────────────────────
  console.log("=".repeat(80));
  console.log(`TOTAL: ${pass} PASS  |  ${fail} FAIL  |  ${results.length} tests`);
  console.log("=".repeat(80));

  if (fail > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
