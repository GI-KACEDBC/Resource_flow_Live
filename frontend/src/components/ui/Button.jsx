import React from 'react';

export const Button = ({
  variant = 'primary',
  icon: Icon,
  children,
  className = '',
  disabled,
  size = 'md',
  ...props
}) => {
  const sizeStyles = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  
  const baseStyles = `${sizeStyles[size]} rounded-lg font-semibold transition flex items-center justify-center gap-2`;
  
  const variants = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-300',
    secondary: 'bg-slate-900 text-white hover:bg-emerald-600 disabled:bg-slate-300',
    outline: 'border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 disabled:border-slate-300 disabled:text-slate-300',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-slate-300',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};
