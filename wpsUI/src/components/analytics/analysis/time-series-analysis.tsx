"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  ComposedChart,
  Scatter,
} from "recharts"

const floatVariables = [
  { key: "HappinessSadness", color: "#DA4453", label: "Happiness/Sadness" },
  { key: "HopefulUncertainty", color: "#967ADC", label: "Hopeful/Uncertainty" },
  { key: "SecureInsecure", color: "#D770AD", label: "Secure/Insecure" },
  { key: "money", color: "#656D78", label: "Money" },
  { key: "peasantFamilyAffinity", color: "#AAB2BD", label: "Family Affinity" },
  { key: "peasantLeisureAffinity", color: "#E9573F", label: "Leisure Affinity" },
  { key: "peasantFriendsAffinity", color: "#8CC152", label: "Friends Affinity" },
  { key: "waterAvailable", color: "#5D9CEC", label: "Water Available" },
  { key: "HarvestedWeight", color: "#FFCE54", label: "Harvested Weight" },
  { key: "seeds", color: "#ED5565", label: "Seeds" },
  { key: "totalHarvestedWeight", color: "#CCD1D9", label: "Total Harvested Weight" },
]

export function TimeSeriesAnalysis({ data }: { data: any[] }) {
  const [selectedVariable, setSelectedVariable] = useState<string>(floatVariables[0].key)

  
  const [showCriticalPoints, setShowCriticalPoints] = useState(false)
  const [showChangeRate, setShowChangeRate] = useState(false)

  
  const [debugInfo, setDebugInfo] = useState({
    criticalPointsCount: 0,
    changeRateValuesCount: 0,
  })

  
  const variableData = useMemo(() => {
    
    return data.map((item) => {
      const val = item[selectedVariable]
      return typeof val === "number" && !isNaN(val) ? val : null
    })
  }, [data, selectedVariable])

  
  const changeRateData = useMemo(() => {
    if (variableData.length < 2) return Array(variableData.length).fill(null)

    return variableData.map((value, index) => {
      if (index === 0 || value === null || variableData[index - 1] === null) {
        return null
      }

      
      if (variableData[index - 1] === 0) {
        return value > 0 ? 100 : value < 0 ? -100 : 0 
      }

      // Tasa de cambio como porcentaje
      return ((value - variableData[index - 1]) / Math.abs(variableData[index - 1])) * 100
    })
  }, [variableData])

  // Detectar puntos críticos (cambios significativos en la tendencia)
  const criticalPoints = useMemo(() => {
    // Solo proceder si tenemos suficientes datos válidos
    const validData = variableData.filter((val) => val !== null)
    if (validData.length < 5) return []

    const points = []
    const threshold = 0.2 // Hacer el umbral más sensible (era 0.4)

    // Ventana deslizante para detectar cambios de dirección significativos
    for (let i = 2; i < variableData.length - 2; i++) {
      // Solo analizar si tenemos valores válidos
      if (variableData[i] === null || variableData[i - 2] === null || variableData[i + 2] === null) {
        continue
      }

      const prevSlope = variableData[i] - variableData[i - 2]
      const nextSlope = variableData[i + 2] - variableData[i]

      // Si hay un cambio de dirección significativo (de subida a bajada o viceversa)
      if ((prevSlope > 0 && nextSlope < 0) || (prevSlope < 0 && nextSlope > 0)) {
        const changeIntensity = Math.abs((nextSlope - prevSlope) / (Math.abs(prevSlope) + Math.abs(nextSlope) + 0.001))

        // Solo considerar cambios significativos
        if (changeIntensity > threshold) {
          points.push({
            index: i,
            value: variableData[i],
            type: prevSlope > 0 ? "peak" : "valley",
          })
        }
      }
    }

    return points
  }, [variableData])

  // Actualizar información de depuración cuando cambien los datos relevantes
  useEffect(() => {
    setDebugInfo({
      criticalPointsCount: criticalPoints.length,
      changeRateValuesCount: changeRateData.filter((val) => val !== null).length,
    })
  }, [criticalPoints, changeRateData])

  
  const calculateTrendLine = (data: (number | null)[]): { slope: number; intercept: number } => {
    
    const validData = data.filter((val) => val !== null) as number[]

    if (validData.length < 2) {
      return { slope: 0, intercept: 0 }
    }

    const n = validData.length
    const indices = Array.from({ length: n }, (_, i) => i)

    const sumX = indices.reduce((sum, x) => sum + x, 0)
    const sumY = validData.reduce((sum, y) => sum + y, 0)
    const sumXY = indices.reduce((sum, x, i) => sum + x * validData[i], 0)
    const sumXX = indices.reduce((sum, x) => sum + x * x, 0)

    
    const denominator = n * sumXX - sumX * sumX
    const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0
    const intercept = (sumY - slope * sumX) / n

    return { slope, intercept }
  }

  
  const trendLine = useMemo(() => {
    return calculateTrendLine(variableData)
  }, [variableData])

  
  const trendData = useMemo(() => {
    return data.map((_, i) => trendLine.intercept + trendLine.slope * i)
  }, [data, trendLine])

  
  const trendAnalysis = useMemo(() => {
    if (trendLine.slope > 0.5) return "strong upward"
    if (trendLine.slope > 0.1) return "moderate upward"
    if (trendLine.slope < -0.5) return "strong downward"
    if (trendLine.slope < -0.1) return "moderate downward"
    return "relatively stable"
  }, [trendLine])

  
  const detectCycles = useMemo(() => {
    let changes = 0
    let validPoints = 0

    for (let i = 1; i < variableData.length; i++) {
      
      if (variableData[i] === null || variableData[i - 1] === null || (i > 1 && variableData[i - 2] === null)) {
        continue
      }

      validPoints++

      if (
        (variableData[i]! > variableData[i - 1]! && variableData[i - 1]! <= (i > 1 ? variableData[i - 2]! : 0)) ||
        (variableData[i]! < variableData[i - 1]! && variableData[i - 1]! >= (i > 1 ? variableData[i - 2]! : 0))
      ) {
        changes++
      }
    }

    const cycleRatio = validPoints > 0 ? changes / validPoints : 0
    if (cycleRatio > 0.4) return "highly cyclical"
    if (cycleRatio > 0.2) return "moderately cyclical"
    return "not significantly cyclical"
  }, [variableData])

  
  const volatility = useMemo(() => {
    const validData = variableData.filter((val) => val !== null) as number[]

    if (validData.length < 2) {
      return { level: "Unknown", value: 0 }
    }

    const mean = validData.reduce((sum, val) => sum + val, 0) / validData.length

    
    if (mean === 0) {
      return { level: "Unknown", value: 0 }
    }

    const squaredDiffs = validData.map((val) => Math.pow(val - mean, 2))
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / validData.length
    const stdDev = Math.sqrt(variance)
    const cv = Math.abs(stdDev / mean)

    let level = "Low"
    if (cv > 0.3) level = "High"
    else if (cv > 0.1) level = "Moderate"

    return { level, value: cv }
  }, [variableData])

  
  const changeStats = useMemo(() => {
    const validData = variableData.filter((val) => val !== null) as number[]
    if (validData.length < 2) return { percentChange: 0, firstHalfMean: 0, secondHalfMean: 0 }

    const firstHalf = validData.slice(0, Math.floor(validData.length / 2))
    const secondHalf = validData.slice(Math.floor(validData.length / 2))
    const firstHalfMean = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length
    const secondHalfMean = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length
    const percentChange = firstHalfMean !== 0 ? ((secondHalfMean - firstHalfMean) / Math.abs(firstHalfMean)) * 100 : 0

    return { percentChange, firstHalfMean, secondHalfMean }
  }, [variableData])

  
  const extremes = useMemo(() => {
    const validData = variableData.filter((val) => val !== null) as number[]
    if (validData.length === 0) return { max: 0, min: 0, maxIndex: -1, minIndex: -1 }

    const max = Math.max(...validData)
    const min = Math.min(...validData)

    
    let maxIndex = -1
    let minIndex = -1

    for (let i = 0; i < variableData.length; i++) {
      if (variableData[i] === max) maxIndex = i
      if (variableData[i] === min) minIndex = i
    }

    return { max, min, maxIndex, minIndex }
  }, [variableData])

  
  const criticalPointsData = useMemo(() => {
    if (!showCriticalPoints || criticalPoints.length === 0) return []

    return criticalPoints.map((point) => ({
      name: data[point.index]?.name,
      [selectedVariable]: point.value,
      pointType: point.type,
    }))
  }, [showCriticalPoints, criticalPoints, data, selectedVariable])

  
  const chartData = useMemo(() => {
    if (data.length === 0) {
      return []
    }

    return data.map((item, index) => {
      return {
        ...item,
        [selectedVariable]: variableData[index],
        trendLine: trendData[index],
        changeRate: showChangeRate ? changeRateData[index] : undefined,
      }
    })
  }, [data, variableData, selectedVariable, trendData, changeRateData, showChangeRate])

 
  const getLabel = (key: string): string => {
    return floatVariables.find((v) => v.key === key)?.label || key
  }

  
  const getColor = (key: string): string => {
    return floatVariables.find((v) => v.key === key)?.color || "#8884d8"
  }

  
  const changeRateDomain = useMemo(() => {
    if (!showChangeRate) return [0, 0]

    const validRates = changeRateData.filter((rate) => rate !== null) as number[]
    if (validRates.length === 0) return [-10, 10]

    const min = Math.min(...validRates)
    const max = Math.max(...validRates)
    const padding = Math.max(10, Math.abs(max - min) * 0.2)

    return [Math.floor(min - padding), Math.ceil(max + padding)]
  }, [showChangeRate, changeRateData])

  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <CardHeader className="pb-2">
        <CardTitle className="dark:text-white">Time Series Analysis: {getLabel(selectedVariable)}</CardTitle>
        <CardDescription className="dark:text-gray-400">
          Analyze how {getLabel(selectedVariable)} changes over time
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <Label htmlFor="variable-select" className="dark:text-white mb-2 block">
              Variable to Analyze
            </Label>
            <Select value={selectedVariable} onValueChange={setSelectedVariable}>
              <SelectTrigger id="variable-select" className="dark:bg-gray-700 dark:text-white">
                <SelectValue placeholder="Select variable" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800">
                {floatVariables.map((variable) => (
                  <SelectItem key={variable.key} value={variable.key} className="dark:text-white">
                    {variable.label || variable.key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Detector de puntos críticos */}
          <div className="flex items-center space-x-2">
            <Switch id="show-critical-points" checked={showCriticalPoints} onCheckedChange={setShowCriticalPoints} />
            <Label htmlFor="show-critical-points" className="dark:text-white">
              Highlight Critical Points
              <span className="text-xs ml-1 opacity-60">({debugInfo.criticalPointsCount})</span>
            </Label>
          </div>

          {/* Mostrar cambio porcentual */}
          <div className="flex items-center space-x-2">
            <Switch id="show-change-rate" checked={showChangeRate} onCheckedChange={setShowChangeRate} />
            <Label htmlFor="show-change-rate" className="dark:text-white">
              Show Change Rate
              <span className="text-xs ml-1 opacity-60">({debugInfo.changeRateValuesCount})</span>
            </Label>
          </div>
        </div>

        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 40, right: 60, left: 20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.5} />
              <XAxis
                dataKey="name"
                stroke="#888"
                label={{
                  value: "Time",
                  position: "bottom",
                  fill: "#888",
                  offset: 0,
                }}
              />
              <YAxis
                stroke="#888"
                label={{
                  value: getLabel(selectedVariable),
                  angle: -90,
                  position: "left",
                  fill: "#888",
                }}
              />

              {showChangeRate && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#ff00ff"
                  label={{
                    value: "Change Rate (%)",
                    angle: 90,
                    position: "right",
                    fill: "#ff00ff",
                  }}
                  domain={changeRateDomain}
                />
              )}

              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "6px",
                  color: "#fff",
                }}
                formatter={(value, name, props) => {
                  if (value === null || value === undefined) return ["N/A", name]
                  if (name === "trendLine") return [Number(value).toFixed(2), "Trend Line"]
                  if (name === "changeRate") return [Number(value).toFixed(2) + "%", "Change Rate"]
                  if (name === selectedVariable) return [Number(value).toFixed(2), getLabel(selectedVariable)]
                  return [value, name]
                }}
              />
              <Legend wrapperStyle={{ color: "#ccc", 
                paddingTop: 15 
              }} 
               verticalAlign="bottom" 
                height={36} 
                iconSize={10} />
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={getColor(selectedVariable)} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={getColor(selectedVariable)} stopOpacity={0.1} />
                </linearGradient>
              </defs>

              {/* Línea principal de datos */}
              <Area
                type="monotone"
                dataKey={selectedVariable}
                stroke={getColor(selectedVariable)}
                fillOpacity={1}
                fill="url(#colorGradient)"
                name={getLabel(selectedVariable)}
                isAnimationActive={true}
                dot={false}
                activeDot={{ r: 6, stroke: getColor(selectedVariable), fill: "#fff" }}
                connectNulls={true}
              />

              {/* Línea de tendencia siempre visible */}
              <Line
                type="linear"
                dataKey="trendLine"
                stroke="#82ca9d"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                activeDot={false}
                name="Trend Line"
                connectNulls={true}
                isAnimationActive={true}
              />

              {/* Gráfico de tasa de cambio */}
              {showChangeRate && (
                <Line
                  type="monotone"
                  dataKey="changeRate"
                  yAxisId="right"
                  stroke="#ff00ff"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#ff00ff" }}
                  name="Change Rate (%)"
                  connectNulls={true}
                />
              )}

              {/* Puntos críticos como Scatter para mejor visualización */}
              {showCriticalPoints && (
                <Scatter
                  name="Critical Points"
                  data={criticalPointsData}
                  fill="#ff7300"
                  shape={(props) => {
                    const { cx, cy, payload } = props
                    const isPeak = payload.pointType === "peak"

                    return (
                      <g>
                        <circle
                          cx={cx}
                          cy={cy}
                          r={8}
                          fill={isPeak ? "#ff7300" : "#0088FE"}
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                        <text x={cx} y={cy - 15} textAnchor="middle" fill="#ffffff" fontSize={12} fontWeight="bold">
                          {isPeak ? "↑Peak" : "↓Valley"}
                        </text>
                      </g>
                    )
                  }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Métricas de análisis */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-muted/30 p-4 rounded-lg dark:bg-gray-700/30">
            <p className="text-xs text-muted-foreground dark:text-gray-400">Trend Analysis</p>
            <p className="text-lg font-medium dark:text-white capitalize">{trendAnalysis}</p>
            <p className="text-xs text-muted-foreground mt-1 dark:text-gray-500">Slope: {trendLine.slope.toFixed(4)}</p>
          </div>
          <div className="bg-muted/30 p-4 rounded-lg dark:bg-gray-700/30">
            <p className="text-xs text-muted-foreground dark:text-gray-400">Cyclical Pattern</p>
            <p className="text-lg font-medium dark:text-white capitalize">{detectCycles}</p>
            <p className="text-xs text-muted-foreground mt-1 dark:text-gray-500">Based on direction changes</p>
          </div>
          <div className="bg-muted/30 p-4 rounded-lg dark:bg-gray-700/30">
            <p className="text-xs text-muted-foreground dark:text-gray-400">Volatility</p>
            <p className="text-lg font-medium dark:text-white">{volatility.level}</p>
            <p className="text-xs text-muted-foreground mt-1 dark:text-gray-500">CV: {volatility.value.toFixed(3)}</p>
          </div>
        </div>

        {/* Resumen de insights */}
        <Alert className="dark:bg-gray-700/30 dark:border-gray-600">
          <AlertDescription>
            <ul className="list-disc pl-5 space-y-1 dark:text-gray-300">
              <li>
                {getLabel(selectedVariable)} shows a {trendAnalysis} trend over the analyzed time period.
              </li>
              <li>
                The data exhibits {detectCycles} patterns, suggesting
                {detectCycles === "highly cyclical"
                  ? " regular fluctuations that may be predictable."
                  : detectCycles === "moderately cyclical"
                    ? " some recurring patterns."
                    : " mostly random variations without clear cycles."}
              </li>
              {showCriticalPoints && criticalPoints.length > 0 && (
                <li>
                  {criticalPoints.length} critical {criticalPoints.length === 1 ? "point was" : "points were"} detected,
                  indicating significant shifts in the variable's behavior.
                </li>
              )}
              <li>
                {Math.abs(changeStats.percentChange) < 5
                  ? `The variable remained relatively stable with only a ${changeStats.percentChange.toFixed(1)}% change between the first and second half of the period.`
                  : `There was a ${changeStats.percentChange > 0 ? "positive" : "negative"} change of ${Math.abs(changeStats.percentChange).toFixed(1)}% between the first and second half of the period.`}
              </li>
              <li>
                The highest value ({extremes.max.toFixed(2)}) was observed at point{" "}
                {data[extremes.maxIndex]?.name || "unknown"}, while the lowest value ({extremes.min.toFixed(2)}) was
                observed at point {data[extremes.minIndex]?.name || "unknown"}.
              </li>
              <li>
                Volatility is {volatility.level.toLowerCase()}, with a coefficient of variation of{" "}
                {volatility.value.toFixed(3)}, indicating{" "}
                {volatility.level === "High" ? "significant" : volatility.level === "Moderate" ? "moderate" : "minimal"}{" "}
                fluctuations.
              </li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
