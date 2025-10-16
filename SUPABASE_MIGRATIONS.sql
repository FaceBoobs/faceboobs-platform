-- ============================================
-- SUPABASE MIGRATIONS FOR NOTIFICATIONS SYSTEM
-- ============================================

-- 1. CREATE NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_address TEXT NOT NULL,
  type TEXT NOT NULL, -- 'follow', 'like', 'comment', 'message'
  from_address TEXT,
  from_username TEXT,
  content TEXT,
  post_id INTEGER,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_address);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_address, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

COMMENT ON TABLE notifications IS 'Stores user notifications for follow, like, comment, and message events';
COMMENT ON COLUMN notifications.type IS 'Type of notification: follow, like, comment, message';
COMMENT ON COLUMN notifications.from_address IS 'Wallet address of the user who triggered the notification';
COMMENT ON COLUMN notifications.from_username IS 'Username of the user who triggered the notification';
COMMENT ON COLUMN notifications.post_id IS 'Reference to post if notification is about a post (like/comment)';


-- 2. ADD is_read COLUMN TO MESSAGES TABLE
-- ============================================
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- Create index for unread messages queries
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(receiver_address, is_read);

COMMENT ON COLUMN messages.is_read IS 'Tracks whether the message has been read by the receiver';


-- 3. VERIFY TABLES STRUCTURE
-- ============================================
-- Run these queries to verify everything is correct:

-- Check notifications table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- Check messages table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'messages'
ORDER BY ordinal_position;


-- 4. SAMPLE QUERIES FOR TESTING
-- ============================================

-- Get unread notifications count for a user
SELECT COUNT(*)
FROM notifications
WHERE user_address = 'YOUR_ADDRESS_LOWERCASE' AND is_read = FALSE;

-- Get recent notifications for a user
SELECT *
FROM notifications
WHERE user_address = 'YOUR_ADDRESS_LOWERCASE'
ORDER BY created_at DESC
LIMIT 20;

-- Get unread messages count for a user
SELECT COUNT(*)
FROM messages
WHERE receiver_address = 'YOUR_ADDRESS_LOWERCASE' AND is_read = FALSE;

-- Mark all notifications as read for a user
UPDATE notifications
SET is_read = TRUE
WHERE user_address = 'YOUR_ADDRESS_LOWERCASE' AND is_read = FALSE;

-- Mark messages as read for a specific conversation
UPDATE messages
SET is_read = TRUE
WHERE receiver_address = 'YOUR_USER_ADDRESS'
  AND sender_address = 'OTHER_USER_ADDRESS'
  AND is_read = FALSE;


-- 5. OPTIONAL: CLEANUP OLD NOTIFICATIONS (30 days)
-- ============================================
-- You can run this periodically to clean up old read notifications
DELETE FROM notifications
WHERE is_read = TRUE
  AND created_at < NOW() - INTERVAL '30 days';


-- 6. OPTIONAL: TRIGGER TO AUTO-DELETE OLD NOTIFICATIONS
-- ============================================
-- This creates a function that automatically deletes old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM notifications
  WHERE is_read = TRUE
    AND created_at < NOW() - INTERVAL '30 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (runs after every insert)
DROP TRIGGER IF EXISTS trigger_cleanup_notifications ON notifications;
CREATE TRIGGER trigger_cleanup_notifications
  AFTER INSERT ON notifications
  EXECUTE FUNCTION cleanup_old_notifications();
