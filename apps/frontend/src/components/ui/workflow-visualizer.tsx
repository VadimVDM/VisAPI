"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'
import { Badge } from './badge'
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  XCircle, 
  ArrowRight, 
  Play,
  Pause,
  RotateCcw,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface WorkflowStep {
  id: string
  name: string
  type: 'trigger' | 'action' | 'condition' | 'delay'
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  duration?: number
  errorMessage?: string
  config?: Record<string, any>
}

export interface WorkflowVisualizerProps {
  steps: WorkflowStep[]
  title: string
  description?: string
  className?: string
  layout?: 'horizontal' | 'vertical'
}

const statusIcons = {
  pending: Clock,
  running: Play,
  completed: CheckCircle,
  failed: XCircle,
  skipped: Pause,
}

const statusColors = {
  pending: 'text-yellow-500',
  running: 'text-blue-500 animate-pulse',
  completed: 'text-green-500',
  failed: 'text-red-500',
  skipped: 'text-gray-400',
}

const statusBadgeVariants = {
  pending: 'warning' as const,
  running: 'default' as const,
  completed: 'success' as const,
  failed: 'destructive' as const,
  skipped: 'secondary' as const,
}

const typeIcons = {
  trigger: Zap,
  action: Play,
  condition: RotateCcw,
  delay: Clock,
}

const typeColors = {
  trigger: 'text-purple-500',
  action: 'text-blue-500',
  condition: 'text-orange-500',
  delay: 'text-gray-500',
}

function WorkflowStepCard({ step, isLast }: { step: WorkflowStep; isLast: boolean }) {
  const StatusIcon = statusIcons[step.status]
  const TypeIcon = typeIcons[step.type]
  
  return (
    <div className="relative flex items-center">
      <Card className={cn(
        "min-w-[200px] transition-all duration-200",
        step.status === 'running' && "ring-2 ring-primary ring-offset-2",
        step.status === 'failed' && "border-destructive"
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <TypeIcon className={cn("h-4 w-4", typeColors[step.type])} />
              <span>{step.name}</span>
            </CardTitle>
            <StatusIcon className={cn("h-4 w-4", statusColors[step.status])} />
          </div>
          <div className="flex items-center justify-between">
            <Badge variant={statusBadgeVariants[step.status]} className="text-xs">
              {step.status}
            </Badge>
            {step.duration && (
              <span className="text-xs text-muted-foreground">
                {step.duration}ms
              </span>
            )}
          </div>
        </CardHeader>
        {step.errorMessage && (
          <CardContent className="pt-0">
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-2">
              <p className="text-xs text-destructive">{step.errorMessage}</p>
            </div>
          </CardContent>
        )}
      </Card>
      
      {!isLast && (
        <div className="flex items-center mx-4">
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
    </div>
  )
}

function VerticalWorkflowStepCard({ step, isLast }: { step: WorkflowStep; isLast: boolean }) {
  const StatusIcon = statusIcons[step.status]
  const TypeIcon = typeIcons[step.type]
  
  return (
    <div className="relative">
      <div className="flex items-start space-x-4">
        {/* Timeline indicator */}
        <div className="flex flex-col items-center">
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full border-2",
            step.status === 'completed' && "bg-green-100 border-green-500 text-green-500",
            step.status === 'running' && "bg-blue-100 border-blue-500 text-blue-500 animate-pulse",
            step.status === 'failed' && "bg-red-100 border-red-500 text-red-500",
            step.status === 'pending' && "bg-yellow-100 border-yellow-500 text-yellow-500",
            step.status === 'skipped' && "bg-gray-100 border-gray-400 text-gray-400"
          )}>
            <StatusIcon className="h-5 w-5" />
          </div>
          {!isLast && (
            <div className="h-12 w-0.5 bg-border mt-2" />
          )}
        </div>
        
        {/* Step content */}
        <div className="flex-1 pb-6">
          <Card className={cn(
            "transition-all duration-200",
            step.status === 'running' && "ring-2 ring-primary ring-offset-2",
            step.status === 'failed' && "border-destructive"
          )}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center space-x-2">
                <TypeIcon className={cn("h-4 w-4", typeColors[step.type])} />
                <span>{step.name}</span>
              </CardTitle>
              <div className="flex items-center justify-between">
                <Badge variant={statusBadgeVariants[step.status]} className="text-xs">
                  {step.status}
                </Badge>
                {step.duration && (
                  <span className="text-xs text-muted-foreground">
                    {step.duration}ms
                  </span>
                )}
              </div>
            </CardHeader>
            {step.errorMessage && (
              <CardContent className="pt-0">
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-2">
                  <p className="text-xs text-destructive">{step.errorMessage}</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

export function WorkflowVisualizer({ 
  steps, 
  title, 
  description, 
  className,
  layout = 'horizontal'
}: WorkflowVisualizerProps) {
  if (layout === 'vertical') {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>{title}</span>
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            {steps.map((step, index) => (
              <VerticalWorkflowStepCard 
                key={step.id} 
                step={step} 
                isLast={index === steps.length - 1}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Zap className="h-5 w-5" />
          <span>{title}</span>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="flex items-center overflow-x-auto pb-4">
          {steps.map((step, index) => (
            <WorkflowStepCard 
              key={step.id} 
              step={step} 
              isLast={index === steps.length - 1}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Workflow Timeline Component
export interface WorkflowTimelineProps {
  executions: Array<{
    id: string
    name: string
    status: 'completed' | 'failed' | 'running'
    startTime: Date
    endTime?: Date
    duration?: number
  }>
  title: string
  className?: string
}

export function WorkflowTimeline({ executions, title, className }: WorkflowTimelineProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="h-5 w-5" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {executions.map((execution) => (
            <div key={execution.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={cn(
                  "h-3 w-3 rounded-full",
                  execution.status === 'completed' && "bg-green-500",
                  execution.status === 'failed' && "bg-red-500",
                  execution.status === 'running' && "bg-blue-500 animate-pulse"
                )} />
                <div>
                  <p className="text-sm font-medium">{execution.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {execution.startTime.toLocaleTimeString()}
                    {execution.endTime && ` - ${execution.endTime.toLocaleTimeString()}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge variant={
                  execution.status === 'completed' ? 'success' :
                  execution.status === 'failed' ? 'destructive' : 'default'
                }>
                  {execution.status}
                </Badge>
                {execution.duration && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {execution.duration}ms
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}