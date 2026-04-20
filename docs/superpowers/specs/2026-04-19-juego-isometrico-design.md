# EthosTerra Game — Juego 2D Isométrico

**Fecha:** 2026-04-19  
**Autor:** Jairo Serrano  
**Estado:** Aprobado para implementación

---

## Contexto

El frontend actual `wpsUI` muestra la simulación de familias campesinas colombianas como tarjetas con barras de progreso y un mapa Google Maps con polígonos de terreno. Si bien funcional, esta interfaz no comunica la riqueza narrativa de la simulación BDI: los agentes toman decisiones complejas (sembrar, cosechar, pedir préstamos, descansar) pero el usuario solo ve números.

La nueva interfaz reemplaza `wpsUI` con un juego 2D isométrico en pixel art donde los agentes campesinos son personajes visibles que se mueven por un mundo que representa una vereda colombiana. El objetivo es hacer la simulación más comprensible, empática y presentable en contextos académicos (TEMSCON-LATAM, SIDRePUJ/ISCOUTB).

**El protocolo WebSocket y todas las APIs del backend no cambian.**

---

## Decisiones de diseño

| Decisión | Elección | Razón |
|----------|----------|-------|
| Estilo visual | Pixel Art 2D isométrico | Performante con muchos agentes, implementable sin artistas 3D |
| Motor de juego | Phaser 3 | Soporte nativo tilemaps isométricos, A* pathfinding, sprites animados |
| UI de datos | Panel lateral React (25%) | Consistente con wpsUI actual, fácil de mantener en React/Tailwind |
| State management | Zustand | Compartir estado agentes entre Phaser y React sin prop drilling |
| Plataforma | Next.js (navegador) | Mantiene arquitectura existente, sin Electron |
| Mapa | Tiled JSON (~20×20 tiles) | Editor visual gratuito, formato estándar para Phaser |

---

## Arquitectura

```
Browser → Next.js (puerto 3000)
└── /simulador → GamePage
    ├── <PhaserGame> (75% ancho — canvas)
    │   ├── IsometricWorldScene   tiles + edificios + agentes + pathfinding
    │   ├── UIScene               HUD overlay: día, año, contadores
    │   └── WebSocket client      ws://localhost:8000/wpsViewer
    └── <AgentPanel> (25% ancho — React)
        ├── AgentCard             agente seleccionado: salud, dinero, emociones, actividad
        └── AgentList             miniaturas clicables de todos los agentes
```

**Flujo de datos:**
1. WebSocket recibe `q=`, `j=`, `d=`, `e=` (protocolo existente sin cambios)
2. `agentStore` (Zustand) centraliza el estado de todos los agentes
3. `IsometricWorldScene` lee el store cada frame → mueve y anima sprites
4. `AgentPanel` (React) se suscribe al store → muestra agente seleccionado

---

## El Mundo Isométrico

**Tileset:** 64×32px isométrico, estilo pixel art (LPC OpenGameArt CC-BY-SA o generado)

**Zonas del mapa (~20×20 tiles):**

| Zona | Elemento | Agentes que van ahí |
|------|----------|-------------------|
| Centro | `MarketPlace` 🏪 | Cuando `currentActivity = Selling` |
| Norte | `BankOffice` 🏦 | Cuando `currentActivity = ObtainingLoan` |
| Este | `CivicAuthority` 🏛️ | Cuando `currentActivity = CivicDuty` |
| Distribuidas | Parcelas `AgroEcosystem` | Asignadas por `peasantFamilyLandAlias` |
| Red | Caminos de tierra | Rutas A* entre zonas |

**Coloración de parcelas por temporada:**
- `PREPARATION` → marrón
- `PLANTING` → verde claro
- `GROWTH` → verde oscuro  
- `HARVEST` → amarillo dorado

**Sprites de agentes:**
- Personaje pixel art con sombrero (referencia cultural colombiana)
- Color único por agente (máx. 20 colores distintos)
- 4 frames de animación: idle, caminar N/S/E/O
- Nombre flotante sobre el sprite
- Al activarse modo LLM híbrido: aura parpadeante sobre el sprite

