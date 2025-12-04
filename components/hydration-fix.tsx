'use client'

import { useEffect } from 'react'

/**
 * This component fixes hydration errors caused by browser extensions
 * (Grammarly, ProtonPass, etc.) that inject attributes into the DOM
 */
export function HydrationFix() {
  useEffect(() => {
    // Suppress hydration warnings and errors
    const originalError = console.error
    const originalWarn = console.warn

    console.error = (...args: any[]) => {
      const message = args[0]?.toString() || ''

      // Filter out hydration and extension-related errors
      if (
        message.includes('Hydration') ||
        message.includes('hydration') ||
        message.includes('data-new-gr-c-s-check-loaded') ||
        message.includes('data-gr-ext-installed') ||
        message.includes('data-protonpass') ||
        message.includes("didn't match") ||
        message.includes("did not match") ||
        message.includes('Text content does not match') ||
        message.includes('server rendered HTML') ||
        message.includes('client properties') ||
        (message.includes('Prop') && message.includes('did not match')) ||
        message.includes('tree hydrated')
      ) {
        return
      }
      originalError.apply(console, args)
    }

    console.warn = (...args: any[]) => {
      const message = args[0]?.toString() || ''

      // Filter out hydration warnings
      if (
        message.includes('Hydration') ||
        message.includes('hydration') ||
        message.includes('tree hydrated')
      ) {
        return
      }
      originalWarn.apply(console, args)
    }

    return () => {
      console.error = originalError
      console.warn = originalWarn
    }
  }, [])

  return null
}
