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
