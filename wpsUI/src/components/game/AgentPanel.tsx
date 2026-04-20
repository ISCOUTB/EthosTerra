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

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3 text-xs">
        {selected ? (
          <>
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

            <div className="flex justify-between">
              <span className="text-gray-400">💰 Dinero</span>
              <span className="text-[#f1c40f]">
                ${selected.money.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
              </span>
            </div>

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

            <div>
              <div className="text-gray-400 uppercase text-[10px] tracking-wider mb-1">Tierra</div>
              <div>{selected.landAlias || '—'}</div>
              <div className="text-gray-400">{selected.currentSeason}</div>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">🪛 Herramientas</span>
              <span>{selected.tools}</span>
            </div>

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
