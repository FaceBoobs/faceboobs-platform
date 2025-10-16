-- ============================================
-- FINAL MIGRATIONS - 9 MEGA FIX
-- Run these in Supabase SQL Editor
-- ============================================

-- 1. NOTIFICATIONS SYSTEM
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_address TEXT NOT NULL,
  type TEXT NOT NULL,
  from_address TEXT,
  from_username TEXT,
  content TEXT,
  post_id INTEGER,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_address);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_address, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

COMMENT ON TABLE notifications IS 'User notifications for follow, like, comment events';


-- 2. MESSAGES - ADD is_read COLUMN
-- ============================================
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(receiver_address, is_read);

COMMENT ON COLUMN messages.is_read IS 'Tracks whether message has been read';


-- 3. USERS - ADD last_seen FOR ONLINE STATUS
-- ============================================
ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen);

COMMENT ON COLUMN users.last_seen IS 'Last activity timestamp for online/offline status';


-- 4. MESSAGES - ADD MEDIA SUPPORT
-- ============================================
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS media_type TEXT;

COMMENT ON COLUMN messages.media_url IS 'URL to uploaded image/video in Supabase Storage';
COMMENT ON COLUMN messages.media_type IS 'Type of media: image or video';


-- 5. MESSAGES - ADD PAID CONTENT SUPPORT
-- ============================================
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS price DECIMAL(18,8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_unlocked BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_messages_paid ON messages(is_paid, is_unlocked);

COMMENT ON COLUMN messages.is_paid IS 'Whether this message requires payment to view';
COMMENT ON COLUMN messages.price IS 'Price in BNB to unlock this message';
COMMENT ON COLUMN messages.is_unlocked IS 'Whether the receiver has unlocked this paid message';


-- 6. MESSAGE PURCHASES TRACKING
-- ============================================
CREATE TABLE IF NOT EXISTS message_purchases (
  id SERIAL PRIMARY KEY,
  message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
  buyer_address TEXT NOT NULL,
  price DECIMAL(18,8),
  purchased_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_purchases_buyer ON message_purchases(buyer_address);
CREATE INDEX IF NOT EXISTS idx_message_purchases_message ON message_purchases(message_id);

COMMENT ON TABLE message_purchases IS 'Tracks purchases of paid messages in chat';


-- 7. VERIFY ALL TABLES
-- ============================================
SELECT 'notifications' as table_name, COUNT(*) as rows FROM notifications
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'message_purchases', COUNT(*) FROM message_purchases;


-- 8. SAMPLE QUERIES FOR TESTING
-- ============================================

-- Get unread notifications
SELECT * FROM notifications
WHERE user_address = 'YOUR_ADDRESS_LOWERCASE' AND is_read = FALSE
ORDER BY created_at DESC;

-- Get unread messages
SELECT * FROM messages
WHERE receiver_address = 'YOUR_ADDRESS_LOWERCASE' AND is_read = FALSE
ORDER BY created_at DESC;

-- Check online users (active in last 5 minutes)
SELECT username, wallet_address, last_seen
FROM users
WHERE last_seen > NOW() - INTERVAL '5 minutes'
ORDER BY last_seen DESC;

-- Get paid messages for a conversation
SELECT * FROM messages
WHERE sender_address = 'ADDRESS1' AND receiver_address = 'ADDRESS2'
  AND is_paid = TRUE
ORDER BY created_at DESC;


-- 9. CLEANUP FUNCTIONS (OPTIONAL)
-- ============================================

-- Auto-delete old notifications after 30 days
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notifications
  WHERE is_read = TRUE
    AND created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Call manually: SELECT cleanup_old_notifications();


-- 10. STORAGE SETUP (MANUAL STEP)
-- ============================================
-- Go to Supabase Dashboard → Storage → Create New Bucket
-- Bucket name: chat-media
-- Public: YES
-- File size limit: 10MB
-- Allowed MIME types: image/*, video/*
