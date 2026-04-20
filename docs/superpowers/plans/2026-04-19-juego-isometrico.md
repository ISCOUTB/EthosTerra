# EthosTerra Game — Juego 2D Isométrico — Plan de Implementación

> **Para agentes:** USA superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para implementar tarea por tarea. Los pasos usan sintaxis checkbox (`- [ ]`) para seguimiento.

**Goal:** Reemplazar el frontend wpsUI con un juego 2D isométrico pixel art en Phaser 3 donde los agentes campesinos se mueven por un mundo colombiano en tiempo real.

**Architecture:** Phaser 3 corre en un canvas React (75% ancho) consumiendo el mismo WebSocket `:8000` existente. Un store Zustand comparte el estado de agentes entre Phaser y el panel lateral React (25% ancho). El protocolo WebSocket y todas las APIs del backend no cambian.

**Tech Stack:** Next.js 14, Phaser 3.80, Zustand 4, pathfinding.js 0.4, TypeScript, Tailwind CSS

---

## Mapa de archivos

| Acción | Archivo | Responsabilidad |
|--------|---------|-----------------|
| Crear | `wpsUI/src/game/store/agentStore.ts` | Zustand store + WebSocket handler (protocolo q=, j=, d=, e=) |
| Crear | `wpsUI/src/game/world/WorldConfig.ts` | Posiciones de edificios, dimensiones del mapa, colores por agente y temporada |
| Crear | `wpsUI/src/game/entities/AgentSprite.ts` | Clase Phaser.GameObjects.Container: sprite campesino, pathfinding A*, animaciones |
| Crear | `wpsUI/src/game/scenes/IsometricWorldScene.ts` | Escena principal: tilemap, edificios, agentes, cámara, zoom, clic |
| Crear | `wpsUI/src/game/scenes/UIScene.ts` | Overlay HUD: día, año, contador agentes activos |
| Crear | `wpsUI/src/components/game/PhaserGame.tsx` | Wrapper React que monta/desmonta el canvas Phaser |
| Crear | `wpsUI/src/components/game/AgentMiniature.tsx` | Chip clicable por agente para la lista del panel |
| Crear | `wpsUI/src/components/game/AgentPanel.tsx` | Panel lateral: AgentCard + AgentList |
| Modificar | `wpsUI/src/components/simulation/Simulation.tsx` | Reemplazar MapSimulator por layout PhaserGame + AgentPanel |
| Modificar | `wpsUI/package.json` | Añadir phaser, zustand, pathfinding |
| Crear | `wpsUI/public/assets/game/tileset.png` | Tileset isométrico pixel art (64×32px) generado programáticamente |
| Crear | `wpsUI/public/assets/game/agents.png` | Spritesheet campesinos (8 sprites: 4 dirs × idle/walk) |
| Crear | `wpsUI/public/assets/game/buildings.png` | Sprites edificios: mercado, banco, autoridad |
| Crear | `wpsUI/public/assets/game/map.json` | Tilemap Tiled 20×20 con zonas y caminos |

---

## Tarea 1: Instalar dependencias

**Archivos:** `wpsUI/package.json`

- [ ] **Paso 1: Instalar paquetes**

```bash
cd wpsUI
npm install phaser@^3.80.0 zustand@^4.5.0 pathfinding@^0.4.18
npm install --save-dev @types/pathfinding
```

- [ ] **Paso 2: Verificar instalación**

```bash
node -e "require('./node_modules/phaser/dist/phaser.min.js'); console.log('Phaser OK')"
node -e "require('./node_modules/zustand/index.js'); console.log('Zustand OK')"
node -e "require('./node_modules/pathfinding/index.js'); console.log('Pathfinding OK')"
```

Esperado: tres líneas `OK`

- [ ] **Paso 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: agregar dependencias phaser, zustand y pathfinding"
```

---

## Tarea 2: Zustand store + WebSocket handler

**Archivos:**
- Crear: `wpsUI/src/game/store/agentStore.ts`

El store centraliza todo el estado de la simulación. El WebSocket vive aquí — no en componentes React ni en Phaser.

- [ ] **Paso 1: Crear el store**

Crear `wpsUI/src/game/store/agentStore.ts`:

```typescript
import { create } from 'zustand'

export interface AgentState {
  id: string
  health: number
  money: number
  tools: number
  date: string
  landAlias: string
  currentSeason: string
  currentActivity: string
  happinessSadness: number
  hopefulUncertainty: number
  secureInsecure: number
  llmActive: boolean
  llmDecision: string
}

interface SimulationStore {
  agents: Record<string, AgentState>
  selectedAgentId: string | null
  globalDate: string
  simulationRunning: boolean
  setSelectedAgent: (id: string | null) => void
  initAgents: (count: number) => void
  updateAgent: (id: string, state: AgentState) => void
  setGlobalDate: (date: string) => void
  setSimulationRunning: (running: boolean) => void
  connectWebSocket: () => () => void
}

