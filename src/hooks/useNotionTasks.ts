import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { NotionTask } from '../types'

export function useNotionTasks() {
  const [tasks, setTasks] = useState<NotionTask[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.functions.invoke('notion-tasks')
      if (error) throw error
      setTasks(data?.tasks || [])
    } catch (e) {
      setError('无法加载任务，请检查设置中的 Notion Token')
    } finally {
      setLoading(false)
    }
  }, [])

  return { tasks, loading, error, fetchTasks }
}
