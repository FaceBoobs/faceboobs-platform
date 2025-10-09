// Test Supabase Connection
import { supabase } from './supabaseClient';

async function testSupabaseConnection() {
  console.log('🧪 Testing Supabase connection...');
  console.log('📍 Supabase URL:', supabase.supabaseUrl);

  // Test 1: Check if we can query the users table
  console.log('\n📊 Test 1: Reading users table...');
  const { data: users, error: readError } = await supabase
    .from('users')
    .select('*')
    .limit(5);

  if (readError) {
    console.error('❌ Read Error:', readError);
  } else {
    console.log('✅ Read Success. Users count:', users?.length);
    console.log('📋 Users:', users);
  }

  // Test 2: Try to insert a test user
  console.log('\n📝 Test 2: Inserting test user...');
  const testUser = {
    avatar_url: 'test-avatar-url',
    is_creator: false,
    followers_count: 0,
    following_count: 0
  };

  console.log('📤 Data to insert:', testUser);

  const { data: insertData, error: insertError } = await supabase
    .from('users')
    .insert([testUser])
    .select();

  if (insertError) {
    console.error('❌ Insert Error:', insertError);
    console.error('❌ Error code:', insertError.code);
    console.error('❌ Error message:', insertError.message);
    console.error('❌ Error details:', insertError.details);
    console.error('❌ Error hint:', insertError.hint);
  } else {
    console.log('✅ Insert Success!');
    console.log('📋 Inserted data:', insertData);
  }
}

// Export for manual testing in console
window.testSupabase = testSupabaseConnection;

console.log('🎯 Test function loaded. Run: window.testSupabase()');

export default testSupabaseConnection;
