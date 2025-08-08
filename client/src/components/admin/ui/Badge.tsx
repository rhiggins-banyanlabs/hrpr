import { ReactNode } from 'react'

type BadgeVariant = 'default' | 'success' | 'error' | 'warning' | 'info'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-gray-500/20 text-gray-300',
  success: 'bg-green-500/20 text-green-300',
  error: 'bg-red-500/20 text-red-300',
  warning: 'bg-yellow-500/20 text-yellow-300',
  info: 'bg-blue-500/20 text-blue-300'
}

export default function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const baseClasses = 'px-2 py-1 rounded text-xs font-medium'
  
  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  )
}