export const useAgentStore = create<SimulationStore>((set, get) => ({
  agents: {},
  selectedAgentId: null,
  globalDate: '',
  simulationRunning: false,

  setSelectedAgent: (id) => set({ selectedAgentId: id }),

  initAgents: (count) => {
    const agents: Record<string, AgentState> = {}
    for (let i = 1; i <= count; i++) {
      const id = `MAS_500PeasantFamily${i}`
      agents[id] = {
        id,
        health: 0, money: 0, tools: 0, date: '',
        landAlias: '', currentSeason: 'PREPARATION',
        currentActivity: 'Resting',
        happinessSadness: 0, hopefulUncertainty: 0, secureInsecure: 0,
        llmActive: false, llmDecision: '',
      }
    }
    set({ agents, simulationRunning: true })
  },

  updateAgent: (id, state) => set((prev) => ({
    agents: { ...prev.agents, [id]: state }
  })),

  setGlobalDate: (date) => set({ globalDate: date }),

  setSimulationRunning: (running) => set({ simulationRunning: running }),

  connectWebSocket: () => {
    let ws: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    const connect = () => {
      ws = new WebSocket('ws://localhost:8000/wpsViewer')

      ws.onopen = () => {
        ws?.send('setup')
      }

      ws.onmessage = (event: MessageEvent) => {
        const prefix = (event.data as string).substring(0, 2)
        const data = (event.data as string).substring(2)

        switch (prefix) {
          case 'q=': {
            const count = parseInt(data, 10)
            get().initAgents(count)
            break
          }
          case 'j=': {
            try {
              const json = JSON.parse(data)
              const parsed = JSON.parse(json.state)
              const agentState: AgentState = {
                id: json.name,
                health: parsed.health ?? 0,
                money: parsed.money ?? 0,
                tools: parsed.tools ?? 0,
                date: parsed.internalCurrentDate ?? '',
                landAlias: parsed.peasantFamilyLandAlias ?? '',
                currentSeason: parsed.assignedLands?.[0]?.currentSeason ?? 'PREPARATION',
                currentActivity: parsed.currentActivity ?? 'Resting',
                happinessSadness: parsed.HappinessSadness ?? 0,
                hopefulUncertainty: parsed.HopefulUncertainty ?? 0,
                secureInsecure: parsed.SecureInsecure ?? 0,
                llmActive: (parsed.health ?? 100) < 30,
                llmDecision: json.taskLog ?? '',
              }
              get().updateAgent(json.name, agentState)
            } catch {}
            break
          }
          case 'd=': {
            get().setGlobalDate(data)
            break
          }
          case 'e=': {
            if (data === 'end') get().setSimulationRunning(false)
            break
          }
        }
      }

      ws.onerror = () => {
        reconnectTimer = setTimeout(connect, 2000)
      }

      ws.onclose = () => {
        reconnectTimer = setTimeout(connect, 2000)
      }
    }

    connect()

    return () => {
      ws?.close()
      if (reconnectTimer) clearTimeout(reconnectTimer)
    }
  },
}))
```

- [ ] **Paso 2: Verificar compilación TypeScript**

```bash
cd wpsUI
npx tsc --noEmit --project tsconfig.json 2>&1 | grep agentStore
```

Esperado: sin errores en agentStore.ts

- [ ] **Paso 3: Commit**

```bash
git add src/game/store/agentStore.ts
git commit -m "feat: agregar zustand store con handler websocket"
```

---

## Tarea 3: WorldConfig — posiciones y colores

**Archivos:**
- Crear: `wpsUI/src/game/world/WorldConfig.ts`

- [ ] **Paso 1: Crear WorldConfig**

Crear `wpsUI/src/game/world/WorldConfig.ts`:

```typescript
// Dimensiones del tilemap isométrico
export const MAP_WIDTH = 20   // tiles en X
export const MAP_HEIGHT = 20  // tiles en Y
export const TILE_WIDTH = 64  // píxeles
export const TILE_HEIGHT = 32 // píxeles (mitad del ancho para isométrico)

// Posición tile de cada edificio (col, row)
export const BUILDING_POSITIONS = {
  MarketPlace:     { col: 10, row: 3  },
  BankOffice:      { col: 3,  row: 10 },
  CivicAuthority:  { col: 16, row: 10 },
} as const

// Parcelas: hasta 20 familias campesinas
// Distribuidas en la zona sur del mapa
export const PARCEL_POSITIONS: Array<{ col: number; row: number }> = [
  { col: 5,  row: 14 }, { col: 7,  row: 14 }, { col: 9,  row: 14 },
  { col: 11, row: 14 }, { col: 13, row: 14 }, { col: 15, row: 14 },
  { col: 5,  row: 16 }, { col: 7,  row: 16 }, { col: 9,  row: 16 },
  { col: 11, row: 16 }, { col: 13, row: 16 }, { col: 15, row: 16 },
  { col: 5,  row: 18 }, { col: 7,  row: 18 }, { col: 9,  row: 18 },
  { col: 11, row: 18 }, { col: 13, row: 18 }, { col: 15, row: 18 },
  { col: 6,  row: 13 }, { col: 14, row: 13 },
]

// Colores únicos por agente (índice 0-19)
export const AGENT_COLORS = [
  0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6,
  0x1abc9c, 0xe67e22, 0x27ae60, 0x2980b9, 0x8e44ad,
  0xc0392b, 0x16a085, 0xd35400, 0x7f8c8d, 0xf1c40f,
  0x2c3e50, 0xe91e63, 0x00bcd4, 0x8bc34a, 0xff5722,
]

// Colores de parcelas por temporada
export const SEASON_COLORS: Record<string, number> = {
  PREPARATION: 0x8B6914,
  PLANTING:    0xa8d5a2,
  GROWTH:      0x27ae60,
  HARVEST:     0xf1c40f,
}

// Destino de cada actividad BDI
export const ACTIVITY_DESTINATION: Record<string, keyof typeof BUILDING_POSITIONS | 'parcel'> = {
  'DoVitalsForSelf':           'parcel',
  'Resting':                   'parcel',
  'HarvestCrops':              'parcel',
  'PlantCrop':                 'parcel',
  'PrepareLand':               'parcel',
  'SellCrop':                  'MarketPlace',
  'ObtainALoan':               'BankOffice',
  'PayDebts':                  'BankOffice',
  'LookForAPlaceToWorkForOther': 'MarketPlace',
  'MakeAHousehold':            'parcel',
}

