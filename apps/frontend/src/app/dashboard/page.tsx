'use client';

import { Activity, Users, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { useApiData } from '@visapi/frontend-data';
import type { WorkflowRecord } from '@visapi/shared-types';

interface QueueMetrics {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

// Stats now computed from live API data instead of hardcoded values

export default function DashboardPage() {
  const { data: queueMetrics, loading: queueLoading } = useApiData<QueueMetrics[]>('/api/v1/queue/metrics');
  const { data: workflows, loading: workflowsLoading } = useApiData<WorkflowRecord[]>('/api/v1/workflows');

  // Calculate aggregated metrics
  const totalJobs = queueMetrics?.reduce((sum, queue) => sum + queue.completed + queue.failed, 0) || 0;
  const activeJobs = queueMetrics?.reduce((sum, queue) => sum + queue.active + queue.waiting, 0) || 0;
  const failedJobs = queueMetrics?.reduce((sum, queue) => sum + queue.failed, 0) || 0;
  const activeWorkflows = workflows?.filter(w => w.enabled).length || 0;
  const successRate = totalJobs > 0 ? (((totalJobs - failedJobs) / totalJobs) * 100).toFixed(1) : '0';
  
  const stats = [
    {
      name: 'Total Jobs',
      value: queueLoading ? '...' : totalJobs.toLocaleString(),
      icon: Activity,
      change: '+12%', // TODO: Calculate from historical data
      changeType: 'positive' as const,
    },
    {
      name: 'Active Workflows',
      value: workflowsLoading ? '...' : activeWorkflows.toString(),
      icon: Users,
      change: '+4.75%', // TODO: Calculate from historical data  
      changeType: 'positive' as const,
    },
    {
      name: 'Success Rate',
      value: queueLoading ? '...' : `${successRate}%`,
      icon: Clock,
      change: '+2.02%', // TODO: Calculate from historical data
      changeType: 'positive' as const,
    },
    {
      name: 'Failed Jobs',
      value: queueLoading ? '...' : failedJobs.toLocaleString(),
      icon: AlertCircle,
      change: '-1.39%', // TODO: Calculate from historical data
      changeType: 'negative' as const,
    },
  ];
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Dashboard Overview
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Welcome to the VisAPI workflow automation dashboard
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div
            key={item.name}
            className="bg-white overflow-hidden shadow rounded-lg"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <item.icon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {item.name}
                    </dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">
                        {item.value}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span
                  className={`font-medium ${
                    item.changeType === 'positive'
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {item.change}
                </span>
                <span className="text-gray-500"> from last month</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Recent Activity
          </h3>
          <div className="mt-5">
            <div className="flow-root">
              <ul className="-mb-8">
                <li>
                  <div className="relative pb-8">
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center ring-8 ring-white">
                          <Activity className="h-4 w-4 text-white" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-gray-500">
                            Slack notification sent to{' '}
                            <span className="font-medium text-gray-900">
                              #general
                            </span>
                          </p>
                        </div>
                        <div className="text-right text-sm whitespace-nowrap text-gray-500">
                          <time>2 minutes ago</time>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
                <li>
                  <div className="relative pb-8">
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white">
                          <Users className="h-4 w-4 text-white" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-gray-500">
                            Workflow{' '}
                            <span className="font-medium text-gray-900">
                              Application Status Update
                            </span>{' '}
                            completed
                          </p>
                        </div>
                        <div className="text-right text-sm whitespace-nowrap text-gray-500">
                          <time>5 minutes ago</time>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
                <li>
                  <div className="relative">
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-purple-500 flex items-center justify-center ring-8 ring-white">
                          <Clock className="h-4 w-4 text-white" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-gray-500">
                            PDF generated for{' '}
                            <span className="font-medium text-gray-900">
                              visa application #1234
                            </span>
                          </p>
                        </div>
                        <div className="text-right text-sm whitespace-nowrap text-gray-500">
                          <time>10 minutes ago</time>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}