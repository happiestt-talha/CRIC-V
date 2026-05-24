'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

const COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-indigo-500',
]

const getColorForUsername = (username) => {
  if (!username) return COLORS[0]
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
  }
  return COLORS[Math.abs(hash) % COLORS.length]
}

export default function UserAvatar({ user, className, size = 'md' }) {
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-9 w-9 text-sm',
    lg: 'h-24 w-24 text-2xl',
  }

  const initials = user?.username?.charAt(0)?.toUpperCase() || 'U'
  const bgColor = getColorForUsername(user?.username)
  
  // Base URL for backend if avatar_url is a relative path
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '')
  const avatarPath = user?.avatar_url?.replace(/\\/g, '/')
  
  const avatarSrc = avatarPath 
    ? (avatarPath.startsWith('http') 
        ? avatarPath 
        : `${baseUrl}${avatarPath.startsWith('/') ? '' : '/'}${avatarPath}`)
    : null

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {avatarSrc && (
        <AvatarImage 
            src={avatarSrc} 
            alt={user?.username} 
            className="object-cover"
        />
      )}
      <AvatarFallback className={cn(bgColor, "text-white font-bold")}>
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}
