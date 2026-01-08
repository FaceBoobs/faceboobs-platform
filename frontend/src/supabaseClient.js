import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://feocyyvlqkoudfgfcken.supabase.co'
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlb2N5eXZscWtvdWRmZ2Zja2VuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NjExNTksImV4cCI6MjA3MzUzNzE1OX0.s9h34lE0ciyaKB3MLZDgXEXu6KJJ_l6tyeq-dKunHZ4'

// Log Supabase configuration on startup
console.log('🔧 Supabase Configuration:')
console.log('   📍 URL:', supabaseUrl)
console.log('   🔑 Anon Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING')
console.log('   📦 Source:', process.env.REACT_APP_SUPABASE_URL ? 'Environment Variable' : 'Hardcoded Fallback')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase credentials missing!')
  console.error('⚠️ Please check your .env.local file and ensure REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY are set')
}

// Named export only - use: import { supabase } from './supabaseClient'
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
})

// Test connection and detect common issues
const testConnection = async () => {
  try {
    console.log('🔍 Testing Supabase connection...')
    const { error } = await supabase.from('users').select('count', { count: 'exact', head: true })

    if (error) {
      console.error('❌ Supabase Connection Error:', error.message)

      // Check for common error patterns
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        console.error('⚠️ NETWORK ERROR DETECTED:')
        console.error('   → This usually means one of the following:')
        console.error('   1. The Supabase project might be PAUSED - check your Supabase dashboard')
        console.error('   2. CORS configuration issue')
        console.error('   3. Invalid Supabase URL')
        console.error('   → Please visit: https://app.supabase.com to check your project status')
      }

      if (error.message.includes('521') || error.code === 521) {
        console.error('⚠️ 521 ERROR (Server Down) DETECTED:')
        console.error('   → Your Supabase project appears to be PAUSED or DOWN')
        console.error('   → Go to https://app.supabase.com and check if your project needs to be resumed')
        console.error('   → Project URL:', supabaseUrl)
      }

      return false
    }

    console.log('✅ Supabase connection successful!')
    return true
  } catch (err) {
    console.error('❌ Supabase Connection Test Failed:', err)
    console.error('⚠️ POSSIBLE CAUSES:')
    console.error('   1. Project might be paused - check Supabase dashboard at https://app.supabase.com')
    console.error('   2. Network connectivity issue')
    console.error('   3. Invalid credentials')
    console.error('   → Current URL:', supabaseUrl)
    return false
  }
}

// Run connection test after a short delay to allow app to initialize
setTimeout(() => {
  testConnection()
}, 1000)