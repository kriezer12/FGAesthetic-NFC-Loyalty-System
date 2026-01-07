import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://axastglnfufdjhxphrei.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4YXN0Z2xuZnVmZGpoeHBocmVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3ODM4MTIsImV4cCI6MjA4MTM1OTgxMn0.2IRCrj394rTKFCCrCqWafbZuK-WRMOQ7pJ_8Alp99nE'

export const supabase = createClient(supabaseUrl, supabaseKey)