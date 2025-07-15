'use client';

import { useState } from 'react';
import { Play, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { authenticatedFetch } from '@visapi/frontend-data';

interface TriggerResponse {
  success: boolean;
  jobId?: string;
  message?: string;
}

const workflows = [
  {
    id: 'visa-approval-notification',
    name: 'Visa Approval Notification',
    description: 'Send approval notification via Slack and WhatsApp',
  },
  {
    id: 'document-generation',
    name: 'Document Generation',
    description: 'Generate PDF documents for visa applications',
  },
  {
    id: 'status-update-broadcast',
    name: 'Status Update Broadcast',
    description: 'Broadcast application status updates to all channels',
  },
];

export default function TriggersPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, TriggerResponse>>({});

  const triggerWorkflow = async (workflowId: string) => {
    setLoading(workflowId);
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
      setLoading(null);
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
          <div className="space-y-6">
            {workflows.map((workflow) => {
              const result = results[workflow.id];
              const isLoading = loading === workflow.id;

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
                        {workflow.description}
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
                      disabled={isLoading}
                      className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      {isLoading ? 'Triggering...' : 'Trigger'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
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
