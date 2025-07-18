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
    <div className={`bg-gradient-to-r from-visanet-blue/5 to-visanet-green/5 border border-visanet-blue/20 rounded-lg p-3 space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">
          Password Generator
        </label>
      </div>
      
      <div className="flex space-x-2">
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={handleGeneratePassword}
          className="flex items-center space-x-1 h-7 px-2 text-xs"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Generate</span>
        </Button>
        
        {generatedPassword && (
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={handleCopyPassword}
            className="flex items-center space-x-1 h-7 px-2 text-xs"
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </Button>
        )}
      </div>

      {generatedPassword && (
        <div className="p-2 bg-background/50 border border-border rounded-md">
          <code className="text-xs font-mono break-all text-foreground">
            {generatedPassword}
          </code>
        </div>
      )}
    </div>
  );
}