// Convierte (col, row) a píxeles isométricos en pantalla
export function isoToScreen(col: number, row: number): { x: number; y: number } {
  return {
    x: (col - row) * (TILE_WIDTH / 2),
    y: (col + row) * (TILE_HEIGHT / 2),
  }
}
```

- [ ] **Paso 2: Verificar compilación**

```bash
cd wpsUI
npx tsc --noEmit 2>&1 | grep WorldConfig
```

Esperado: sin errores

- [ ] **Paso 3: Commit**

```bash
git add src/game/world/WorldConfig.ts
git commit -m "feat: agregar WorldConfig con posiciones y colores del mundo"
```

---

## Tarea 4: Assets pixel art — tileset, agentes y edificios

**Archivos:**
- Crear: `wpsUI/public/assets/game/tileset.png`
- Crear: `wpsUI/public/assets/game/agents.png`
- Crear: `wpsUI/public/assets/game/buildings.png`
- Crear: `wpsUI/public/assets/game/map.json`

Los assets se generan programáticamente con un script Node.js usando `canvas` (puro Node, no browser). Esto evita dependencias de herramientas externas.

- [ ] **Paso 1: Instalar canvas para generación de assets**

```bash
cd wpsUI
npm install --save-dev canvas
```

- [ ] **Paso 2: Crear script generador de assets**

Crear `wpsUI/scripts/generate-assets.mjs`:

```javascript
import { createCanvas } from 'canvas'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '../public/assets/game')
mkdirSync(OUT, { recursive: true })

// --- TILESET (128×64): 2 tiles isométricos de 64×32 ---
// tile 0 = hierba, tile 1 = tierra/camino
{
  const canvas = createCanvas(128, 64)
  const ctx = canvas.getContext('2d')

  // Tile 0: hierba
  ctx.fillStyle = '#4a7c59'
  ctx.beginPath()
  ctx.moveTo(32, 0); ctx.lineTo(64, 16); ctx.lineTo(32, 32); ctx.lineTo(0, 16)
  ctx.closePath(); ctx.fill()
  ctx.strokeStyle = '#3a6b49'; ctx.lineWidth = 1; ctx.stroke()
  // Detalle pixel art
  ctx.fillStyle = '#5a8c69'
  ctx.fillRect(20, 13, 2, 2); ctx.fillRect(35, 8, 2, 2); ctx.fillRect(45, 17, 2, 2)

  // Tile 1: camino de tierra
  ctx.save(); ctx.translate(64, 0)
  ctx.fillStyle = '#8B6914'
  ctx.beginPath()
  ctx.moveTo(32, 0); ctx.lineTo(64, 16); ctx.lineTo(32, 32); ctx.lineTo(0, 16)
  ctx.closePath(); ctx.fill()
  ctx.strokeStyle = '#7a5a10'; ctx.lineWidth = 1; ctx.stroke()
  ctx.fillStyle = '#9B7924'
  ctx.fillRect(20, 13, 3, 2); ctx.fillRect(38, 9, 2, 3)
  ctx.restore()

  writeFileSync(join(OUT, 'tileset.png'), canvas.toBuffer('image/png'))
  console.log('tileset.png generado')
}

// --- AGENTS spritesheet (64×64): 8 frames en fila ---
// frames 0-3: idle 4 direcciones (S, E, N, O)
// frames 4-7: walk 4 direcciones
{
  const FRAMES = 8
  const FRAME_W = 32
  const FRAME_H = 48
  const canvas = createCanvas(FRAME_W * FRAMES, FRAME_H)
  const ctx = canvas.getContext('2d')

  const drawPeasant = (ctx, x, color, frame) => {
    const isWalk = frame >= 4
    const dir = frame % 4
    // Cuerpo
    ctx.fillStyle = color
    ctx.fillRect(x + 10, 24, 12, 16)
    // Cabeza
    ctx.fillStyle = '#FFCC80'
    ctx.fillRect(x + 11, 14, 10, 10)
    // Sombrero vueltiao
    ctx.fillStyle = '#D4A017'
    ctx.fillRect(x + 8, 10, 16, 4)
    ctx.fillRect(x + 11, 6, 10, 6)
    // Piernas con animación walk
    ctx.fillStyle = '#5D4037'
    if (isWalk) {
      ctx.fillRect(x + 10, 40, 5, 8)
      ctx.fillRect(x + 17, 38, 5, 10)
    } else {
      ctx.fillRect(x + 10, 40, 5, 8)
      ctx.fillRect(x + 17, 40, 5, 8)
    }
    // Dirección: pequeño detalle de giro
    if (dir === 1 || dir === 3) {
      ctx.fillStyle = '#FFCC80'
      ctx.fillRect(dir === 1 ? x + 22 : x + 8, 20, 3, 6)
    }
  }

  const AGENT_COLORS = [
    '#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6',
    '#1abc9c','#e67e22','#27ae60','#2980b9','#8e44ad',
  ]
  // Usar el primer color para el spritesheet base
  for (let f = 0; f < FRAMES; f++) {
    drawPeasant(ctx, f * FRAME_W, AGENT_COLORS[0], f)
  }

  writeFileSync(join(OUT, 'agents.png'), canvas.toBuffer('image/png'))
  console.log('agents.png generado')
}

