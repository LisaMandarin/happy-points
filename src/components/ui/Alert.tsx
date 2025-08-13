import React from 'react'
import { Alert as AntAlert } from 'antd'
import type { AlertProps as AntAlertProps } from 'antd'

interface AlertProps {
  variant?: 'success' | 'error' | 'warning' | 'info'
  children: React.ReactNode
  className?: string
  closable?: boolean
  onClose?: () => void
}

const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  children,
  className = '',
  closable = false,
  onClose
}) => {
  const getAntType = (): AntAlertProps['type'] => {
    switch (variant) {
      case 'success':
        return 'success'
      case 'error':
        return 'error'
      case 'warning':
        return 'warning'
      case 'info':
      default:
        return 'info'
    }
  }

  return (
    <AntAlert
      message={children}
      type={getAntType()}
      className={`mb-4 ${className}`}
      closable={closable}
      onClose={onClose}
      showIcon
    />
  )
}

export default Alert