'use client';

import React, { useState } from 'react';
import { generateSecurePassword } from '@visapi/shared-utils';
import { Button } from './button';
import { Copy, RotateCcw, Check } from 'lucide-react';

interface PasswordGeneratorProps {
  onPasswordGenerated: (password: string) => void;
  length?: number;
  className?: string;
}

export function PasswordGenerator({ 
  onPasswordGenerated, 
  length = 14, 
  className = '' 
}: PasswordGeneratorProps) {
  const [generatedPassword, setGeneratedPassword] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const handleGeneratePassword = () => {
    const newPassword = generateSecurePassword(length);
    setGeneratedPassword(newPassword);
    onPasswordGenerated(newPassword);
    setCopied(false);
  };

  const handleCopyPassword = async () => {
    if (generatedPassword) {
      await navigator.clipboard.writeText(generatedPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Password Generator
        </label>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {length} characters
        </span>
      </div>
      
      <div className="flex space-x-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGeneratePassword}
          className="flex items-center space-x-2"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Generate</span>
        </Button>
        
        {generatedPassword && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyPassword}
            className="flex items-center space-x-2"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </Button>
        )}
      </div>

      {generatedPassword && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md border">
          <div className="flex items-center justify-between">
            <code className="text-sm font-mono break-all text-gray-900 dark:text-gray-100">
              {generatedPassword}
            </code>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Secure password with uppercase, lowercase, numbers, and symbols
          </p>
        </div>
      )}
    </div>
  );
}