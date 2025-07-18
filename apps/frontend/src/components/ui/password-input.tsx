'use client';

import React, { useState, forwardRef } from 'react';
import { Eye, EyeOff, RotateCcw } from 'lucide-react';
import { generateSecurePassword } from '@visapi/shared-utils';
import { Input } from './input';
import { Button } from './button';
import { PasswordGenerator } from './password-generator';
import { PasswordStrengthIndicator } from './password-strength-indicator';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  showGenerator?: boolean;
  showStrengthIndicator?: boolean;
  showRequirements?: boolean;
  generatorLength?: number;
  onPasswordChange?: (password: string) => void;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ 
    showGenerator = false, 
    showStrengthIndicator = false, 
    showRequirements = false,
    generatorLength = 14,
    onPasswordChange,
    className = '',
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [password, setPassword] = useState(props.value as string || '');
    const [hasInteracted, setHasInteracted] = useState(false);

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newPassword = e.target.value;
      setPassword(newPassword);
      setHasInteracted(true);
      onPasswordChange?.(newPassword);
      props.onChange?.(e);
    };

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
    };

    const handleGeneratePassword = () => {
      const newPassword = generateSecurePassword(generatorLength);
      setPassword(newPassword);
      setHasInteracted(true);
      onPasswordChange?.(newPassword);
      
      // Create a synthetic event to trigger form validation
      const syntheticEvent = {
        target: { value: newPassword },
        currentTarget: { value: newPassword },
      } as React.ChangeEvent<HTMLInputElement>;
      
      props.onChange?.(syntheticEvent);
    };

    return (
      <div className="space-y-4">
        <div className="relative">
          <button
            type="button"
            className="absolute left-3 top-1/2 -translate-y-1/2 p-0 border-0 bg-transparent hover:bg-transparent focus:outline-none z-10"
            onClick={togglePasswordVisibility}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          <Input
            {...props}
            ref={ref}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={handlePasswordChange}
            className={`pl-10 ${showGenerator ? 'pr-24' : 'pr-4'} ${className}`}
          />
          {showGenerator && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium bg-visanet-blue/10 hover:bg-visanet-blue/20 border border-visanet-blue/20 rounded-md text-visanet-blue flex items-center space-x-1 transition-colors"
              onClick={handleGeneratePassword}
            >
              <span>Generate</span>
              <RotateCcw className="h-3 w-3" />
            </button>
          )}
        </div>

        {showRequirements && !hasInteracted && (
          <div className="bg-visanet-blue/10 border border-visanet-blue/20 rounded-lg p-3">
            <p className="text-sm text-foreground flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-2 text-visanet-blue flex-shrink-0">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                <path d="m7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Must be at least 12 characters with uppercase, lowercase, numbers, and symbols
            </p>
          </div>
        )}

        {showStrengthIndicator && hasInteracted && (
          <PasswordStrengthIndicator password={password} />
        )}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';