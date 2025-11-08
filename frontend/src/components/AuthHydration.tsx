'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'

/**
 * Component to ensure auth store hydration completes
 * This prevents logout on page refresh
 */
export function AuthHydration() {
  const { setHasHydrated, hasHydrated } = useAuthStore()

  useEffect(() => {
    // If not hydrated yet, check localStorage and set hydration state
    if (!hasHydrated && typeof window !== 'undefined') {
      // Small delay to ensure Zustand persist has time to rehydrate
      const timer = setTimeout(() => {
        setHasHydrated(true)
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [hasHydrated, setHasHydrated])

  return null
}