**Movimiento:**
- A* pathfinding via librería `pathfinding.js`
- El destino se determina por `currentActivity` del mensaje `j=` del WebSocket
- Velocidad de movimiento: proporcional al tick de simulación (no tiempo real)

---

## Panel Lateral

```
┌─────────────────────────┐
│ FAMILIA CAMPESINA #3    │
│ ● Cosechando maíz       │
├─────────────────────────┤
│ ❤ Salud   [████████░] 82%│
│ 💰 Dinero  $1,250,000   │
├─────────────────────────┤
│ EMOCIONES               │
│ 😊 Alegría    0.68      │
│ 😟 Tristeza   0.12      │
│ 😰 Miedo      0.08      │
├─────────────────────────┤
│ Tierra: Lote B          │
│ Temporada: COSECHA      │
│ Herramientas: 3         │
├─────────────────────────┤
│ 🤖 LLM activo           │  ← solo si hybrid mode
│ "Decidió vender ahora"  │
├─────────────────────────┤
│ [F1][F2][F3]...[F20]    │  ← miniaturas clicables
└─────────────────────────┘
```

**Interacciones:**
- Clic en sprite → selecciona agente en panel lateral
- Clic en miniatura → selecciona agente + centra cámara en él
- Rueda del mouse → zoom in/out del mapa isométrico

**HUD superior (UIScene Phaser):**
- Día de simulación, año en curso, agentes activos

---

## Estructura de Archivos

```
wpsUI/src/
├── app/pages/simulador/page.tsx        ← reemplaza MapSimulator por GamePage
├── components/
│   ├── game/
│   │   ├── PhaserGame.tsx              ← wrapper React que monta canvas Phaser
│   │   ├── AgentPanel.tsx              ← panel lateral
│   │   └── AgentMiniature.tsx          ← chip clicable por agente
│   └── simulation/
│       └── Simulation.tsx              ← layout: PhaserGame + AgentPanel
├── game/
│   ├── scenes/
│   │   ├── IsometricWorldScene.ts      ← mundo, tiles, edificios, A*, animaciones
│   │   └── UIScene.ts                  ← overlay HUD
│   ├── entities/
│   │   └── AgentSprite.ts              ← sprite campesino, pathfinding, animación
│   ├── world/
│   │   └── WorldConfig.ts              ← posiciones edificios, dimensiones mapa
│   └── store/
│       └── agentStore.ts               ← Zustand store + WebSocket handler
└── assets/game/
    ├── tileset.png
    ├── agents.png                      ← spritesheet campesinos (4 dir × 4 frames)
    ├── buildings.png                   ← mercado, banco, autoridad
    └── map.json                        ← tilemap Tiled exportado
```

**Archivos que NO cambian:** `/settings`, `/analytics`, `/dataExport`, API routes, simulador Java, sidecar Python, protocolo WebSocket.

---

## Dependencias nuevas

```json
{
  "phaser": "^3.80.0",
  "zustand": "^4.5.0",
  "pathfinding": "^0.4.18"
}
```

---

## Assets

- **Tileset:** LPC Terrains de OpenGameArt (CC-BY-SA) o generado programáticamente como SVG→PNG
- **Sprites campesinos:** generados como pixel art (sombrero vueltiao, ruana), 4 direcciones × 4 frames
- **Edificios:** sprites isométricos pixel art para mercado, banco, autoridad cívica

---

## Verificación end-to-end

1. `make up` — levantar stack completo
2. `http://localhost:3000` → mapa isométrico con tiles cargado
3. `/settings` → configurar 5 agentes → lanzar simulación
4. Sprites aparecen en el mapa y se mueven entre edificios según actividad
5. Clic en sprite → panel lateral muestra datos en tiempo real
6. Correr 1 año simulado → emociones y dinero cambian en el panel
7. Activar agente en crisis (salud < 30) → verificar aura LLM en sprite
