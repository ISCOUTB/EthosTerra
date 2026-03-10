"use client"

import type React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Parameter {
  key: string
  description: string
}

const parameters: Parameter[] = [
  { key: "Timestamp", description: "Marca de tiempo del evento" },
  { key: "HappinessSadness", description: "Nivel de felicidad o tristeza del agente" },
  { key: "HopefulUncertainty", description: "Nivel de esperanza o incertidumbre del agente" },
  { key: "SecureInsecure", description: "Nivel de seguridad o inseguridad del agente" },
  { key: "money", description: "Cantidad de dinero del agente" },
  { key: "health", description: "Nivel de salud del agente" },
  { key: "currentSeason", description: "Temporada actual en el sistema" },
  { key: "robberyAccount", description: "Contador de robos sufridos" },
  { key: "purpose", description: "Propósito actual del agente" },
  { key: "peasantFamilyAffinity", description: "Afinidad del agente con su familia" },
  { key: "peasantLeisureAffinity", description: "Afinidad del agente con actividades de ocio" },
  { key: "peasantFriendsAffinity", description: "Afinidad del agente con sus amigos" },
  { key: "currentPeasantLeisureType", description: "Tipo de actividad de ocio actual" },
  { key: "currentResourceNeededType", description: "Tipo de recurso necesitado actualmente" },
  { key: "currentDay", description: "Día actual en la simulación" },
  { key: "internalCurrentDate", description: "Fecha actual en la simulación" },
  { key: "toPay", description: "Cantidad a pagar" },
  { key: "peasantKind", description: "Tipo de campesino" },
  { key: "peasantFamilyMinimalVital", description: "Mínimo vital de la familia campesina" },
  { key: "peasantFamilyLandAlias", description: "Alias de la tierra de la familia campesina" },
  { key: "currentActivity", description: "Actividad actual del agente" },
  { key: "farm", description: "Estado de la granja del agente" },
  { key: "loanAmountToPay", description: "Cantidad de préstamo a pagar" },
  { key: "tools", description: "Herramientas disponibles" },
  { key: "seeds", description: "Semillas disponibles" },
  { key: "waterAvailable", description: "Agua disponible" },
  { key: "pesticidesAvailable", description: "Pesticidas disponibles" },
  { key: "HarvestedWeight", description: "Peso de la cosecha actual" },
  { key: "totalHarvestedWeight", description: "Peso total de las cosechas" },
  { key: "contractor", description: "Contratista actual" },
  { key: "daysToWorkForOther", description: "Días de trabajo para otros" },
  { key: "Agent", description: "Identificador del agente" },
  { key: "Emotion", description: "Emoción actual del agente" },
  { key: "peasantFamilyHelper", description: "Ayudante de la familia campesina" },
  { key: "haveEmotions", description: "Indica si el agente tiene emociones" },
]

interface ParameterMenuProps {
  onSelectParameter: (parameter: string) => void
}

const ParameterMenu: React.FC<ParameterMenuProps> = ({ onSelectParameter }) => {
  return (
    <div className="w-full max-w-md">
      <Select onValueChange={onSelectParameter}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Selecciona un parámetro" />
        </SelectTrigger>
        <SelectContent>
          {parameters.map((param) => (
            <SelectItem key={param.key} value={param.key}>
              <div className="flex flex-col">
                <span className="font-medium">{param.key}</span>
                <span className="text-sm text-gray-500">{param.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default ParameterMenu

