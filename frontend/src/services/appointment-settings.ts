import { supabase } from '@/lib/supabase'

export interface AppointmentSettings {
  id?: string
  branch_id?: string
  default_duration: number
  buffer_time: number
  max_daily_appointments: number
  cancellation_notice: number
  enable_reschedule: boolean
  enable_auto_reminder: boolean
  working_hours_start: string
  working_hours_end: string
  lunch_break_start: string
  lunch_break_end: string
  created_at?: string
  updated_at?: string
}

const DEFAULT_SETTINGS: AppointmentSettings = {
  default_duration: 60,
  buffer_time: 15,
  max_daily_appointments: 20,
  cancellation_notice: 24,
  enable_reschedule: true,
  enable_auto_reminder: true,
  working_hours_start: '09:00',
  working_hours_end: '18:00',
  lunch_break_start: '12:00',
  lunch_break_end: '13:00',
}

// Fallback to localStorage key for settings
const LOCAL_STORAGE_KEY = 'fg_appointment_settings'

/**
 * Get branch ID - try to get from auth or use a default branch ID
 */
async function getBranchId(): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.user_metadata?.branch_id) {
      return user.user_metadata.branch_id
    }
    
    // Check user_profiles table if not in metadata
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('branch_id')
      .eq('id', user?.id)
      .single()
    
    if (profile?.branch_id) return profile.branch_id
  } catch (error) {
    console.error('Error getting branch ID:', error)
  }
  
  // Fallback to localStorage
  const stored = localStorage.getItem('branch_id')
  if (stored) return stored
  
  return 'default-branch-id'
}

/**
 * Fetch appointment settings from database
 */
export async function fetchAppointmentSettings(branchId?: string): Promise<AppointmentSettings> {
  try {
    const targetBranchId = branchId || await getBranchId()
    
    const { data, error } = await supabase
      .from('appointment_settings')
      .select('*')
      .eq('branch_id', targetBranchId)
      .maybeSingle()

    // If record doesn't exist, return defaults (it will be created on first save)
    if (error && error.code !== 'PGRST116') {
      console.warn('Could not fetch from database, using defaults:', error)
      // Try localStorage as fallback
      const stored = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${targetBranchId}`)
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
      }
      return DEFAULT_SETTINGS
    }

    // Convert snake_case from database to camelCase for frontend
    if (data) {
      return {
        id: data.id,
        branch_id: data.branch_id,
        default_duration: data.default_duration,
        buffer_time: data.buffer_time,
        max_daily_appointments: data.max_daily_appointments,
        cancellation_notice: data.cancellation_notice,
        enable_reschedule: data.enable_reschedule,
        enable_auto_reminder: data.enable_auto_reminder,
        working_hours_start: data.working_hours_start,
        working_hours_end: data.working_hours_end,
        lunch_break_start: data.lunch_break_start,
        lunch_break_end: data.lunch_break_end,
        created_at: data.created_at,
        updated_at: data.updated_at,
      }
    }

    // If no record found, try localStorage fallback
    const stored = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${targetBranchId}`)
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
    }

    return DEFAULT_SETTINGS
  } catch (error) {
    console.error('Error fetching appointment settings:', error)
    return DEFAULT_SETTINGS
  }
}

/**
 * Save appointment settings to database
 */
export async function saveAppointmentSettings(settings: AppointmentSettings): Promise<{ success: boolean; error?: string }> {
  try {
    const targetBranchId = settings.branch_id || await getBranchId()

    // Prepare data with snake_case for database
    const dbData = {
      branch_id: targetBranchId,
      default_duration: settings.default_duration,
      buffer_time: settings.buffer_time,
      max_daily_appointments: settings.max_daily_appointments,
      cancellation_notice: settings.cancellation_notice,
      enable_reschedule: settings.enable_reschedule,
      enable_auto_reminder: settings.enable_auto_reminder,
      working_hours_start: settings.working_hours_start,
      working_hours_end: settings.working_hours_end,
      lunch_break_start: settings.lunch_break_start,
      lunch_break_end: settings.lunch_break_end,
    }

    let result

    if (settings.id) {
      // Update existing by ID
      result = await supabase
        .from('appointment_settings')
        .update(dbData)
        .eq('id', settings.id)
    } else {
      // Upsert on branch_id
      result = await supabase
        .from('appointment_settings')
        .upsert([dbData], { onConflict: 'branch_id' })
    }

    if (result.error) {
      console.error('Database error:', result.error)
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_${targetBranchId}`, JSON.stringify(settings))
      return { success: true, error: 'Saved locally (database unavailable)' }
    }

    localStorage.setItem(`${LOCAL_STORAGE_KEY}_${targetBranchId}`, JSON.stringify(settings))

    return { success: true }
  } catch (error) {
    console.error('Error saving appointment settings:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Delete appointment settings
 */
export async function deleteAppointmentSettings(branchId?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const targetBranchId = branchId || await getBranchId()

    const { error } = await supabase
      .from('appointment_settings')
      .delete()
      .eq('branch_id', targetBranchId)

    if (error) {
      return { success: false, error: error.message }
    }

    // Also clear localStorage
    localStorage.removeItem(`${LOCAL_STORAGE_KEY}_${targetBranchId}`)

    return { success: true }
  } catch (error) {
    console.error('Error deleting appointment settings:', error)
    return { success: false, error: String(error) }
  }
}