// --- BUILDINGS spritesheet (192×80): 3 edificios de 64×80 ---
// edificio 0 = mercado, 1 = banco, 2 = autoridad cívica
{
  const canvas = createCanvas(192, 80)
  const ctx = canvas.getContext('2d')

  const drawBuilding = (ctx, x, wallColor, roofColor, label) => {
    // Base isométrica
    ctx.fillStyle = wallColor
    ctx.beginPath()
    ctx.moveTo(x + 32, 32); ctx.lineTo(x + 64, 48); ctx.lineTo(x + 32, 64); ctx.lineTo(x, 48)
    ctx.closePath(); ctx.fill()
    // Pared frontal
    ctx.fillStyle = shadeColor(wallColor, -20)
    ctx.fillRect(x, 48, 32, 20)
    // Pared lateral
    ctx.fillStyle = shadeColor(wallColor, -40)
    ctx.fillRect(x + 32, 48, 32, 20)
    // Techo isométrico
    ctx.fillStyle = roofColor
    ctx.beginPath()
    ctx.moveTo(x + 32, 8); ctx.lineTo(x + 64, 24); ctx.lineTo(x + 32, 40); ctx.lineTo(x, 24)
    ctx.closePath(); ctx.fill()
    // Puerta
    ctx.fillStyle = '#5D4037'
    ctx.fillRect(x + 26, 56, 12, 12)
    // Label pixel
    ctx.fillStyle = '#fff'
    ctx.font = '7px monospace'
    ctx.fillText(label, x + 8, 78)
  }

  const shadeColor = (hex, pct) => {
    const n = parseInt(hex.slice(1), 16)
    const r = Math.max(0, Math.min(255, ((n >> 16) & 0xff) + pct))
    const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + pct))
    const b = Math.max(0, Math.min(255, (n & 0xff) + pct))
    return `rgb(${r},${g},${b})`
  }

  drawBuilding(ctx, 0,   '#E8A87C', '#C0392B', 'MERCADO')
  drawBuilding(ctx, 64,  '#AEC6CF', '#2C3E50', 'BANCO')
  drawBuilding(ctx, 128, '#B8860B', '#8B4513', 'AUTORIDAD')

  writeFileSync(join(OUT, 'buildings.png'), canvas.toBuffer('image/png'))
  console.log('buildings.png generado')
}

// --- MAP JSON: tilemap 20×20 para Phaser ---
{
  const W = 20, H = 20
  // Capa base: 0=hierba, 1=camino
  const layer = []
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      // Caminos principales: fila 11 y col 10 (cruzan el mapa)
      const isRoad = (r === 11 || c === 10 || r === 3 || c === 3 || c === 16)
      layer.push(isRoad ? 2 : 1) // Tiled usa 1-indexed: 1=hierba, 2=camino
    }
  }

  const mapJson = {
    height: H, width: W,
    tilewidth: 64, tileheight: 32,
    orientation: 'isometric',
    renderorder: 'right-down',
    infinite: false,
    layers: [{
      id: 1, name: 'ground', type: 'tilelayer',
      x: 0, y: 0, width: W, height: H, opacity: 1, visible: true,
      data: layer
    }],
    tilesets: [{
      firstgid: 1, name: 'tileset',
      tilewidth: 64, tileheight: 32,
      imagewidth: 128, imageheight: 32,
      image: 'tileset.png',
      tilecount: 2, columns: 2,
      margin: 0, spacing: 0
    }],
    version: '1.10', tiledversion: '1.10.0', type: 'map',
    nextlayerid: 2, nextobjectid: 1, compressionlevel: -1
  }

  writeFileSync(join(OUT, 'map.json'), JSON.stringify(mapJson, null, 2))
  console.log('map.json generado')
}

console.log('Todos los assets generados en public/assets/game/')
```

- [ ] **Paso 3: Ejecutar generador**

```bash
cd wpsUI
node scripts/generate-assets.mjs
```

Esperado:
```
tileset.png generado
agents.png generado
buildings.png generado
map.json generado
Todos los assets generados en public/assets/game/
```

- [ ] **Paso 4: Verificar archivos generados**

```bash
ls -lh wpsUI/public/assets/game/
```

Esperado: tileset.png, agents.png, buildings.png, map.json — todos mayores de 0 bytes

- [ ] **Paso 5: Commit**

```bash
git add public/assets/game/ scripts/generate-assets.mjs
git commit -m "feat: generar assets pixel art para el juego isométrico"
```

---

## Tarea 5: AgentSprite — entidad Phaser del campesino

**Archivos:**
- Crear: `wpsUI/src/game/entities/AgentSprite.ts`

- [ ] **Paso 1: Crear AgentSprite**

Crear `wpsUI/src/game/entities/AgentSprite.ts`:

```typescript
import Phaser from 'phaser'
import { isoToScreen, TILE_WIDTH, TILE_HEIGHT } from '../world/WorldConfig'

const MOVE_SPEED = 80 // píxeles por segundo

export class AgentSprite {
  private scene: Phaser.Scene
  private sprite: Phaser.GameObjects.Rectangle
  private label: Phaser.GameObjects.Text
  private aura: Phaser.GameObjects.Ellipse
  private container: Phaser.GameObjects.Container
  private tween: Phaser.Tweens.Tween | null = null
  private color: number
  public agentId: string
  private currentCol: number
  private currentRow: number

  constructor(
    scene: Phaser.Scene,
    agentId: string,
    color: number,
    col: number,
    row: number,
    onClick: (agentId: string) => void
  ) {
    this.scene = scene
    this.agentId = agentId
    this.color = color
    this.currentCol = col
    this.currentRow = row

    const { x, y } = isoToScreen(col, row)

    // Aura LLM (oculta por defecto)
    this.aura = scene.add.ellipse(0, 0, 28, 14, color, 0.3)
    this.aura.setVisible(false)

    // Sprite del campesino (rectángulo pixel art)
    this.sprite = scene.add.rectangle(0, -16, 12, 20, color)
    this.sprite.setInteractive({ cursor: 'pointer' })

    // Sombrero (detalle visual)
    const hat = scene.add.rectangle(0, -26, 16, 4, 0xD4A017)

    // Label con nombre
    this.label = scene.add.text(0, -36, agentId.replace('MAS_500PeasantFamily', 'F'), {
      fontSize: '8px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 2, y: 1 },
    }).setOrigin(0.5)

    this.container = scene.add.container(x, y, [this.aura, this.sprite, hat, this.label])
    this.container.setDepth(row * MAP_HEIGHT_DEPTH + col)

    this.sprite.on('pointerdown', () => onClick(agentId))
    this.sprite.on('pointerover', () => this.sprite.setFillStyle(0xffffff))
    this.sprite.on('pointerout', () => this.sprite.setFillStyle(this.color))
  }

