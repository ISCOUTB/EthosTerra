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
