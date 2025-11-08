-- ============================================
-- MIGRATION: Add avatar_blockchain_id column to users table
-- ============================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- ============================================

-- 1. Add avatar_blockchain_id column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS avatar_blockchain_id TEXT;

-- 2. Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_avatar_blockchain_id ON users(avatar_blockchain_id);

-- 3. Add comment to document the column
COMMENT ON COLUMN users.avatar_blockchain_id IS 'Blockchain content ID for user avatar (from ContentCreated event)';

-- 4. Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'avatar_blockchain_id';

-- 5. Check existing users table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
