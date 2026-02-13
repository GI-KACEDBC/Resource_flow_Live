/**
 * Displays Ghana Card verification errors: Invalid ID, Name Mismatch, or success.
 */
import React from 'react';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

const GhanaCardVerificationBanner = ({ type, message, onDismiss }) => {
  if (!type || !message) return null;

  const config = {
    invalid_id: {
      icon: XCircle,
      bgClass: 'bg-red-50 border-red-200',
      iconClass: 'text-red-600',
      textClass: 'text-red-800',
    },
    name_mismatch: {
      icon: AlertCircle,
      bgClass: 'bg-amber-50 border-amber-200',
      iconClass: 'text-amber-600',
      textClass: 'text-amber-800',
    },
    verified: {
      icon: CheckCircle,
      bgClass: 'bg-emerald-50 border-emerald-200',
      iconClass: 'text-emerald-600',
      textClass: 'text-emerald-800',
    },
    error: {
      icon: AlertCircle,
      bgClass: 'bg-red-50 border-red-200',
      iconClass: 'text-red-600',
      textClass: 'text-red-800',
    },
  };

  const { icon: Icon, bgClass, iconClass, textClass } = config[type] || config.error;

  return (
    <div className={`rounded-lg border p-4 flex items-start gap-3 ${bgClass}`}>
      <Icon className={`shrink-0 mt-0.5 ${iconClass}`} size={20} />
      <p className={`flex-1 text-sm font-medium ${textClass}`}>{message}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-slate-500 hover:text-slate-700 text-sm"
          aria-label="Dismiss"
        >
          Dismiss
        </button>
      )}
    </div>
  );
};

export default GhanaCardVerificationBanner;
