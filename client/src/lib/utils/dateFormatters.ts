/**
 * Formats a date string into a human-readable format
 * Handles various date formats and invalid dates gracefully
 */
export function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return "No date"
    
    try {
      let date: Date
      
      if (typeof dateString === 'string') {
        // Handle PostgreSQL timestamp format
        date = new Date(dateString)
      } else {
        date = new Date(dateString)
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.log('Invalid date string:', dateString)
        return `Invalid: ${dateString}`
      }
      
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      })
    } catch (error) {
      console.error('Date formatting error:', error, 'for date:', dateString)
      return `Error: ${dateString}`
    }
  }
  
  /**
   * Calculates and formats the duration between two dates
   */
  export function formatDuration(startTime: string, endTime?: string): string {
    if (!endTime) return "Ongoing"
    
    try {
      const start = new Date(startTime)
      const end = new Date(endTime)
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return "Invalid duration"
      }
      
      const diff = end.getTime() - start.getTime()
      const minutes = Math.floor(diff / (1000 * 60))
      
      if (minutes < 60) return `${minutes}m`
      
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
    } catch (error) {
      console.error('Duration formatting error:', error)
      return "Error calculating duration"
    }
  }
  
  /**
   * Formats a relative time (e.g., "2 hours ago")
   */
  export function formatRelativeTime(dateString: string): string {
    if (!dateString) return "Unknown time"
    
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      
      const minutes = Math.floor(diffMs / (1000 * 60))
      const hours = Math.floor(minutes / 60)
      const days = Math.floor(hours / 24)
      
      if (minutes < 1) return "Just now"
      if (minutes < 60) return `${minutes}m ago`
      if (hours < 24) return `${hours}h ago`
      if (days < 7) return `${days}d ago`
      
      return formatDate(dateString)
    } catch (error) {
      return formatDate(dateString)
    }
  }