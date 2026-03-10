"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
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

export function DistributionAnalysis({ data }: { data: any[] }) {
  const [selectedVariable, setSelectedVariable] = useState<string>(floatVariables[0].key)
  const [bins, setBins] = useState(10)
  const [confidenceInterval, setConfidenceInterval] = useState(95)

 
  const variableData = useMemo(() => {
    return data
      .map((item) => {
        const val = item[selectedVariable]
        return typeof val === "number" && !isNaN(val) ? val : null
      })
      .filter((val): val is number => val !== null)
  }, [data, selectedVariable])

  
  const statistics = useMemo(() => {
    if (variableData.length === 0) return null

    const sortedData = [...variableData].sort((a, b) => a - b)
    const mean = variableData.reduce((sum, val) => sum + val, 0) / variableData.length
    const median =
      sortedData.length % 2 === 0
        ? (sortedData[sortedData.length / 2 - 1] + sortedData[sortedData.length / 2]) / 2
        : sortedData[Math.floor(sortedData.length / 2)]

    const squaredDiffs = variableData.map((val) => Math.pow(val - mean, 2))
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / variableData.length
    const stdDev = Math.sqrt(variance)

    const min = Math.min(...variableData)
    const max = Math.max(...variableData)

   
    const q1 = sortedData[Math.floor(sortedData.length * 0.25)]
    const q3 = sortedData[Math.floor(sortedData.length * 0.75)]
    const iqr = q3 - q1

    
    const zScore = confidenceInterval === 95 ? 1.96 : confidenceInterval === 99 ? 2.576 : 1.645 
    const ciLower = mean - zScore * (stdDev / Math.sqrt(variableData.length))
    const ciUpper = mean + zScore * (stdDev / Math.sqrt(variableData.length))

    
    const skewness =
      variableData.reduce((sum, val) => sum + Math.pow(val - mean, 3), 0) / (variableData.length * Math.pow(stdDev, 3))

    
    const kurtosis =
      variableData.reduce((sum, val) => sum + Math.pow(val - mean, 4), 0) /
        (variableData.length * Math.pow(stdDev, 4)) -
      3

    
    const lowerBound = q1 - 1.5 * iqr
    const upperBound = q3 + 1.5 * iqr
    const outliers = variableData.filter((val) => val < lowerBound || val > upperBound)

    return {
      mean,
      median,
      stdDev,
      variance,
      min,
      max,
      q1,
      q3,
      iqr,
      ciLower,
      ciUpper,
      skewness,
      kurtosis,
      outliers,
      coefficientOfVariation: stdDev / mean,
    }
  }, [variableData, confidenceInterval])

  
  const histogramData = useMemo(() => {
    if (!statistics) return []

    const { min, max } = statistics
    const binWidth = (max - min) / bins

    return Array.from({ length: bins }, (_, i) => {
      const binStart = min + i * binWidth
      const binEnd = binStart + binWidth
      const count = variableData.filter(
        (val) => val >= binStart && val < (i === bins - 1 ? binEnd + 0.001 : binEnd),
      ).length

      return {
        bin: `${binStart.toFixed(1)}-${binEnd.toFixed(1)}`,
        count,
        binStart,
        binEnd,
        binMiddle: (binStart + binEnd) / 2,
      }
    })
  }, [variableData, statistics, bins])

  // Obtener etiqueta para la variable
  const getLabel = (key: string): string => {
    return floatVariables.find((v) => v.key === key)?.label || key
  }

  
  const getColor = (key: string): string => {
    return floatVariables.find((v) => v.key === key)?.color || "#8884d8"
  }

  
  const generateInsights = useMemo(() => {
    if (!statistics) return []

    const insights = []

    
    if (statistics.skewness > 0.5) {
      insights.push(
        `The distribution of ${getLabel(selectedVariable)} is positively skewed (skewness = ${statistics.skewness.toFixed(2)}), indicating a longer tail on the right side.`,
      )
    } else if (statistics.skewness < -0.5) {
      insights.push(
        `The distribution of ${getLabel(selectedVariable)} is negatively skewed (skewness = ${statistics.skewness.toFixed(2)}), indicating a longer tail on the left side.`,
      )
    } else {
      insights.push(
        `The distribution of ${getLabel(selectedVariable)} is approximately symmetric (skewness = ${statistics.skewness.toFixed(2)}).`,
      )
    }

    
    if (statistics.kurtosis > 0.5) {
      insights.push(
        `The distribution has a high peak (kurtosis = ${statistics.kurtosis.toFixed(2)}), indicating more values concentrated around the mean and heavier tails.`,
      )
    } else if (statistics.kurtosis < -0.5) {
      insights.push(
        `The distribution is flatter than normal (kurtosis = ${statistics.kurtosis.toFixed(2)}), with values more spread out.`,
      )
    } else {
      insights.push(`The distribution has a normal-like peak (kurtosis = ${statistics.kurtosis.toFixed(2)}).`)
    }

    
    insights.push(
      `With ${confidenceInterval}% confidence, the true mean of ${getLabel(selectedVariable)} is between ${statistics.ciLower.toFixed(2)} and ${statistics.ciUpper.toFixed(2)}.`,
    )

    
    if (statistics.coefficientOfVariation > 0.3) {
      insights.push(
        `The data shows high variability (CV = ${statistics.coefficientOfVariation.toFixed(2)}), indicating significant dispersion relative to the mean.`,
      )
    } else if (statistics.coefficientOfVariation > 0.1) {
      insights.push(`The data shows moderate variability (CV = ${statistics.coefficientOfVariation.toFixed(2)}).`)
    } else {
      insights.push(
        `The data shows low variability (CV = ${statistics.coefficientOfVariation.toFixed(2)}), indicating values are clustered around the mean.`,
      )
    }

    
    if (statistics.outliers.length > 0) {
      insights.push(
        `${statistics.outliers.length} outlier${statistics.outliers.length === 1 ? "" : "s"} detected, which may influence statistical measures.`,
      )
    } else {
      insights.push(`No significant outliers detected in the data.`)
    }

    
    const meanMedianDiff = ((statistics.mean - statistics.median) / statistics.median) * 100
    if (Math.abs(meanMedianDiff) > 10) {
      insights.push(
        `The mean (${statistics.mean.toFixed(2)}) is ${meanMedianDiff > 0 ? "higher" : "lower"} than the median (${statistics.median.toFixed(2)}) by ${Math.abs(meanMedianDiff).toFixed(1)}%, confirming the ${statistics.skewness > 0 ? "positive" : "negative"} skew.`,
      )
    } else {
      insights.push(
        `The mean (${statistics.mean.toFixed(2)}) and median (${statistics.median.toFixed(2)}) are close, suggesting a relatively symmetric distribution.`,
      )
    }

    return insights
  }, [statistics, selectedVariable, confidenceInterval])

  if (!statistics) {
    return (
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="p-6">
          <div className="text-center dark:text-gray-400">No data available for analysis.</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <CardHeader className="pb-2">
        <CardTitle className="dark:text-white">Distribution of {getLabel(selectedVariable)}</CardTitle>
        <CardDescription className="dark:text-gray-400">
          Analyze the frequency distribution and statistical properties
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
          <div>
            <Label htmlFor="bins-slider" className="dark:text-white mb-2 block">
              Number of Bins: {bins}
            </Label>
            <Slider
              id="bins-slider"
              min={5}
              max={20}
              step={1}
              value={[bins]}
              onValueChange={(value) => setBins(value[0])}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="confidence-slider" className="dark:text-white mb-2 block">
            Confidence Interval: {confidenceInterval}%
          </Label>
          <Slider
            id="confidence-slider"
            min={80}
            max={99}
            step={1}
            value={[confidenceInterval]}
            onValueChange={(value) => setConfidenceInterval(value[0])}
          />
        </div>

        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={histogramData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.5} vertical={false} />
              <XAxis
                dataKey="bin"
                stroke="#888"
                angle={-45}
                textAnchor="end"
                height={70}
                label={{
                  value: getLabel(selectedVariable),
                  position: "bottom",
                  fill: "#888",
                  offset: 20,
                }}
              />
              <YAxis
                stroke="#888"
                label={{
                  value: "Frequency",
                  angle: -90,
                  position: "left",
                  fill: "#888",
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "6px",
                  color: "#fff",
                }}
                formatter={(value, name) => [value, "Frequency"]}
                labelFormatter={(label) => `Range: ${label}`}
              />
              <Legend 
                wrapperStyle={{ 
                  color: "#ccc",
                  paddingTop: 15,
                  marginTop: 10,
                  bottom: 0
                }} 
                verticalAlign="bottom" 
                height={36}
                iconSize={10}
                offset={20}
              />
              <defs>
                <linearGradient id="histogramGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={getColor(selectedVariable)} stopOpacity={0.9} />
                  <stop offset="95%" stopColor={getColor(selectedVariable)} stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <Bar
                dataKey="count"
                fill="url(#histogramGradient)"
                radius={[4, 4, 0, 0]}
                barSize={30}
                animationDuration={1500}
                name="Frequency"
              />
              {/* Línea para la media */}
              <ReferenceLine
                x={histogramData.find((bin) => statistics.mean >= bin.binStart && statistics.mean < bin.binEnd)?.bin}
                stroke="red"
                strokeWidth={2}
                label={{
                  value: "Mean",
                  position: "top",
                  fill: "red",
                }}
              />
              {/* Línea para la mediana */}
              <ReferenceLine
                x={
                  histogramData.find((bin) => statistics.median >= bin.binStart && statistics.median < bin.binEnd)?.bin
                }
                stroke="blue"
                strokeWidth={2}
                strokeDasharray="3 3"
                label={{
                  value: "Median",
                  position: "top",
                  fill: "blue",
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-muted/30 p-4 rounded-lg dark:bg-gray-700/30">
            <p className="text-xs text-muted-foreground dark:text-gray-400">Central Tendency</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <p className="text-xs text-muted-foreground dark:text-gray-400">Mean</p>
                <p className="text-lg font-medium dark:text-white">{statistics.mean.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground dark:text-gray-400">Median</p>
                <p className="text-lg font-medium dark:text-white">{statistics.median.toFixed(2)}</p>
              </div>
            </div>
          </div>
          <div className="bg-muted/30 p-4 rounded-lg dark:bg-gray-700/30">
            <p className="text-xs text-muted-foreground dark:text-gray-400">Dispersion</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <p className="text-xs text-muted-foreground dark:text-gray-400">Std. Deviation</p>
                <p className="text-lg font-medium dark:text-white">{statistics.stdDev.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground dark:text-gray-400">CV</p>
                <p className="text-lg font-medium dark:text-white">{statistics.coefficientOfVariation.toFixed(2)}</p>
              </div>
            </div>
          </div>
          <div className="bg-muted/30 p-4 rounded-lg dark:bg-gray-700/30">
            <p className="text-xs text-muted-foreground dark:text-gray-400">
              Confidence Interval ({confidenceInterval}%)
            </p>
            <p className="text-lg font-medium dark:text-white">
              {statistics.ciLower.toFixed(2)} - {statistics.ciUpper.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1 dark:text-gray-500">Range for the true mean</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-muted/30 p-4 rounded-lg dark:bg-gray-700/30">
            <p className="text-xs text-muted-foreground dark:text-gray-400">Range</p>
            <p className="text-lg font-medium dark:text-white">
              {statistics.min.toFixed(2)} - {statistics.max.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1 dark:text-gray-500">Min - Max</p>
          </div>
          <div className="bg-muted/30 p-4 rounded-lg dark:bg-gray-700/30">
            <p className="text-xs text-muted-foreground dark:text-gray-400">Interquartile Range</p>
            <p className="text-lg font-medium dark:text-white">
              {statistics.q1.toFixed(2)} - {statistics.q3.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1 dark:text-gray-500">Q1 - Q3</p>
          </div>
          <div className="bg-muted/30 p-4 rounded-lg dark:bg-gray-700/30">
            <p className="text-xs text-muted-foreground dark:text-gray-400">Distribution Shape</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <p className="text-xs text-muted-foreground dark:text-gray-400">Skewness</p>
                <p className="text-lg font-medium dark:text-white">{statistics.skewness.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground dark:text-gray-400">Kurtosis</p>
                <p className="text-lg font-medium dark:text-white">{statistics.kurtosis.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        <Alert className="dark:bg-gray-700/30 dark:border-gray-600">
          <AlertDescription>
            <h4 className="font-medium text-base mb-2 dark:text-white">Statistical Insights</h4>
            <ul className="list-disc pl-5 space-y-1 dark:text-gray-300">
              {generateInsights.map((insight, index) => (
                <li key={index}>{insight}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
