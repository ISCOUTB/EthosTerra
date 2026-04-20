import { createCanvas } from 'canvas'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '../public/assets/game')
mkdirSync(OUT, { recursive: true })

// --- TILESET (128×32): 2 tiles isométricos de 64×32 ---
{
  const canvas = createCanvas(128, 32)
  const ctx = canvas.getContext('2d')

  // Tile 0: hierba (izquierda)
  ctx.fillStyle = '#4a7c59'
  ctx.beginPath()
  ctx.moveTo(32, 0); ctx.lineTo(64, 16); ctx.lineTo(32, 32); ctx.lineTo(0, 16)
  ctx.closePath(); ctx.fill()
  ctx.strokeStyle = '#3a6b49'; ctx.lineWidth = 1; ctx.stroke()
  ctx.fillStyle = '#5a8c69'
  ctx.fillRect(20, 13, 2, 2); ctx.fillRect(35, 8, 2, 2); ctx.fillRect(45, 17, 2, 2)

  // Tile 1: camino de tierra (derecha)
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

// --- AGENTS spritesheet (256×48): 8 frames de 32×48 ---
{
  const FRAMES = 8
  const FRAME_W = 32
  const FRAME_H = 48
  const canvas = createCanvas(FRAME_W * FRAMES, FRAME_H)
  const ctx = canvas.getContext('2d')

  const drawPeasant = (x, color, frame) => {
    const isWalk = frame >= 4
    const dir = frame % 4
    ctx.fillStyle = color
    ctx.fillRect(x + 10, 24, 12, 16)
    ctx.fillStyle = '#FFCC80'
    ctx.fillRect(x + 11, 14, 10, 10)
    ctx.fillStyle = '#D4A017'
    ctx.fillRect(x + 8, 10, 16, 4)
    ctx.fillRect(x + 11, 6, 10, 6)
    ctx.fillStyle = '#5D4037'
    if (isWalk) {
      ctx.fillRect(x + 10, 40, 5, 8)
      ctx.fillRect(x + 17, 38, 5, 10)
    } else {
      ctx.fillRect(x + 10, 40, 5, 8)
      ctx.fillRect(x + 17, 40, 5, 8)
    }
    if (dir === 1 || dir === 3) {
      ctx.fillStyle = '#FFCC80'
      ctx.fillRect(dir === 1 ? x + 22 : x + 8, 20, 3, 6)
    }
  }

  for (let f = 0; f < FRAMES; f++) {
    drawPeasant(f * FRAME_W, '#e74c3c', f)
  }

  writeFileSync(join(OUT, 'agents.png'), canvas.toBuffer('image/png'))
  console.log('agents.png generado')
}

// --- BUILDINGS spritesheet (192×80): 3 edificios de 64×80 ---
{
  const canvas = createCanvas(192, 80)
  const ctx = canvas.getContext('2d')

  const shadeColor = (hex, pct) => {
    const n = parseInt(hex.slice(1), 16)
    const r = Math.max(0, Math.min(255, ((n >> 16) & 0xff) + pct))
    const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + pct))
    const b = Math.max(0, Math.min(255, (n & 0xff) + pct))
    return `rgb(${r},${g},${b})`
  }

  const drawBuilding = (x, wallColor, roofColor, label) => {
    ctx.fillStyle = wallColor
    ctx.beginPath()
    ctx.moveTo(x + 32, 32); ctx.lineTo(x + 64, 48); ctx.lineTo(x + 32, 64); ctx.lineTo(x, 48)
    ctx.closePath(); ctx.fill()
    ctx.fillStyle = shadeColor(wallColor, -20)
    ctx.fillRect(x, 48, 32, 20)
    ctx.fillStyle = shadeColor(wallColor, -40)
    ctx.fillRect(x + 32, 48, 32, 20)
    ctx.fillStyle = roofColor
    ctx.beginPath()
    ctx.moveTo(x + 32, 8); ctx.lineTo(x + 64, 24); ctx.lineTo(x + 32, 40); ctx.lineTo(x, 24)
    ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#5D4037'
    ctx.fillRect(x + 26, 56, 12, 12)
    ctx.fillStyle = '#fff'
    ctx.font = '7px monospace'
    ctx.fillText(label, x + 4, 78)
  }

  drawBuilding(0,   '#E8A87C', '#C0392B', 'MERCADO')
  drawBuilding(64,  '#AEC6CF', '#2C3E50', 'BANCO')
  drawBuilding(128, '#B8860B', '#8B4513', 'AUTORIDAD')

  writeFileSync(join(OUT, 'buildings.png'), canvas.toBuffer('image/png'))
  console.log('buildings.png generado')
}

// --- MAP JSON: tilemap 20×20 para Phaser ---
{
  const W = 20, H = 20
  const layer = []
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const isRoad = (r === 11 || c === 10 || r === 3 || c === 3 || c === 16)
      layer.push(isRoad ? 2 : 1)
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
