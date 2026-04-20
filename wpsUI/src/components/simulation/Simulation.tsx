'use client'

import dynamic from 'next/dynamic'
import { AgentPanel } from '@/components/game/AgentPanel'
import { Button } from '../ui/button'
import { StopCircle } from 'lucide-react'

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
      <div className="flex-1 h-full">
        <PhaserGame />
      </div>
      <AgentPanel />
      <StopButton />
    </div>
  )
}
