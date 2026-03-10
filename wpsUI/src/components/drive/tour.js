import { driver } from "driver.js"
import "driver.js/dist/driver.css"

// Constantes para las claves de localStorage
const TOUR_KEYS = {
  SETTINGS: "settings_tour_completed",
  SIMULATION: "simulation_tour_completed",
}

// Variable para controlar si el tour de configuración ya se mostró en esta sesión
let settingsTourShownThisSession = false

// Variable para controlar si el tour de simulación ya se mostró en esta sesión
let simulationTourShownThisSession = false

// Función para verificar si un tour ya fue completado
const isTourCompleted = (tourKey) => {
  if (typeof window === "undefined") return false
  return localStorage.getItem(tourKey) === "true"
}

// Función para marcar un tour como completado
const markTourAsCompleted = (tourKey) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(tourKey, "true")
  }
}

// Función para resetear el estado de un tour (útil para desarrollo o si el usuario quiere verlo de nuevo)
export const resetTour = (tourType) => {
  if (typeof window !== "undefined") {
    const tourKey = tourType === "settings" ? TOUR_KEYS.SETTINGS : TOUR_KEYS.SIMULATION
    localStorage.removeItem(tourKey)
    console.log(`Tour ${tourType} reseteado`)

    // Resetear la variable de sesión correspondiente
    if (tourType === "settings") {
      settingsTourShownThisSession = false
    } else if (tourType === "simulation") {
      simulationTourShownThisSession = false
    }
  }
}

export const startSettingsTour = (forceStart = false) => {
  // Si se fuerza el inicio (botón manual), siempre mostrar
  if (forceStart) {
    console.log("Tour de configuración iniciado manualmente")
    executeSettingsTour()
    return
  }

  // Verificar si ya se mostró en esta sesión
  if (settingsTourShownThisSession) {
    console.log("Tour de configuración ya se mostró en esta sesión")
    return
  }

  // Verificar si el tour ya fue completado permanentemente
  if (isTourCompleted(TOUR_KEYS.SETTINGS)) {
    console.log("Tour de configuración ya fue completado anteriormente")
    return
  }

  // Si llegamos aquí, es la primera vez en esta sesión y el tour no ha sido completado
  console.log("Primera visita a configuración en esta sesión - iniciando tour")
  settingsTourShownThisSession = true
  executeSettingsTour()
}

// Función auxiliar para ejecutar el tour de configuración
const executeSettingsTour = () => {
  // Verificar que estamos en el proceso de renderizado de Electron
  if (typeof window === "undefined" || !document.getElementById("config-agents")) {
    console.log("DOM no está listo o no estamos en el navegador")
    return
  }

  // Función para verificar si los elementos del DOM están listos
  const checkElementsReady = () => {
    const elements = [
      "config-agents",
      "config-money",
      "config-land",
      "config-personality",
      "config-tools",
      "config-seeds",
      "config-water",
      "config-irrigation",
      "config-emotions",
      "config-years",
    ]

    return elements.every((id) => document.getElementById(id))
  }

  // Intentar iniciar el tour cuando los elementos estén listos
  const tryStartTour = () => {
    if (!checkElementsReady()) {
      console.log("Esperando a que los elementos estén listos...")
      setTimeout(tryStartTour, 500)
      return
    }

    console.log("Elementos listos, iniciando tour...")

    const driverObj = driver({
      showProgress: true,
      onDestroyed: () => {
        // Marcar el tour como completado cuando termine
        markTourAsCompleted(TOUR_KEYS.SETTINGS)
        console.log("Tour de configuración completado y guardado")
      },
      steps: [
        {
          element: "#config-agents",
          popover: {
            title: "Number of Agents",
            description:
              "Define how many farmer agents will participate in the simulation. More agents mean more complex interactions.",
            side: "right",
            align: "start",
          },
        },
        {
          element: "#config-money",
          popover: {
            title: "Initial Money",
            description:
              "Define the initial capital for each agent. This affects their initial investment capabilities.",
            side: "left",
            align: "start",
          },
        },
        {
          element: "#config-land",
          popover: {
            title: "Land",
            description:
              "Define the amount of land available for cultivation. More land allows for planting more crops.",
            side: "right",
            align: "start",
          },
        },
        {
          element: "#config-personality",
          popover: {
            title: "Personality",
            description:
              "Define personality traits for each agent. This affects their decision-making and interactions.",
            side: "left",
            align: "start",
          },
        },
        {
          element: "#config-tools",
          popover: {
            title: "Tools",
            description:
              "Define the amount of agricultural tools available. More tools allow for faster and more efficient farming.",
            side: "left",
            align: "start",
          },
        },
        {
          element: "#config-seeds",
          popover: {
            title: "Seeds",
            description: "Define the amount of seeds available for planting. More seeds allow for planting more crops.",
            side: "left",
            align: "start",
          },
        },
        {
          element: "#config-water",
          popover: {
            title: "Water",
            description:
              "Define the amount of water available for irrigation. More water allows for better crop growth.",
            side: "left",
            align: "start",
          },
        },
        {
          element: "#config-irrigation",
          popover: {
            title: "Irrigation",
            description:
              "Define the level of irrigation available. Better irrigation allows for more efficient water usage.",
            side: "left",
            align: "start",
          },
        },
        {
          element: "#config-emotions",
          popover: {
            title: "Emotions",
            description:
              "Define the emotional state of each agent. This affects their decision-making and interactions.",
            side: "left",
            align: "start",
          },
        },
        {
          element: "#config-years",
          popover: {
            title: "Years",
            description:
              "Define the number of years the simulation will run. More years allow for developing long-term strategies.",
            side: "left",
            align: "start",
          },
        },
      ],
    })

    try {
      driverObj.drive()
      console.log("Tour iniciado correctamente")
    } catch (error) {
      console.error("Error al iniciar el tour:", error)
    }
  }

  // Iniciar el proceso de verificación
  tryStartTour()
}

