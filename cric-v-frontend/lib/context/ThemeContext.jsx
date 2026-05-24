'use client'

import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({
  theme: 'dark',
  toggleTheme: () => {},
  isDark: true,
})

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Read saved preference on mount
    const saved = localStorage.getItem('cric-v-theme')
    const initial = saved || 'dark'
    setTheme(initial)
    applyTheme(initial)
    setMounted(true)
  }, [])

  const applyTheme = (t) => {
    const root = document.documentElement
    if (t === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    
    const updateTheme = () => {
      setTheme(next)
      applyTheme(next)
      localStorage.setItem('cric-v-theme', next)
    }

    // Check if browser supports View Transitions API
    if (!document.startViewTransition) {
      updateTheme()
    } else {
      document.documentElement.classList.add('theme-transitioning')
      const transition = document.startViewTransition(() => {
        updateTheme()
      })
      
      transition.finished.finally(() => {
        document.documentElement.classList.remove('theme-transitioning')
      })
    }
  }

  // Prevent flash of wrong theme on mount
  if (!mounted) return null

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
