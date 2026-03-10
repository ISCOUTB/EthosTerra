import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  Legend,
} from "recharts"

interface VariableComparisonProps {
  data: Array<Record<string, any>>
  xVariable: string
  yVariable: string
  xLabel: string
  yLabel: string
  showRegressionLine?: boolean
}

export function VariableComparison({
  data,
  xVariable,
  yVariable,
  xLabel,
  yLabel,
  showRegressionLine = true,
}: VariableComparisonProps) {
  // Extract data for the selected variables
  const xData = data.map((item) => item[xVariable] as number)
  const yData = data.map((item) => item[yVariable] as number)

  // Calculate correlation
  const calculateCorrelation = (x: number[], y: number[]): number => {
    if (x.length !== y.length || x.length === 0) return 0

    const xMean = x.reduce((sum, val) => sum + val, 0) / x.length
    const yMean = y.reduce((sum, val) => sum + val, 0) / y.length

    let numerator = 0
    let xDenominator = 0
    let yDenominator = 0

    for (let i = 0; i < x.length; i++) {
      const xDiff = x[i] - xMean
      const yDiff = y[i] - yMean
      numerator += xDiff * yDiff
      xDenominator += xDiff * xDiff
      yDenominator += yDiff * yDiff
    }

    if (xDenominator === 0 || yDenominator === 0) return 0
    return numerator / Math.sqrt(xDenominator * yDenominator)
  }

  const correlation = calculateCorrelation(xData, yData)

  // Generate insights based on correlation
  const getCorrelationStrength = (corr: number): string => {
    const absCorr = Math.abs(corr)
    if (absCorr > 0.7) return "strong"
    if (absCorr > 0.3) return "moderate"
    return "weak"
  }

  const getCorrelationDirection = (corr: number): string => {
    if (corr > 0) return "positive"
    if (corr < 0) return "negative"
    return "no"
  }

  const correlationStrength = getCorrelationStrength(correlation)
  const correlationDirection = getCorrelationDirection(correlation)

  // Calculate linear regression for the trend line
  const calculateLinearRegression = (x: number[], y: number[]) => {
    const n = x.length
    const xMean = x.reduce((sum, val) => sum + val, 0) / n
    const yMean = y.reduce((sum, val) => sum + val, 0) / n

    let numerator = 0
    let denominator = 0

    for (let i = 0; i < n; i++) {
      numerator += (x[i] - xMean) * (y[i] - yMean)
      denominator += Math.pow(x[i] - xMean, 2)
    }

    const slope = denominator !== 0 ? numerator / denominator : 0
    const intercept = yMean - slope * xMean

    return { slope, intercept }
  }

  const { slope, intercept } = calculateLinearRegression(xData, yData)

  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="dark:text-white">
            {xLabel} vs {yLabel}
          </CardTitle>
          <Badge
            variant={correlationStrength === "strong" ? "default" : "outline"}
            className={
              correlationStrength === "strong"
                ? "bg-blue-500 hover:bg-blue-600"
                : "dark:border-gray-700 dark:text-white"
            }
          >
            {correlationStrength} {correlationDirection} correlation
          </Badge>
        </div>
        <CardDescription className="dark:text-gray-400">
          Correlation coefficient: {correlation.toFixed(3)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.5} />
              <XAxis
                type="number"
                dataKey={xVariable}
                name={xLabel}
                stroke="#888"
                domain={["auto", "auto"]}
                label={{
                  value: xLabel,
                  position: "bottom",
                  fill: "#888",
                }}
              />
              <YAxis
                type="number"
                dataKey={yVariable}
                name={yLabel}
                stroke="#888"
                domain={["auto", "auto"]}
                label={{
                  value: yLabel,
                  angle: -90,
                  position: "left",
                  fill: "#888",
                }}
              />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "6px",
                  color: "#fff",
                }}
                formatter={(value, name) => [value, name === xVariable ? xLabel : yLabel]}
              />
              <Legend />
              <Scatter name="Data Points" data={data} fill="#8884d8" />
              {showRegressionLine && (
                <Line
                  name="Regression Line"
                  type="linear"
                  dataKey={(entry) => intercept + slope * entry[xVariable]}
                  stroke="#ff7300"
                  dot={false}
                  activeDot={false}
                />
              )}
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <Alert className="dark:bg-gray-700/30 dark:border-gray-600">
          <AlertDescription>
            <ul className="list-disc pl-5 space-y-1 dark:text-gray-300">
              <li>
                There is a {correlationStrength} {correlationDirection} correlation ({correlation.toFixed(2)}) between{" "}
                {xLabel} and {yLabel}.
              </li>
              {correlationDirection === "positive" && correlation > 0.3 && (
                <li>
                  As {xLabel} increases, {yLabel} tends to increase as well.
                </li>
              )}
              {correlationDirection === "negative" && correlation < -0.3 && (
                <li>
                  As {xLabel} increases, {yLabel} tends to decrease.
                </li>
              )}
              {Math.abs(correlation) < 0.3 && (
                <li>
                  There appears to be little relationship between {xLabel} and {yLabel}.
                </li>
              )}
              {Math.abs(correlation) > 0.7 && (
                <li>
                  This strong correlation suggests that these variables may be causally related or influenced by a
                  common factor.
                </li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
