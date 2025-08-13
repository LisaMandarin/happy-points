import { useState, useEffect } from 'react'

interface UseModalDataOptions<T> {
  loadDataFn: () => Promise<T>
  dependencies: any[]
  errorMessage?: string
}

export const useModalData = <T>({
  loadDataFn,
  dependencies,
  errorMessage = 'Failed to load data'
}: UseModalDataOptions<T>) => {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await loadDataFn()
      setData(result)
    } catch (error) {
      console.error('Error loading modal data:', error)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (dependencies.some(dep => dep !== null && dep !== undefined)) {
      loadData()
    }
  }, dependencies)

  const reload = () => loadData()

  return {
    data,
    loading,
    error,
    reload
  }
}