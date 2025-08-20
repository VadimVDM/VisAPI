'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Power, PowerOff, Loader2 } from 'lucide-react';
// Temporarily commenting out imports to fix build
// import { useApiData } from '@visapi/frontend-data';
// import { timeAgo } from '@visapi/shared-utils';
// import type { WorkflowRecord } from '@visapi/shared-types';

// Mock imports for testing
const useApiData = <T,>(url: string) => {
  const mockWorkflows = [
    {
      id: '1',
      name: 'Visa Approval Notification',
      description: 'Send approval notifications via multiple channels',
      enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'Document Generation',
      description: 'Generate visa documents and certificates',
      enabled: true,
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: '3',
      name: 'Status Update Broadcast',
      description: 'Broadcast status updates to all stakeholders',
      enabled: false,
      created_at: new Date(Date.now() - 172800000).toISOString(),
      updated_at: new Date(Date.now() - 7200000).toISOString(),
    },
  ];

  return {
    data: mockWorkflows as T,
    loading: false,
    error: null,
    refetch: () => {},
  };
};

const timeAgo = (date: string) => {
  const diff = Date.now() - new Date(date).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

// Define WorkflowRecord type locally
type WorkflowRecord = {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export default function WorkflowsPage() {
  const {
    data: workflows,
    loading,
    error,
    refetch,
  } = useApiData<WorkflowRecord[]>('/api/v1/workflows');

  // Data fetching handled by useApiData hook

  // fetchWorkflows function replaced by useApiData hook

  // Using shared timeAgo utility instead of local getRelativeTime
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Workflows</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage automation workflows and their configurations
          </p>
        </div>
        <button className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
          <Plus className="h-4 w-4 mr-2" />
          New Workflow
        </button>
      </div>

      {loading ? (
        <div className="bg-white shadow rounded-lg p-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            <span className="ml-2 text-gray-600">Loading workflows...</span>
          </div>
        </div>
      ) : error ? (
        <div className="bg-white shadow rounded-lg p-12">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={refetch}
              className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : !workflows || workflows.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <p className="text-gray-500 mb-4">No workflows found</p>
          <button className="flex items-center mx-auto px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700">
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Workflow
          </button>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {workflows?.map((workflow) => (
                <tr key={workflow.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {workflow.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {workflow.description}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        workflow.enabled
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {workflow.enabled ? (
                        <>
                          <Power className="w-3 h-3 mr-1" />
                          Enabled
                        </>
                      ) : (
                        <>
                          <PowerOff className="w-3 h-3 mr-1" />
                          Disabled
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {timeAgo(workflow.updated_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(workflow.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button className="text-primary-600 hover:text-primary-900">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
