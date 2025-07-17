"use client"

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area, BarChart, Bar } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'

interface ChartData {
  name: string
  value: number
  [key: string]: string | number
}

interface BaseChartProps {
  data: ChartData[]
  title: string
  description?: string
  height?: number
  className?: string
  loading?: boolean
}

interface LineChartProps extends BaseChartProps {
  dataKey: string
  stroke?: string
}

interface AreaChartProps extends BaseChartProps {
  dataKey: string
  fill?: string
  stroke?: string
}

interface BarChartProps extends BaseChartProps {
  dataKey: string
  fill?: string
}

interface MultiLineChartProps extends BaseChartProps {
  lines: Array<{
    dataKey: string
    stroke: string
    name: string
  }>
}

// Line Chart Component
export function SimpleLineChart({ 
  data, 
  title, 
  description, 
  dataKey, 
  stroke = "hsl(var(--primary))", 
  height = 300,
  className,
  loading = false
}: LineChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                className="fill-muted-foreground text-xs"
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                className="fill-muted-foreground text-xs"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  color: 'hsl(var(--card-foreground))'
                }}
              />
              <Line 
                type="monotone" 
                dataKey={dataKey} 
                stroke={stroke} 
                strokeWidth={2}
                dot={{ fill: stroke, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// Area Chart Component
export function SimpleAreaChart({ 
  data, 
  title, 
  description, 
  dataKey, 
  fill = "hsl(var(--primary))", 
  stroke = "hsl(var(--primary))",
  height = 300,
  className,
  loading = false
}: AreaChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                className="fill-muted-foreground text-xs"
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                className="fill-muted-foreground text-xs"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  color: 'hsl(var(--card-foreground))'
                }}
              />
              <Area 
                type="monotone" 
                dataKey={dataKey} 
                stroke={stroke}
                fill={fill}
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// Bar Chart Component
export function SimpleBarChart({ 
  data, 
  title, 
  description, 
  dataKey, 
  fill = "hsl(var(--primary))", 
  height = 300,
  className,
  loading = false
}: BarChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                className="fill-muted-foreground text-xs"
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                className="fill-muted-foreground text-xs"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  color: 'hsl(var(--card-foreground))'
                }}
              />
              <Bar 
                dataKey={dataKey} 
                fill={fill}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// Multi-Line Chart Component
export function MultiLineChart({ 
  data, 
  title, 
  description, 
  lines,
  height = 300,
  className,
  loading = false
}: MultiLineChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                className="fill-muted-foreground text-xs"
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                className="fill-muted-foreground text-xs"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  color: 'hsl(var(--card-foreground))'
                }}
              />
              <Legend />
              {lines.map((line, index) => (
                <Line 
                  key={line.dataKey}
                  type="monotone" 
                  dataKey={line.dataKey} 
                  stroke={line.stroke} 
                  strokeWidth={2}
                  name={line.name}
                  dot={{ fill: line.stroke, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}