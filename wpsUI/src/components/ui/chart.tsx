"use client"

import * as React from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export interface ChartConfig {
  [key: string]: {
    label: string
    color: string
  }
}

interface ChartContextValue {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextValue | null>(null)

export function ChartContainer({
  config,
  children,
  className,
}: {
  config: ChartConfig
  children: React.ReactNode
  className?: string
}) {
  return (
    <ChartContext.Provider value={{ config }}>
      <div className={className} style={getChartStyles(config)}>
        {children}
      </div>
    </ChartContext.Provider>
  )
}

export function ChartTooltip({
  children,
  content,
  ...props
}: {
  children: React.ReactNode
  content: React.ReactNode
} & React.ComponentPropsWithoutRef<typeof Tooltip>) {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip {...props}>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent sideOffset={5}>{content}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function ChartTooltipContent({
  indicator = "solid",
  ...props
}: {
  indicator?: "solid" | "dashed"
} & React.ComponentPropsWithoutRef<"div">) {
  const { config } = useChartContext()

  return (
    <div {...props} className="flex flex-col gap-1 rounded-md bg-background p-2 shadow-md">
      {Object.entries(config).map(([key, { label, color }]) => (
        <div key={key} className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{
              background: color,
              outline: indicator === "dashed" ? `1px dashed ${color}` : "none",
              outlineOffset: 2,
            }}
          />
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <span className="text-xs font-bold tabular-nums">{props[key as keyof typeof props]}</span>
        </div>
      ))}
    </div>
  )
}

function useChartContext() {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error("useChartContext must be used within a ChartProvider")
  }
  return context
}

function getChartStyles(config: ChartConfig) {
  return Object.entries(config).reduce((styles, [key, { color }]) => {
    return {
      ...styles,
      [`--color-${key}`]: color,
    }
  }, {})
}

