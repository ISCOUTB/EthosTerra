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
