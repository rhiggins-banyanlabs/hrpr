import { ReactNode, ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
  secondary: 'bg-white/10 hover:bg-white/20 text-white',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  ghost: 'text-white/70 hover:text-white hover:bg-white/10'
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2',
  lg: 'px-6 py-3 text-lg'
}

export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md',
  loading = false,
  fullWidth = false,
  className = '',
  disabled,
  ...props 
}: ButtonProps) {
  const baseClasses = 'font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer'
  const widthClasses = fullWidth ? 'w-full' : ''
  const disabledClasses = (disabled || loading) ? 'opacity-50 cursor-not-allowed' : ''
  
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClasses} ${disabledClasses} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
          Loading...
        </div>
      ) : children}
    </button>
  )
}