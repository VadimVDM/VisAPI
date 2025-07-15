'use client';

import { useState } from 'react';
import { Play, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { authenticatedFetch, useApiData } from '@visapi/frontend-data';
import type { WorkflowRecord } from '@visapi/shared-types';

interface TriggerResponse {
  success: boolean;
  jobId?: string;
  message?: string;
}

// Workflows now fetched from API instead of hardcoded

export default function TriggersPage() {
  const { data: workflows, loading: workflowsLoading, error: workflowsError } = useApiData<WorkflowRecord[]>('/api/v1/workflows');
  const [triggering, setTriggering] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, TriggerResponse>>({});

  const triggerWorkflow = async (workflowId: string) => {
    setTriggering(workflowId);
    try {
      const response = await authenticatedFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/triggers/${workflowId}`,
        {
          method: 'POST',
          body: JSON.stringify({
            applicantName: 'John Doe',
            visaType: 'Tourist',
            status: 'approved',
            applicationId: 'APP-' + Math.random().toString(36).substr(2, 9),
          }),
        }
      );

      const data = await response.json();
      setResults((prev) => ({ ...prev, [workflowId]: data }));
    } catch (error) {
      setResults((prev) => ({
        ...prev,
        [workflowId]: {
          success: false,
          message: 'Failed to trigger workflow',
        },
      }));
    } finally {
      setTriggering(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Manual Triggers
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Manually trigger workflows for testing and troubleshooting
        </p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {workflowsLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">Loading workflows...</p>
            </div>
          ) : workflowsError ? (
            <div className="text-center py-8">
              <XCircle className="h-6 w-6 mx-auto text-red-400" />
              <p className="mt-2 text-sm text-red-600">{workflowsError}</p>
            </div>
          ) : !workflows || workflows.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No workflows found</p>
            </div>
          ) : (
            <div className="space-y-6">
              {workflows.map((workflow) => {
                const result = results[workflow.id];
                const isTriggering = triggering === workflow.id;

              return (
                <div
                  key={workflow.id}
                  className="border-b border-gray-200 last:border-b-0 pb-6 last:pb-0"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">
                        {workflow.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {workflow.description || 'No description available'}
                      </p>

                      {result && (
                        <div
                          className={`mt-2 flex items-center space-x-2 text-sm ${
                            result.success ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {result.success ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                          <span>
                            {result.success
                              ? `Job queued successfully (ID: ${result.jobId})`
                              : result.message || 'Failed to trigger workflow'}
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => triggerWorkflow(workflow.id)}
                      disabled={isTriggering}
                      className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isTriggering ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      {isTriggering ? 'Triggering...' : 'Trigger'}
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Sample payload display */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">
          Sample Payload
        </h3>
        <pre className="text-xs text-gray-600 whitespace-pre-wrap">
          {JSON.stringify(
            {
              applicantName: 'John Doe',
              visaType: 'Tourist',
              status: 'approved',
              applicationId: 'APP-ABC123DEF',
            },
            null,
            2
          )}
        </pre>
      </div>
    </div>
  );
}
