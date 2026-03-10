import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface StatisticalSummaryProps {
  data: number[]
  label: string
  showOutliers?: boolean
}

export function StatisticalSummary({ data, label, showOutliers = true }: StatisticalSummaryProps) {
  // Calculate basic statistics
  const mean = data.reduce((sum, val) => sum + val, 0) / data.length

  const sortedData = [...data].sort((a, b) => a - b)
  const median =
    sortedData.length % 2 === 0
      ? (sortedData[sortedData.length / 2 - 1] + sortedData[sortedData.length / 2]) / 2
      : sortedData[Math.floor(sortedData.length / 2)]

  const squaredDiffs = data.map((val) => Math.pow(val - mean, 2))
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / data.length
  const stdDev = Math.sqrt(variance)

  const min = Math.min(...data)
  const max = Math.max(...data)

  // Calculate quartiles
  const q1 = sortedData[Math.floor(sortedData.length * 0.25)]
  const q3 = sortedData[Math.floor(sortedData.length * 0.75)]
  const iqr = q3 - q1

  // Identify outliers
  const lowerBound = q1 - 1.5 * iqr
  const upperBound = q3 + 1.5 * iqr
  const outliers = showOutliers ? data.filter((val) => val < lowerBound || val > upperBound) : []

  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <CardHeader className="pb-2">
        <CardTitle className="flex justify-between items-center dark:text-white">
          <span>{label} Statistics</span>
          {outliers.length > 0 && (
            <Badge variant="outline" className="dark:border-red-800 dark:text-red-400">
              {outliers.length} outliers
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground dark:text-gray-400">Mean</p>
          <p className="text-sm font-medium dark:text-white">{mean.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground dark:text-gray-400">Median</p>
          <p className="text-sm font-medium dark:text-white">{median.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground dark:text-gray-400">Standard Deviation</p>
          <p className="text-sm font-medium dark:text-white">{stdDev.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground dark:text-gray-400">Coefficient of Variation</p>
          <p className="text-sm font-medium dark:text-white">{(stdDev / mean).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground dark:text-gray-400">Range</p>
          <p className="text-sm font-medium dark:text-white">
            {min.toFixed(1)} - {max.toFixed(1)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground dark:text-gray-400">Interquartile Range</p>
          <p className="text-sm font-medium dark:text-white">
            {q1.toFixed(1)} - {q3.toFixed(1)}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
