'use client';

import React from 'react';
import { validatePassword, DEFAULT_PASSWORD_REQUIREMENTS, PasswordStrength } from '@visapi/shared-utils';
import { Check, X, Shield, AlertTriangle } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

const strengthColors = {
  0: 'bg-red-500',
  1: 'bg-red-400',
  2: 'bg-yellow-500',
  3: 'bg-blue-500',
  4: 'bg-green-500',
};

const strengthLabels = {
  0: 'Very Weak',
  1: 'Weak',
  2: 'Fair',
  3: 'Good',
  4: 'Very Strong',
};

const strengthIcons = {
  0: AlertTriangle,
  1: AlertTriangle,
  2: Shield,
  3: Shield,
  4: Shield,
};

export function PasswordStrengthIndicator({ password, className = '' }: PasswordStrengthIndicatorProps) {
  const strength: PasswordStrength = validatePassword(password, DEFAULT_PASSWORD_REQUIREMENTS);
  
  if (!password) {
    return null;
  }

  const StrengthIcon = strengthIcons[strength.score as keyof typeof strengthIcons];

  return (
    <div className={`bg-gradient-to-r from-visanet-green/5 to-visanet-blue/5 border border-visanet-green/20 rounded-lg p-3 space-y-3 ${className}`}>
      {/* Strength Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">
            Password Strength
          </span>
          <div className="flex items-center space-x-1">
            <StrengthIcon className={`h-4 w-4 ${
              strength.score >= 3 ? 'text-green-600' : 
              strength.score >= 2 ? 'text-yellow-600' : 'text-red-600'
            }`} />
            <span className={`text-sm font-medium ${
              strength.score >= 3 ? 'text-green-600' : 
              strength.score >= 2 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {strengthLabels[strength.score as keyof typeof strengthLabels]}
            </span>
          </div>
        </div>
        
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              strengthColors[strength.score as keyof typeof strengthColors]
            }`}
            style={{ width: `${(strength.score / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Requirements Checklist */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-foreground">
          Requirements
        </h4>
        <div className="grid grid-cols-1 gap-1">
          <RequirementItem
            met={strength.hasMinLength}
            label={`At least ${DEFAULT_PASSWORD_REQUIREMENTS.minLength} characters`}
          />
          <RequirementItem
            met={strength.hasUppercase}
            label="Uppercase letters (A-Z)"
          />
          <RequirementItem
            met={strength.hasLowercase}
            label="Lowercase letters (a-z)"
          />
          <RequirementItem
            met={strength.hasDigits}
            label="Numbers (0-9)"
          />
          <RequirementItem
            met={strength.hasSymbols}
            label="Symbols (!@#$...)"
          />
        </div>
      </div>

      {/* Feedback */}
      {strength.feedback.length > 0 && (
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-foreground">
            Suggestions
          </h4>
          <ul className="space-y-1">
            {strength.feedback.map((feedback, index) => (
              <li key={index} className="text-xs text-red-600 dark:text-red-400 flex items-start space-x-1">
                <X className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>{feedback}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface RequirementItemProps {
  met: boolean;
  label: string;
}

function RequirementItem({ met, label }: RequirementItemProps) {
  return (
    <div className="flex items-center space-x-2">
      <div className={`flex-shrink-0 ${met ? 'text-green-600' : 'text-gray-400'}`}>
        {met ? (
          <Check className="h-4 w-4" />
        ) : (
          <X className="h-4 w-4" />
        )}
      </div>
      <span className={`text-sm ${
        met ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
      }`}>
        {label}
      </span>
    </div>
  );
}