// Función para verificar el estado del tour de configuración en la sesión actual
export const shouldShowSettingsTourThisSession = () => {
  return !settingsTourShownThisSession && !isTourCompleted(TOUR_KEYS.SETTINGS)
}

// Nueva función para el tour de simulación con control de sesión
export const startSimulationTour = (forceStart = false) => {
  // Si se fuerza el inicio (botón manual), siempre mostrar
  if (forceStart) {
    console.log("Tour de simulación iniciado manualmente")
    executeSimulationTour()
    return
  }

  // Verificar si ya se mostró en esta sesión
  if (simulationTourShownThisSession) {
    console.log("Tour de simulación ya se mostró en esta sesión")
    return
  }

  // Verificar si el tour ya fue completado permanentemente
  if (isTourCompleted(TOUR_KEYS.SIMULATION)) {
    console.log("Tour de simulación ya fue completado anteriormente")
    return
  }

  // Si llegamos aquí, es la primera vez en esta sesión y el tour no ha sido completado
  console.log("Primera visita a simulation.tsx en esta sesión - iniciando tour")
  simulationTourShownThisSession = true
  executeSimulationTour()
}

// Función auxiliar para ejecutar el tour de simulación
const executeSimulationTour = () => {
  // Verificar que estamos en el proceso de renderizado de Electron
  if (typeof window === "undefined") {
    console.log("DOM no está listo o no estamos en el navegador")
    return
  }

  // Función para verificar si los elementos del DOM están listos
  const checkElementsReady = () => {
    const elements = ["sidebar", "farm-info", "simulation-map", "stop-button", "tab-content"]
    return elements.every((id) => document.getElementById(id))
  }

  // Intentar iniciar el tour cuando los elementos estén listos
  const tryStartTour = () => {
    if (!checkElementsReady()) {
      console.log("Esperando a que los elementos estén listos...")
      setTimeout(tryStartTour, 500)
      return
    }

    console.log("Elementos listos, iniciando tour de simulación...")

    const driverObj = driver({
      showProgress: true,
      onDestroyed: () => {
        // Marcar el tour como completado cuando termine
        markTourAsCompleted(TOUR_KEYS.SIMULATION)
        console.log("Tour de simulación completado y guardado")
      },
      steps: [
        {
          element: "#sidebar",
          popover: {
            title: "Navigation Sidebar",
            description: "Access different sections of the application from this sidebar menu.",
            side: "right",
            align: "start",
          },
        },
        {
          element: "#farm-info",
          popover: {
            title: "Farm Information",
            description: "View detailed information about the farm and its current status.",
            side: "right",
            align: "start",
          },
        },
        {
          element: "#simulation-map",
          popover: {
            title: "Simulation Map",
            description: "Visual representation of the farm simulation showing the land, crops, and agents.",
            side: "left",
            align: "start",
          },
        },
        {
          element: "#stop-button",
          popover: {
            title: "Stop Simulation",
            description: "Click this button to stop the current simulation and the Java process running it.",
            side: "top",
            align: "center",
          },
        },
        {
          element: "#tab-content",
          popover: {
            title: "Data Visualization",
            description: "View charts and data about the simulation progress and results.",
            side: "top",
            align: "center",
          },
        },
      ],
    })

    try {
      driverObj.drive()
      console.log("Tour de simulación iniciado correctamente")
    } catch (error) {
      console.error("Error al iniciar el tour de simulación:", error)
    }
  }

  // Iniciar el proceso de verificación
  tryStartTour()
}

// Función para verificar si es la primera vez que el usuario visita la simulación
export const isFirstTimeUser = () => {
  return !isTourCompleted(TOUR_KEYS.SIMULATION)
}

// Función para verificar el estado del tour en la sesión actual
export const shouldShowTourThisSession = () => {
  return !simulationTourShownThisSession && !isTourCompleted(TOUR_KEYS.SIMULATION)
}
