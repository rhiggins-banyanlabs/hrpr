import { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  required?: boolean
}

export function FormInput({ label, error, required, className = '', ...props }: FormInputProps) {
  const baseClasses = 'w-full p-3 bg-white/10 border rounded-lg text-white placeholder-white/50 focus:outline-none transition-colors'
  const errorClasses = error ? 'border-red-500 focus:border-red-400' : 'border-white/20 focus:border-indigo-500'
  
  return (
    <div>
      <label className="block text-white/70 text-sm mb-2">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <input
        className={`${baseClasses} ${errorClasses} ${className}`}
        {...props}
      />
      {error && (
        <p className="text-red-400 text-xs mt-1">{error}</p>
      )}
    </div>
  )
}

interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
  required?: boolean
}

export function FormTextarea({ label, error, required, className = '', ...props }: FormTextareaProps) {
  const baseClasses = 'w-full p-3 bg-white/10 border rounded-lg text-white placeholder-white/50 focus:outline-none transition-colors resize-vertical'
  const errorClasses = error ? 'border-red-500 focus:border-red-400' : 'border-white/20 focus:border-indigo-500'
  
  return (
    <div>
      <label className="block text-white/70 text-sm mb-2">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <textarea
        className={`${baseClasses} ${errorClasses} ${className}`}
        rows={3}
        {...props}
      />
      {error && (
        <p className="text-red-400 text-xs mt-1">{error}</p>
      )}
    </div>
  )
}

interface FormSelectProps extends InputHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  required?: boolean
  options: { value: string; label: string }[]
  placeholder?: string
}

export function FormSelect({ label, error, required, options, placeholder, className = '', ...props }: FormSelectProps) {
  const baseClasses = 'w-full p-3 bg-white/10 border rounded-lg text-white focus:outline-none transition-colors'
  const errorClasses = error ? 'border-red-500 focus:border-red-400' : 'border-white/20 focus:border-indigo-500'
  
  return (
    <div>
      <label className="block text-white/70 text-sm mb-2">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <select
        className={`${baseClasses} ${errorClasses} ${className}`}
        {...props}
      >
        {placeholder && (
          <option value="" className="bg-slate-800">
            {placeholder}
          </option>
        )}
        {options.map(option => (
          <option key={option.value} value={option.value} className="bg-slate-800">
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-red-400 text-xs mt-1">{error}</p>
      )}
    </div>
  )
}