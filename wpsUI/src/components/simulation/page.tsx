import { AgentNetworkMap } from "@/components/simulation/AgentNetworkMap";
import { Network } from "lucide-react";

export default function NetworkPage() {
  return (
    <main className="flex min-h-screen flex-col bg-background pt-8 pb-4 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto w-full space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
            <Network className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold font-clash text-white">Topología de Interacciones BESA</h1>
        </div>
        
        {/* Montamos el radar de agentes. Aquí puedes parametrizar la cantidad de familias (ej. 16) */}
        <AgentNetworkMap agentCount={16} />
      </div>
    </main>
  );
}