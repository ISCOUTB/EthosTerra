export const parameters = {
  integer: [
    {
      key: "health",
      color: "#45B7D1",
      description: "Nivel de salud del agente en una escala numérica.",
    },
    {
      key: "currentSeason",
      color: "#F7B731",
      description: "Temporada actual en el sistema (1-4).",
    },
    {
      key: "robberyAccount",
      color: "#5D9CEC",
      description: "Número de robos sufridos por el agente.",
    },
    {
      key: "currentDay",
      color: "#AC92EC",
      description: "Día actual en la simulación.",
    },
    {
      key: "toPay",
      color: "#EC87C0",
      description: "Cantidad que el agente debe pagar.",
    },
    {
      key: "peasantFamilyMinimalVital",
      color: "#5D9CEC",
      description: "Mínimo vital de la familia campesina.",
    },
    {
      key: "loanAmountToPay",
      color: "#48CFAD",
      description: "Cantidad de préstamo que el agente debe pagar.",
    },
    {
      key: "tools",
      color: "#A0D468",
      description: "Número de herramientas disponibles.",
    },
    {
      key: "seeds",
      color: "#ED5565",
      description: "Número de semillas disponibles.",
    },
    {
      key: "pesticidesAvailable",
      color: "#FC6E51",
      description: "Cantidad de pesticidas disponibles.",
    },
    {
      key: "HarvestedWeight",
      color: "#FFCE54",
      description: "Peso de la cosecha actual.",
    },
    {
      key: "totalHarvestedWeight",
      color: "#CCD1D9",
      description: "Peso total de todas las cosechas.",
    },
    {
      key: "daysToWorkForOther",
      color: "#4FC1E9",
      description: "Días que el agente trabaja para otros.",
    },
    {
      key: "Emotion",
      color: "#37BC9B",
      description:
        "Valor numérico que representa la emoción actual del agente.",
    },
  ],
  float: [
    {
      key: "HappinessSadness",
      color: "#DA4453",
      description: "Nivel de felicidad o tristeza del agente.",
    },
    {
      key: "HopefulUncertainty",
      color: "#967ADC",
      description: "Nivel de esperanza o incertidumbre del agente.",
    },
    {
      key: "SecureInsecure",
      color: "#D770AD",
      description: "Nivel de seguridad o inseguridad del agente.",
    },
    {
      key: "money",
      color: "#656D78",
      description: "Cantidad de dinero que posee el agente.",
    },
    {
      key: "peasantFamilyAffinity",
      color: "#AAB2BD",
      description: "Afinidad del agente con su familia campesina.",
    },
    {
      key: "peasantLeisureAffinity",
      color: "#E9573F",
      description: "Afinidad del agente con actividades de ocio.",
    },
    {
      key: "peasantFriendsAffinity",
      color: "#8CC152",
      description: "Afinidad del agente con sus amigos.",
    },
    {
      key: "waterAvailable",
      color: "#5D9CEC",
      description: "Cantidad de agua disponible para el agente.",
    },
  ],
} as const;

export type ParameterType = keyof typeof parameters;

export const predefinedFloatVariables = [
  { key: "efficiency", label: "Efficiency" },
  { key: "productivity", label: "Productivity" },
  { key: "happiness", label: "Happiness" },
  { key: "energy", label: "Energy" },
  { key: "tasks", label: "Tasks Completed" },
  { key: "agents", label: "Active Agents" },
  { key: "errors", label: "Errors" },
  { key: "interactions", label: "Interactions" },
];
