import Phaser from 'phaser'
import { isoToScreen } from '../world/WorldConfig'

const MOVE_SPEED = 80
const MAP_HEIGHT_DEPTH = 100

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

    this.aura = scene.add.ellipse(0, 0, 28, 14, color, 0.3)
    this.aura.setVisible(false)

    this.sprite = scene.add.rectangle(0, -16, 12, 20, color)
    this.sprite.setInteractive({ cursor: 'pointer' })

    const hat = scene.add.rectangle(0, -26, 16, 4, 0xD4A017)

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
        this.container.setDepth(this.currentRow * MAP_HEIGHT_DEPTH + this.currentCol)
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
