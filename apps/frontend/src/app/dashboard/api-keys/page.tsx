'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Key,
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { authenticatedFetch, useApiData } from '@visapi/frontend-data';
import { timeAgo } from '@visapi/shared-utils';
import type { ApiKeyRecord } from '@visapi/shared-types';

// Frontend-specific type that includes the raw key for newly created keys
type ApiKeyWithSecret = Omit<ApiKeyRecord, 'hashed_key' | 'hashed_secret' | 'last_used_at'> & {
  key?: string; // Only present when creating new key
  last_used?: string; // Simplified for display
};

const availableScopes = [
  'admin:read',
  'admin:write',
  'triggers:create',
  'workflows:read',
  'workflows:create',
  'workflows:update',
  'workflows:delete',
  'logs:read',
  'api-keys:read',
  'api-keys:create',
  'api-keys:delete',
];

export default function ApiKeysPage() {
  const { data: apiKeys, loading, error, refetch } = useApiData<ApiKeyWithSecret[]>('/api/v1/api-keys');
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createdKey, setCreatedKey] = useState<ApiKeyWithSecret | null>(null);
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [newKeyData, setNewKeyData] = useState({
    name: '',
    scopes: [] as string[],
    expiresIn: '90', // days
  });

  // Data fetching handled by useApiData hook

  // fetchApiKeys function replaced by useApiData hook

  async function createApiKey() {
    try {
      setCreating(true);
      setActionError(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await authenticatedFetch(`${apiUrl}/api/v1/api-keys`, {
        method: 'POST',
        body: JSON.stringify({
          name: newKeyData.name,
          scopes: newKeyData.scopes,
          expiresIn: parseInt(newKeyData.expiresIn),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create API key: ${response.statusText}`);
      }

      const data = await response.json();
      setCreatedKey(data);
      refetch(); // Refresh the list
    } catch (err) {
      console.error('Error creating API key:', err);
      setActionError(err instanceof Error ? err.message : 'Failed to create API key');
    } finally {
      setCreating(false);
    }
  }

  async function deleteApiKey(id: string) {
    if (
      !confirm(
        'Are you sure you want to delete this API key? This action cannot be undone.'
      )
    ) {
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await authenticatedFetch(
        `${apiUrl}/api/v1/api-keys/${id}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete API key: ${response.statusText}`);
      }

      refetch(); // Refresh the list
    } catch (err) {
      console.error('Error deleting API key:', err);
      setActionError(err instanceof Error ? err.message : 'Failed to delete API key');
    }
  }

  const toggleKeyVisibility = (keyId: string) => {
    setShowKey((prev) => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // TODO: Show toast notification
  };

  const handleScopeToggle = (scope: string) => {
    setNewKeyData((prev) => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter((s) => s !== scope)
        : [...prev.scopes, scope],
    }));
  };

  const maskKey = (key: string) => {
    return key.slice(0, 12) + '•'.repeat(20) + key.slice(-8);
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">API Keys</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage API keys for accessing VisAPI services
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create API Key
        </button>
      </div>

      {/* API Keys List */}
      {loading ? (
        <div className="bg-white shadow rounded-lg p-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            <span className="ml-2 text-gray-600">Loading API keys...</span>
          </div>
        </div>
      ) : error ? (
        <div className="bg-white shadow rounded-lg p-12">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={refetch}
              className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : !apiKeys || apiKeys.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No API keys found</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center mx-auto px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Your First API Key
          </button>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <div className="space-y-4">
              {apiKeys?.map((apiKey) => (
                <div
                  key={apiKey.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <Key className="h-5 w-5 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {apiKey.name}
                        </h3>
                        <div className="mt-1 flex items-center space-x-2">
                          <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                            {apiKey.prefix
                              ? `${apiKey.prefix}••••••••`
                              : 'Key hidden'}
                          </code>
                          <button
                            onClick={() => copyToClipboard(apiKey.prefix || '')}
                            className="text-gray-400 hover:text-gray-600"
                            title="Copy prefix"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteApiKey(apiKey.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Scopes:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {apiKey.scopes.map((scope) => (
                          <span
                            key={scope}
                            className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded"
                          >
                            {scope}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Last used:</span>
                      <div className="text-gray-900">
                        {timeAgo(apiKey.last_used)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Expires:</span>
                      <div className="text-gray-900">
                        {apiKey.expires_at 
                          ? new Date(apiKey.expires_at).toLocaleDateString() 
                          : 'Never'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create API Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Create New API Key
              </h3>

              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    type="text"
                    value={newKeyData.name}
                    onChange={(e) =>
                      setNewKeyData((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g., Production Webhook Handler"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Expires in
                  </label>
                  <select
                    value={newKeyData.expiresIn}
                    onChange={(e) =>
                      setNewKeyData((prev) => ({
                        ...prev,
                        expiresIn: e.target.value,
                      }))
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="30">30 days</option>
                    <option value="90">90 days</option>
                    <option value="180">180 days</option>
                    <option value="365">1 year</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Scopes
                  </label>
                  <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                    {availableScopes.map((scope) => (
                      <label key={scope} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newKeyData.scopes.includes(scope)}
                          onChange={() => handleScopeToggle(scope)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {scope}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </form>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreatedKey(null);
                    setNewKeyData({ name: '', scopes: [], expiresIn: '90' });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await createApiKey();
                    if (!error) {
                      setShowCreateModal(false);
                      setNewKeyData({ name: '', scopes: [], expiresIn: '90' });
                    }
                  }}
                  disabled={
                    creating ||
                    !newKeyData.name ||
                    newKeyData.scopes.length === 0
                  }
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {creating && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  Create Key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal for Created Key */}
      {createdKey && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center mb-4">
                <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">
                  API Key Created Successfully
                </h3>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-4">
                <p className="text-sm text-amber-800 font-semibold mb-2">
                  ⚠️ Important: Copy this key now!
                </p>
                <p className="text-sm text-amber-700">
                  This is the only time you'll see the full API key. Store it
                  securely.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {createdKey.name}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    API Key
                  </label>
                  <div className="mt-1 flex items-center space-x-2">
                    <code className="flex-1 text-xs font-mono bg-gray-100 px-2 py-2 rounded break-all">
                      {createdKey.key}
                    </code>
                    <button
                      onClick={() => copyToClipboard(createdKey.key || '')}
                      className="flex-shrink-0 text-primary-600 hover:text-primary-900"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Expires
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {createdKey.expires_at 
                      ? new Date(createdKey.expires_at).toLocaleDateString() 
                      : 'Never'}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={() => setCreatedKey(null)}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
