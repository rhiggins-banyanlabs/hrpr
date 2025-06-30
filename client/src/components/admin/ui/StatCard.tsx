import Card from './Card'

interface StatCardProps {
  title: string
  value: string | number
  icon?: React.ReactNode
  iconColor?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

export default function StatCard({ 
  title, 
  value, 
  icon, 
  iconColor = 'bg-blue-500',
  trend,
  className = '' 
}: StatCardProps) {
  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-white/70 text-sm mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {trend && (
            <div className="flex items-center mt-2">
              <span className={`text-sm font-medium ${
                trend.isPositive ? 'text-green-400' : 'text-red-400'
              }`}>
                {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
              </span>
              <span className="text-white/60 text-sm ml-2">vs last period</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`p-3 rounded-lg ${iconColor}/20 flex-shrink-0`}>
            <div className={`w-6 h-6 ${iconColor} rounded flex items-center justify-center`}>
              {icon}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}