  moveTo(col: number, row: number) {
    if (col === this.currentCol && row === this.currentRow) return

    this.currentCol = col
    this.currentRow = row

    const { x, y } = isoToScreen(col, row)
    const distance = Math.hypot(x - this.container.x, y - this.container.y)
    const duration = (distance / MOVE_SPEED) * 1000

    this.tween?.stop()
    this.tween = this.scene.tweens.add({
      targets: this.container,
      x, y,
      duration: Math.max(300, duration),
      ease: 'Linear',
      onUpdate: () => {
        this.container.setDepth(this.currentRow * 100 + this.currentCol)
      }
    })
  }

  setLLMActive(active: boolean) {
    this.aura.setVisible(active)
    if (active) {
      this.scene.tweens.add({
        targets: this.aura,
        alpha: { from: 0.1, to: 0.6 },
        duration: 600,
        yoyo: true,
        repeat: -1,
      })
    } else {
      this.scene.tweens.killTweensOf(this.aura)
    }
  }

  getContainer() { return this.container }

  destroy() {
    this.tween?.stop()
    this.container.destroy()
  }
}

const MAP_HEIGHT_DEPTH = 100
```

- [ ] **Paso 2: Verificar compilación**

```bash
cd wpsUI
npx tsc --noEmit 2>&1 | grep AgentSprite
```

Esperado: sin errores

- [ ] **Paso 3: Commit**

```bash
git add src/game/entities/AgentSprite.ts
git commit -m "feat: agregar clase AgentSprite con movimiento y aura LLM"
```

---

## Tarea 6: IsometricWorldScene — escena principal

**Archivos:**
- Crear: `wpsUI/src/game/scenes/IsometricWorldScene.ts`

- [ ] **Paso 1: Crear la escena**

Crear `wpsUI/src/game/scenes/IsometricWorldScene.ts`:

```typescript
import Phaser from 'phaser'
import PF from 'pathfinding'
import {
  MAP_WIDTH, MAP_HEIGHT, TILE_WIDTH, TILE_HEIGHT,
  BUILDING_POSITIONS, PARCEL_POSITIONS, AGENT_COLORS,
  SEASON_COLORS, ACTIVITY_DESTINATION, isoToScreen
} from '../world/WorldConfig'
import { AgentSprite } from '../entities/AgentSprite'
import { useAgentStore } from '../store/agentStore'

export class IsometricWorldScene extends Phaser.Scene {
  private agentSprites: Map<string, AgentSprite> = new Map()
  private parcelRects: Map<string, Phaser.GameObjects.Polygon> = new Map()
  private pfGrid!: PF.Grid
  private pfFinder!: PF.AStarFinder
  private unsubscribe: (() => void) | null = null
  private disconnectWS: (() => void) | null = null

  constructor() {
    super({ key: 'IsometricWorldScene' })
  }

  preload() {
    this.load.image('tileset', '/assets/game/tileset.png')
    this.load.image('buildings', '/assets/game/buildings.png')
    this.load.tilemapTiledJSON('map', '/assets/game/map.json')
  }

  create() {
    // Tilemap
    const map = this.make.tilemap({ key: 'map' })
    const tiles = map.addTilesetImage('tileset', 'tileset')!
    map.createLayer('ground', tiles, 0, 0)

    // Offset para centrar el mapa isométrico
    const offsetX = this.scale.width / 2
    const offsetY = TILE_HEIGHT * 2
    this.cameras.main.setScroll(-offsetX, -offsetY)

    // Pathfinding grid (0=walkable, 1=obstacle)
    const pfMatrix = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(0))
    // Marcar edificios como obstáculos
    Object.values(BUILDING_POSITIONS).forEach(({ col, row }) => {
      pfMatrix[row][col] = 1
    })
    this.pfGrid = new PF.Grid(pfMatrix)
    this.pfFinder = new PF.AStarFinder()

    // Dibujar parcelas coloreadas
    this.drawParcels()

    // Dibujar edificios
    this.drawBuildings()

    // Zoom con rueda del mouse
    this.input.on('wheel', (_p: unknown, _go: unknown, _dx: number, dy: number) => {
      const cam = this.cameras.main
      const newZoom = Phaser.Math.Clamp(cam.zoom - dy * 0.001, 0.3, 2)
      cam.setZoom(newZoom)
    })

    // Conectar WebSocket y suscribir al store
    this.disconnectWS = useAgentStore.getState().connectWebSocket()
    this.unsubscribe = useAgentStore.subscribe((state) => {
      this.syncAgents(state.agents)
    })

