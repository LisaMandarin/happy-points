'use client'

import React, { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Create a client
const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time of 5 minutes for Firebase data
      staleTime: 5 * 60 * 1000,
      // Cache time of 10 minutes  
      gcTime: 10 * 60 * 1000,
      // Retry failed requests
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false
        }
        return failureCount < 3
      },
      // Refetch on window focus for fresh data
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: false,
    },
  },
})

interface QueryProviderProps {
  children: React.ReactNode
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  // Create a new QueryClient instance for each app instance
  // This ensures that data is not shared between different app instances
  const [queryClient] = useState(() => createQueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}