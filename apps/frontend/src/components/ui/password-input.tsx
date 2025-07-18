'use client';

import React, { useState, forwardRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from './input';
import { Button } from './button';
import { PasswordGenerator } from './password-generator';
import { PasswordStrengthIndicator } from './password-strength-indicator';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  showGenerator?: boolean;
  showStrengthIndicator?: boolean;
  generatorLength?: number;
  onPasswordChange?: (password: string) => void;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ 
    showGenerator = false, 
    showStrengthIndicator = false, 
    generatorLength = 14,
    onPasswordChange,
    className = '',
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [password, setPassword] = useState(props.value as string || '');

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newPassword = e.target.value;
      setPassword(newPassword);
      onPasswordChange?.(newPassword);
      props.onChange?.(e);
    };

    const handleGeneratedPassword = (generatedPassword: string) => {
      setPassword(generatedPassword);
      onPasswordChange?.(generatedPassword);
      
      // Create a synthetic event to trigger form validation
      const syntheticEvent = {
        target: { value: generatedPassword },
        currentTarget: { value: generatedPassword },
      } as React.ChangeEvent<HTMLInputElement>;
      
      props.onChange?.(syntheticEvent);
    };

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
    };

    return (
      <div className="space-y-4">
        <div className="relative">
          <Input
            {...props}
            ref={ref}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={handlePasswordChange}
            className={`pr-10 ${className}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={togglePasswordVisibility}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-gray-400" />
            ) : (
              <Eye className="h-4 w-4 text-gray-400" />
            )}
          </Button>
        </div>

        {showGenerator && (
          <PasswordGenerator
            onPasswordGenerated={handleGeneratedPassword}
            length={generatorLength}
          />
        )}

        {showStrengthIndicator && (
          <PasswordStrengthIndicator password={password} />
        )}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';