    // Lanzar UIScene encima
    this.scene.launch('UIScene')
  }

  private drawParcels() {
    PARCEL_POSITIONS.forEach((pos, i) => {
      const { x, y } = isoToScreen(pos.col, pos.row)
      const hw = TILE_WIDTH / 2
      const hh = TILE_HEIGHT / 2
      const points = [0, -hh, hw, 0, 0, hh, -hw, 0]
      const rect = this.add.polygon(x, y, points, SEASON_COLORS['PREPARATION'])
        .setDepth(pos.row * 100 + pos.col - 1)
      this.parcelRects.set(`parcel_${i}`, rect)
    })
  }

  private drawBuildings() {
    const buildingKeys = Object.keys(BUILDING_POSITIONS) as Array<keyof typeof BUILDING_POSITIONS>
    const buildingColors: Record<string, number> = {
      MarketPlace: 0xE8A87C,
      BankOffice: 0xAEC6CF,
      CivicAuthority: 0xB8860B,
    }
    buildingKeys.forEach((key) => {
      const { col, row } = BUILDING_POSITIONS[key]
      const { x, y } = isoToScreen(col, row)
      const hw = TILE_WIDTH / 2
      const hh = TILE_HEIGHT / 2
      // Base del edificio
      this.add.polygon(x, y - 20, [0, -hh, hw, 0, 0, hh, -hw, 0], buildingColors[key])
        .setDepth(row * 100 + col)
      // Label
      this.add.text(x, y - 40, key.replace(/([A-Z])/g, ' $1').trim(), {
        fontSize: '8px', color: '#ffffff',
        backgroundColor: '#000000aa', padding: { x: 2, y: 1 },
      }).setOrigin(0.5).setDepth(row * 100 + col + 1)
    })
  }

  private syncAgents(agents: Record<string, import('../store/agentStore').AgentState>) {
    const agentIds = Object.keys(agents)
    let agentIndex = 0

    agentIds.forEach((id) => {
      const state = agents[id]
      const color = AGENT_COLORS[agentIndex % AGENT_COLORS.length]
      const parcelPos = PARCEL_POSITIONS[agentIndex % PARCEL_POSITIONS.length]

      // Crear sprite si no existe
      if (!this.agentSprites.has(id)) {
        const sprite = new AgentSprite(
          this,
          id,
          color,
          parcelPos.col,
          parcelPos.row,
          (agentId) => useAgentStore.getState().setSelectedAgent(agentId)
        )
        this.agentSprites.set(id, sprite)
      }

      const sprite = this.agentSprites.get(id)!

      // Determinar destino según actividad
      const destination = ACTIVITY_DESTINATION[state.currentActivity] ?? 'parcel'
      let targetCol: number, targetRow: number

      if (destination === 'parcel') {
        targetCol = parcelPos.col
        targetRow = parcelPos.row
      } else {
        const bPos = BUILDING_POSITIONS[destination]
        targetCol = bPos.col
        targetRow = bPos.row
      }

      sprite.moveTo(targetCol, targetRow)
      sprite.setLLMActive(state.llmActive)

      // Actualizar color de la parcela según temporada
      const parcelKey = `parcel_${agentIndex}`
      const parcelRect = this.parcelRects.get(parcelKey)
      if (parcelRect) {
        parcelRect.setFillStyle(SEASON_COLORS[state.currentSeason] ?? SEASON_COLORS['PREPARATION'])
      }

      agentIndex++
    })

    // Eliminar sprites de agentes que ya no existen
    this.agentSprites.forEach((sprite, id) => {
      if (!agents[id]) {
        sprite.destroy()
        this.agentSprites.delete(id)
      }
    })
  }

  shutdown() {
    this.unsubscribe?.()
    this.disconnectWS?.()
  }
}
```

- [ ] **Paso 2: Verificar compilación**

```bash
cd wpsUI
npx tsc --noEmit 2>&1 | grep -E "IsometricWorldScene|error"
```

Esperado: sin errores de tipo

- [ ] **Paso 3: Commit**

```bash
git add src/game/scenes/IsometricWorldScene.ts
git commit -m "feat: agregar IsometricWorldScene con pathfinding y sincronización de agentes"
```

---

## Tarea 7: UIScene — overlay HUD

**Archivos:**
- Crear: `wpsUI/src/game/scenes/UIScene.ts`

- [ ] **Paso 1: Crear UIScene**

Crear `wpsUI/src/game/scenes/UIScene.ts`:

```typescript
import Phaser from 'phaser'
import { useAgentStore } from '../store/agentStore'

export class UIScene extends Phaser.Scene {
  private dayText!: Phaser.GameObjects.Text
  private agentsText!: Phaser.GameObjects.Text
  private unsubscribe: (() => void) | null = null

  constructor() {
    super({ key: 'UIScene' })
  }

  create() {
    const bg = this.add.rectangle(0, 0, this.scale.width, 24, 0x000000, 0.75)
    bg.setOrigin(0, 0).setScrollFactor(0)

    this.dayText = this.add.text(12, 6, 'Día: —', {
      fontSize: '11px', color: '#2ecc71', fontFamily: 'monospace'
    }).setScrollFactor(0)

    this.agentsText = this.add.text(200, 6, 'Agentes: 0', {
      fontSize: '11px', color: '#3498db', fontFamily: 'monospace'
    }).setScrollFactor(0)

    this.unsubscribe = useAgentStore.subscribe((state) => {
      this.dayText.setText(`Fecha: ${state.globalDate || '—'}`)
      const activeCount = Object.keys(state.agents).length
      this.agentsText.setText(`Agentes: ${activeCount}`)
    })
  }

  shutdown() {
    this.unsubscribe?.()
  }
}
```

- [ ] **Paso 2: Verificar compilación**

```bash
cd wpsUI
npx tsc --noEmit 2>&1 | grep UIScene
```

Esperado: sin errores

- [ ] **Paso 3: Commit**

```bash
git add src/game/scenes/UIScene.ts
git commit -m "feat: agregar UIScene con HUD de fecha y contador de agentes"
```

---

## Tarea 8: PhaserGame — wrapper React

**Archivos:**
- Crear: `wpsUI/src/components/game/PhaserGame.tsx`

Phaser requiere `'use client'` y no puede importarse en SSR. Se usa `dynamic import` para cargarlo solo en el browser.

- [ ] **Paso 1: Crear PhaserGame.tsx**

Crear `wpsUI/src/components/game/PhaserGame.tsx`:

```typescript
'use client'

import { useEffect, useRef } from 'react'
import type Phaser from 'phaser'

