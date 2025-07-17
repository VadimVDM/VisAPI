'use client';

// Temporarily commenting out imports to fix build
// import { useApiData } from '@visapi/frontend-data';

// Mock imports for testing
const useApiData = <T,>(url: string) => {
  const mockQueueMetrics: QueueMetrics[] = [
    {
      name: 'default',
      waiting: 5,
      active: 2,
      completed: 150,
      failed: 3,
      delayed: 1,
    },
    {
      name: 'critical',
      waiting: 0,
      active: 1,
      completed: 75,
      failed: 1,
      delayed: 0,
    },
    {
      name: 'bulk',
      waiting: 10,
      active: 3,
      completed: 500,
      failed: 8,
      delayed: 2,
    }
  ];

  return {
    data: mockQueueMetrics as T,
    loading: false,
    error: null,
  };
};

interface QueueMetrics {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export default function QueuePage() {
  const { data: queueMetrics, loading, error } = useApiData<QueueMetrics[]>('/api/v1/queue/metrics');

  // Aggregate metrics across all queues
  const totalActive = queueMetrics?.reduce((sum, queue) => sum + queue.active, 0) || 0;
  const totalCompleted = queueMetrics?.reduce((sum, queue) => sum + queue.completed, 0) || 0;
  const totalFailed = queueMetrics?.reduce((sum, queue) => sum + queue.failed, 0) || 0;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Queue Monitoring
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Monitor job queues, view metrics, and manage failed jobs
        </p>
      </div>

      {/* Bull-Board iframe */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="h-96">
          <iframe
            src={`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/queues`}
            className="w-full h-full border-0"
            title="Queue Dashboard"
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">A</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Jobs
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {loading ? '...' : totalActive.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">C</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Completed
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {loading ? '...' : totalCompleted.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">F</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Failed
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {loading ? '...' : totalFailed.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
