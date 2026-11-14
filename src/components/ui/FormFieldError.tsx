'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface FormFieldErrorProps {
  message?: string;
  className?: string;
  id?: string;
}

export const FormFieldError: React.FC<FormFieldErrorProps> = ({
  message,
  className = '',
  id,
}) => {
  if (!message) return null;

  return (
    <p
      id={id}
      role="alert"
      className={`mt-1.5 flex items-start gap-1.5 text-[11px] sm:text-xs leading-snug font-medium text-rose-600 dark:text-rose-400 break-words ${className}`}
    >
      <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
      <span className="min-w-0 flex-1">{message}</span>
    </p>
  );
};

export default FormFieldError;
