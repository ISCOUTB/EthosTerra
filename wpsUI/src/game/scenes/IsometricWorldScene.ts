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
    const map = this.make.tilemap({ key: 'map' })
    const tiles = map.addTilesetImage('tileset', 'tileset')!
    map.createLayer('ground', tiles, 0, 0)

    const offsetX = this.scale.width / 2
    const offsetY = TILE_HEIGHT * 2
    this.cameras.main.setScroll(-offsetX, -offsetY)

    const pfMatrix = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(0))
    Object.values(BUILDING_POSITIONS).forEach(({ col, row }) => {
      pfMatrix[row][col] = 1
    })
    this.pfGrid = new PF.Grid(pfMatrix)
    this.pfFinder = new PF.AStarFinder()

    this.drawParcels()
    this.drawBuildings()

    this.input.on('wheel', (_p: unknown, _go: unknown, _dx: number, dy: number) => {
      const cam = this.cameras.main
      const newZoom = Phaser.Math.Clamp(cam.zoom - dy * 0.001, 0.3, 2)
      cam.setZoom(newZoom)
    })

    this.disconnectWS = useAgentStore.getState().connectWebSocket()
    this.unsubscribe = useAgentStore.subscribe((state) => {
      this.syncAgents(state.agents)
    })

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
      this.add.polygon(x, y - 20, [0, -hh, hw, 0, 0, hh, -hw, 0], buildingColors[key])
        .setDepth(row * 100 + col)
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

      const parcelKey = `parcel_${agentIndex}`
      const parcelRect = this.parcelRects.get(parcelKey)
      if (parcelRect) {
        parcelRect.setFillStyle(SEASON_COLORS[state.currentSeason] ?? SEASON_COLORS['PREPARATION'])
      }

      agentIndex++
    })

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
