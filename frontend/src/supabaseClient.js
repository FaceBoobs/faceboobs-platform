import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || "https://feocyyvlqkoudfgfcken.supabase.co"
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlb2N5eXZscWtvdWRmZ2Zja2VuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NjExNTksImV4cCI6MjA3MzUzNzE1OX0.s9h34lE0ciyaKB3MLZDgXEXu6KJJ_l6tyeq-dKunHZ4"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)