export default function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return

    let game: Phaser.Game

    const initPhaser = async () => {
      const Phaser = (await import('phaser')).default
      const { IsometricWorldScene } = await import('@/game/scenes/IsometricWorldScene')
      const { UIScene } = await import('@/game/scenes/UIScene')

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: containerRef.current!,
        width: containerRef.current!.clientWidth,
        height: containerRef.current!.clientHeight,
        backgroundColor: '#1a1a2e',
        scene: [IsometricWorldScene, UIScene],
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        pixelArt: true,
      }

      game = new Phaser.Game(config)
      gameRef.current = game
    }

    initPhaser()

    return () => {
      game?.destroy(true)
      gameRef.current = null
    }
  }, [])

  return <div ref={containerRef} className="w-full h-full" />
}
```

- [ ] **Paso 2: Verificar compilación**

```bash
cd wpsUI
npx tsc --noEmit 2>&1 | grep PhaserGame
```

Esperado: sin errores

- [ ] **Paso 3: Commit**

```bash
git add src/components/game/PhaserGame.tsx
git commit -m "feat: agregar wrapper React PhaserGame con dynamic import"
```

---

## Tarea 9: AgentMiniature + AgentPanel

**Archivos:**
- Crear: `wpsUI/src/components/game/AgentMiniature.tsx`
- Crear: `wpsUI/src/components/game/AgentPanel.tsx`

- [ ] **Paso 1: Crear AgentMiniature.tsx**

Crear `wpsUI/src/components/game/AgentMiniature.tsx`:

```typescript
'use client'
import { AGENT_COLORS } from '@/game/world/WorldConfig'

interface Props {
  agentId: string
  index: number
  selected: boolean
  onClick: () => void
}

export function AgentMiniature({ agentId, index, selected, onClick }: Props) {
  const color = AGENT_COLORS[index % AGENT_COLORS.length]
  const hex = `#${color.toString(16).padStart(6, '0')}`
  const label = agentId.replace('MAS_500PeasantFamily', 'F')

  return (
    <button
      onClick={onClick}
      title={agentId}
      className={`flex items-center justify-center w-9 h-9 rounded text-white text-xs font-mono font-bold border-2 transition-all ${
        selected ? 'border-white scale-110' : 'border-transparent hover:border-gray-400'
      }`}
      style={{ backgroundColor: hex }}
    >
      {label}
    </button>
  )
}
```

- [ ] **Paso 2: Crear AgentPanel.tsx**

Crear `wpsUI/src/components/game/AgentPanel.tsx`:

```typescript
'use client'
import { useAgentStore } from '@/game/store/agentStore'
import { AgentMiniature } from './AgentMiniature'

