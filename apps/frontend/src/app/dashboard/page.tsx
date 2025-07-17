'use client';

import { Activity, Users, Clock, AlertCircle, TrendingUp, BarChart3 } from 'lucide-react';
import { useDashboard } from '@visapi/frontend-data';
import { MetricCard } from '@/components/ui/metric-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SimpleLineChart, SimpleAreaChart, SimpleBarChart } from '@/components/ui/charts';

// Chart data type compatible with recharts
interface ChartData {
  name: string;
  value: number;
  [key: string]: string | number;
}

export default function DashboardPage() {
  const {
    metrics,
    jobsOverTime,
    workflowStatus,
    performanceData,
    loading,
    error,
    refreshAll,
    lastUpdated
  } = useDashboard();

  // Fallback to mock data if API is not available
  const totalJobs = metrics?.totalJobs ?? 1234;
  const failedJobs = metrics?.failedJobs ?? 23;
  const activeWorkflows = metrics?.activeWorkflows ?? 8;
  const successRate = metrics?.successRate ? `${metrics.successRate.toFixed(1)}%` : '98.1%';

  // Convert API data to chart format or use fallback mock data
  const jobsOverTimeData: ChartData[] = jobsOverTime.length > 0 
    ? jobsOverTime.map(item => ({ name: item.name, value: item.value }))
    : [
        { name: 'Jan', value: 400 },
        { name: 'Feb', value: 300 },
        { name: 'Mar', value: 600 },
        { name: 'Apr', value: 800 },
        { name: 'May', value: 500 },
        { name: 'Jun', value: 700 },
        { name: 'Jul', value: 900 },
      ];

  const workflowStatusData: ChartData[] = workflowStatus.length > 0 
    ? workflowStatus.map(item => ({ name: item.name, value: item.value }))
    : [
        { name: 'Running', value: 8 },
        { name: 'Completed', value: 23 },
        { name: 'Failed', value: 2 },
        { name: 'Pending', value: 4 },
      ];

  const performanceChartData: ChartData[] = performanceData.length > 0 
    ? performanceData.map(item => ({ name: item.name, value: item.value }))
    : [
        { name: '00:00', value: 65 },
        { name: '04:00', value: 59 },
        { name: '08:00', value: 80 },
        { name: '12:00', value: 81 },
        { name: '16:00', value: 56 },
        { name: '20:00', value: 55 },
      ];
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Dashboard Overview
          </h1>
          <p className="text-muted-foreground mt-2">
            Welcome to the VisAPI workflow automation dashboard
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {error ? (
            <>
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span className="text-sm text-red-500">API connection issues</span>
              <button 
                onClick={refreshAll}
                className="ml-2 px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
                disabled={loading}
              >
                {loading ? 'Refreshing...' : 'Retry'}
              </button>
            </>
          ) : (
            <>
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">
                All systems operational
                {lastUpdated && (
                  <span className="ml-2 text-xs">
                    (Updated {lastUpdated.toLocaleTimeString()})
                  </span>
                )}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Jobs"
          value={totalJobs}
          description="Jobs processed today"
          trend={{
            value: 12,
            label: "from last month"
          }}
          icon={<Activity className="h-4 w-4" />}
          loading={loading}
        />
        
        <MetricCard
          title="Active Workflows"
          value={activeWorkflows}
          description="Workflows currently enabled"
          trend={{
            value: 4.75,
            label: "from last month"
          }}
          icon={<Users className="h-4 w-4" />}
          loading={loading}
        />
        
        <MetricCard
          title="Success Rate"
          value={`${successRate}%`}
          description="Successful job executions"
          trend={{
            value: 2.02,
            label: "from last month"
          }}
          icon={<Clock className="h-4 w-4" />}
          loading={loading}
        />
        
        <MetricCard
          title="Failed Jobs"
          value={failedJobs}
          description="Jobs that failed today"
          trend={{
            value: -1.39,
            label: "from last month"
          }}
          icon={<AlertCircle className="h-4 w-4" />}
          loading={loading}
        />
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Recent Activity</span>
          </CardTitle>
          <CardDescription>
            Latest workflow executions and system events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">
                  Slack notification sent to{' '}
                  <span className="font-medium">#general</span>
                </p>
                <p className="text-xs text-muted-foreground">2 minutes ago</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">
                  Workflow{' '}
                  <span className="font-medium">Application Status Update</span>{' '}
                  completed
                </p>
                <p className="text-xs text-muted-foreground">5 minutes ago</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">
                  PDF generated for{' '}
                  <span className="font-medium">visa application #1234</span>
                </p>
                <p className="text-xs text-muted-foreground">10 minutes ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SimpleLineChart
          data={jobsOverTimeData}
          title="Jobs Over Time"
          description="Monthly job execution trends"
          dataKey="value"
          className="lg:col-span-1"
        />
        
        <SimpleBarChart
          data={workflowStatusData}
          title="Workflow Status"
          description="Current workflow status distribution"
          dataKey="value"
          className="lg:col-span-1"
        />
      </div>

      {/* Performance Chart */}
      <SimpleAreaChart
        data={performanceChartData}
        title="System Performance"
        description="API response time throughout the day"
        dataKey="value"
        className="w-full"
      />
    </div>
  );
}