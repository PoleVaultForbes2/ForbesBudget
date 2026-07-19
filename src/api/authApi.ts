import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import type { UserProfile } from '../types/budget'

interface ProfileRow {
  user_id: string
  username: string
  partner_name: string
}

function mapProfile(row: ProfileRow): UserProfile {
  return {
    userId: row.user_id,
    username: row.username,
    partnerName: row.partner_name,
  }
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })
  if (error) throw error
}

export async function signUp(
  email: string,
  password: string,
  username: string
): Promise<boolean> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { username: username.trim() },
    },
  })
  if (error) throw error
  return Boolean(data.session)
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}

export async function fetchProfile(user: User): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, username, partner_name')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) throw error
  if (data) return mapProfile(data as ProfileRow)

  const fallbackUsername = String(user.user_metadata.username || user.email?.split('@')[0] || 'User')
  const { data: created, error: createError } = await supabase
    .from('profiles')
    .insert({ user_id: user.id, username: fallbackUsername, partner_name: 'Partner' })
    .select('user_id, username, partner_name')
    .single()

  if (createError) throw createError
  return mapProfile(created as ProfileRow)
}

export async function updateProfileNames(
  userId: string,
  username: string,
  partnerName: string
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      username: username.trim(),
      partner_name: partnerName.trim() || 'Partner',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select('user_id, username, partner_name')
    .single()

  if (error) throw error
  return mapProfile(data as ProfileRow)
}
