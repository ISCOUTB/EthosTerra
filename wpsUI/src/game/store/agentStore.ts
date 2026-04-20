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
