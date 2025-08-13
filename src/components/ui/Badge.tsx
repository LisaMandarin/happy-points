import React from 'react'
import { Tag } from 'antd'
import type { TagProps } from 'antd'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = ''
}) => {
  const getColor = (): string => {
    switch (variant) {
      case 'success':
        return 'green'
      case 'warning':
        return 'orange'
      case 'error':
        return 'red'
      case 'info':
        return 'blue'
      case 'default':
      default:
        return 'default'
    }
  }

  const getSizeClass = (): string => {
    switch (size) {
      case 'sm':
        return 'text-xs px-2 py-0.5'
      case 'lg':
        return 'text-sm px-3 py-1'
      case 'md':
      default:
        return 'text-sm px-2.5 py-0.5'
    }
  }

  return (
    <Tag
      color={getColor()}
      className={`rounded-full font-medium ${getSizeClass()} ${className}`}
    >
      {children}
    </Tag>
  )
}

export default Badge