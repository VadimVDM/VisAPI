'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    label: string;
  };
  icon?: React.ReactNode;
  className?: string;
  loading?: boolean;
}

export function MetricCard({
  title,
  value,
  description,
  trend,
  icon,
  className,
  loading = false,
}: MetricCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null;

    if (trend.value > 0) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (trend.value < 0) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    } else {
      return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTrendVariant = () => {
    if (!trend) return 'secondary';

    if (trend.value > 0) return 'success';
    if (trend.value < 0) return 'destructive';
    return 'secondary';
  };

  return (
    <Card className={cn('transition-all hover:shadow-md', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && <div className="h-4 w-4 text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {loading ? (
            <div className="h-8 w-24 animate-pulse rounded bg-muted" />
          ) : (
            <div className="text-2xl font-bold">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
          )}

          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}

          {trend && !loading && (
            <div className="flex items-center space-x-2">
              <Badge
                variant={getTrendVariant()}
                className="flex items-center space-x-1 px-2 py-1"
              >
                {getTrendIcon()}
                <span className="text-xs font-medium">
                  {trend.value > 0 ? '+' : ''}
                  {trend.value}%
                </span>
              </Badge>
              <span className="text-xs text-muted-foreground">
                {trend.label}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
