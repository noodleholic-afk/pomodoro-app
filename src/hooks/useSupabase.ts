import { useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { PomodoroSession, UserSettings } from '../types'

export function useSupabase(
  userId: string | null,
  onSessionUpdate: (session: PomodoroSession) => void
) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Subscribe to realtime changes
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`session:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pomodoro_sessions', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.new) onSessionUpdate(payload.new as PomodoroSession)
        }
      )
      .subscribe()
    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [userId, onSessionUpdate])

  const upsertSession = useCallback(async (session: Partial<PomodoroSession>) => {
    if (!userId) return
    await supabase
      .from('pomodoro_sessions')
      .upsert({ ...session, user_id: userId, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  }, [userId])

  const fetchSession = useCallback(async (): Promise<PomodoroSession | null> => {
    if (!userId) return null
    const { data } = await supabase
      .from('pomodoro_sessions')
      .select('*')
      .eq('user_id', userId)
      .single()
    return data as PomodoroSession | null
  }, [userId])

  const fetchSettings = useCallback(async (): Promise<UserSettings | null> => {
    if (!userId) return null
    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single()
    return data as UserSettings | null
  }, [userId])

  const upsertSettings = useCallback(async (settings: Partial<UserSettings>) => {
    if (!userId) return
    await supabase
      .from('user_settings')
      .upsert({ ...settings, user_id: userId }, { onConflict: 'user_id' })
  }, [userId])

  return { upsertSession, fetchSession, fetchSettings, upsertSettings }
}
