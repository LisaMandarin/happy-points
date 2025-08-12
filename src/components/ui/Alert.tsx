import React from 'react'

interface AlertProps {
  variant?: 'success' | 'error' | 'warning' | 'info'
  children: React.ReactNode
  className?: string
}

const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  children,
  className = ''
}) => {
  const variantClasses = {
    success: 'bg-green-100 border-green-400 text-green-700',
    error: 'bg-red-100 border-red-400 text-red-700',
    warning: 'bg-yellow-100 border-yellow-400 text-yellow-700',
    info: 'bg-blue-100 border-blue-400 text-blue-700',
  }
  
  const iconClasses = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  }
  
  return (
    <div
      className={`
        border px-4 py-3 rounded mb-4 flex items-start
        ${variantClasses[variant]}
        ${className}
      `}
      role="alert"
    >
      <span className="mr-2 font-bold text-lg" aria-hidden="true">
        {iconClasses[variant]}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  )
}

export default Alert