export function AgentPanel() {
  const agents = useAgentStore((s) => s.agents)
  const selectedId = useAgentStore((s) => s.selectedAgentId)
  const setSelected = useAgentStore((s) => s.setSelectedAgent)
  const selected = selectedId ? agents[selectedId] : null

  const agentList = Object.values(agents)

  return (
    <aside className="w-64 min-w-[256px] h-full bg-[#0d0d1a] border-l border-[#2ecc71]/30 flex flex-col overflow-hidden font-mono">
      {/* Cabecera */}
      <div className="px-3 py-2 bg-[#2ecc71]/10 border-b border-[#2ecc71]/30">
        <span className="text-[#2ecc71] text-xs uppercase tracking-wider">
          {selected
            ? selected.id.replace('MAS_500PeasantFamily', 'Familia #')
            : 'Selecciona un agente'}
        </span>
        {selected && (
          <div className="text-[10px] text-gray-400 mt-0.5">
            ● {selected.currentActivity}
          </div>
        )}
      </div>

      {/* Detalles del agente seleccionado */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3 text-xs">
        {selected ? (
          <>
            {/* Salud */}
            <div>
              <div className="flex justify-between text-gray-400 mb-1">
                <span>❤ Salud</span>
                <span>{Math.round(selected.health)}%</span>
              </div>
              <div className="w-full h-2 bg-gray-700 rounded">
                <div
                  className="h-2 rounded transition-all"
                  style={{
                    width: `${Math.min(100, selected.health)}%`,
                    backgroundColor: selected.health > 50 ? '#2ecc71' : selected.health > 25 ? '#f39c12' : '#e74c3c'
                  }}
                />
              </div>
            </div>

            {/* Dinero */}
            <div className="flex justify-between">
              <span className="text-gray-400">💰 Dinero</span>
              <span className="text-[#f1c40f]">
                ${selected.money.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
              </span>
            </div>

            {/* Emociones */}
            <div>
              <div className="text-gray-400 mb-1 uppercase text-[10px] tracking-wider">Emociones</div>
              <div className="space-y-0.5">
                <div className="flex justify-between">
                  <span>😊 Alegría</span>
                  <span className="text-[#2ecc71]">{selected.happinessSadness.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>😟 Tristeza</span>
                  <span className="text-[#e74c3c]">{(1 - selected.happinessSadness).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>😰 Incertidumbre</span>
                  <span className="text-[#f39c12]">{selected.hopefulUncertainty.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Tierra */}
            <div>
              <div className="text-gray-400 uppercase text-[10px] tracking-wider mb-1">Tierra</div>
              <div>{selected.landAlias || '—'}</div>
              <div className="text-gray-400">{selected.currentSeason}</div>
            </div>

            {/* Herramientas */}
            <div className="flex justify-between">
              <span className="text-gray-400">🪛 Herramientas</span>
              <span>{selected.tools}</span>
            </div>

            {/* LLM activo */}
            {selected.llmActive && (
              <div className="border border-[#9b59b6]/50 rounded p-2 bg-[#9b59b6]/10">
                <div className="text-[#9b59b6] text-[10px] uppercase tracking-wider mb-1">🤖 LLM activo</div>
                <div className="text-[10px] text-gray-300 line-clamp-3">{selected.llmDecision || 'Procesando...'}</div>
              </div>
            )}
          </>
        ) : (
          <div className="text-gray-500 text-center mt-8">
            Haz clic en un campesino del mapa
          </div>
        )}
      </div>

      {/* Lista de miniaturas */}
      <div className="border-t border-[#2ecc71]/20 p-2">
        <div className="text-[10px] text-gray-500 mb-2 uppercase tracking-wider">
          Agentes ({agentList.length})
        </div>
        <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
          {agentList.map((agent, i) => (
            <AgentMiniature
              key={agent.id}
              agentId={agent.id}
              index={i}
              selected={agent.id === selectedId}
              onClick={() => setSelected(agent.id)}
            />
          ))}
        </div>
      </div>
    </aside>
  )
}
```

- [ ] **Paso 3: Verificar compilación**

```bash
cd wpsUI
npx tsc --noEmit 2>&1 | grep -E "AgentMiniature|AgentPanel"
```

Esperado: sin errores

- [ ] **Paso 4: Commit**

```bash
git add src/components/game/AgentMiniature.tsx src/components/game/AgentPanel.tsx
git commit -m "feat: agregar AgentPanel y AgentMiniature con estado Zustand"
```

---

## Tarea 10: Simulation.tsx — nuevo layout

**Archivos:**
- Modificar: `wpsUI/src/components/simulation/Simulation.tsx`

Reemplazar el layout actual (Google Maps + tarjetas) por `PhaserGame` + `AgentPanel`.

- [ ] **Paso 1: Reemplazar Simulation.tsx**

Reemplazar el contenido completo de `wpsUI/src/components/simulation/Simulation.tsx`:

```typescript
'use client'

import dynamic from 'next/dynamic'
import { AgentPanel } from '@/components/game/AgentPanel'
import { Button } from '../ui/button'
import { StopCircle } from 'lucide-react'

// PhaserGame solo corre en el cliente
const PhaserGame = dynamic(() => import('@/components/game/PhaserGame'), { ssr: false })

const StopButton = () => {
  const handleStop = async () => {
    try {
      await window.electronAPI.killJavaProcess()
    } catch {}
    try {
      await fetch('/api/simulator', { method: 'DELETE' })
    } catch {}
  }

  return (
    <Button
      onClick={handleStop}
      className="absolute top-8 right-72 z-10 flex items-center gap-1 bg-[#2664eb] hover:bg-[#1e4bbf] text-white font-bold"
    >
      <StopCircle className="w-5 h-5" />
      Detener
    </Button>
  )
}

export default function MapSimulator() {
  return (
    <div className="flex h-screen w-screen bg-[#1a1a2e] overflow-hidden relative">
      {/* Canvas del juego Phaser ocupa el espacio restante */}
      <div className="flex-1 h-full">
        <PhaserGame />
      </div>
      {/* Panel lateral React */}
      <AgentPanel />
      {/* Botón stop flotante */}
      <StopButton />
    </div>
  )
}
```

- [ ] **Paso 2: Verificar que la página del simulador sigue apuntando al mismo componente**

```bash
grep -n "MapSimulator\|Simulation" wpsUI/src/app/pages/simulador/page.tsx
```

Esperado: `import MapSimulator from "@/components/simulation/Simulation"` — sin cambios necesarios

- [ ] **Paso 3: Verificar compilación completa**

```bash
cd wpsUI
npx tsc --noEmit 2>&1
```

Esperado: 0 errores

- [ ] **Paso 4: Commit**

```bash
git add src/components/simulation/Simulation.tsx
git commit -m "feat: reemplazar MapSimulator con layout Phaser + panel lateral"
```

---

## Tarea 11: Prueba end-to-end

- [ ] **Paso 1: Arrancar el frontend**

```bash
cd wpsUI
npm run dev
```

Abrir `http://localhost:3000`

- [ ] **Paso 2: Verificar la página de inicio carga sin errores**

En DevTools (F12 → Console): no debe haber errores de importación ni de TypeScript.

- [ ] **Paso 3: Navegar a /simulador**

Esperado: mapa isométrico oscuro con tiles de hierba y caminos visibles. Panel lateral a la derecha con "Selecciona un agente".

- [ ] **Paso 4: Lanzar simulación desde /settings**

Configurar: `agentes=5, dinero=2000000, tierra=2, emociones=1, años=1`
Hacer clic en "Iniciar simulación".

Esperado en `/simulador`:
- 5 sprites de colores distintos aparecen en sus parcelas
- El HUD superior muestra la fecha de simulación
- Los sprites se mueven hacia edificios según su actividad

- [ ] **Paso 5: Interacción con panel**

Hacer clic en un sprite → panel lateral muestra nombre, salud, dinero, emociones.
Hacer clic en una miniatura → verifica que cambia el agente seleccionado.

- [ ] **Paso 6: Verificar zoom**

Usar la rueda del mouse sobre el mapa → el mapa hace zoom in/out.

- [ ] **Paso 7: Verificar que /analytics, /settings, /dataExport no tienen regresiones**

Navegar a cada ruta y verificar que cargan correctamente.

- [ ] **Paso 8: Commit final**

```bash
git add .
git commit -m "feat: juego 2D isométrico EthosTerra completado"
```

---

## Notas para el implementador

- **Phaser y SSR**: Phaser accede a `window` y no puede importarse en SSR. Usar siempre `dynamic(..., { ssr: false })` o `import()` dentro de `useEffect`.
- **Zustand fuera de React**: `useAgentStore.getState()` y `useAgentStore.subscribe()` funcionan fuera de componentes React — úsalos en las escenas Phaser.
- **WebSocket único**: El WebSocket se conecta UNA vez en el store. No conectar WebSocket adicionales en Phaser ni en componentes React.
- **Assets en `/public`**: Phaser carga assets via URL. Deben estar en `wpsUI/public/assets/game/` para que Next.js los sirva en `/assets/game/`.
- **Tipos de pathfinding**: Si `@types/pathfinding` no existe, agregar `declare module 'pathfinding'` en un archivo `wpsUI/src/types/pathfinding.d.ts`.
