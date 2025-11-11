-- Migration: Add from_avatar_url to notifications table
-- Date: 2025-11-11
-- Purpose: Store the avatar URL of the user who triggered the notification

-- Add from_avatar_url column if it doesn't exist
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS from_avatar_url TEXT;

-- Optional: Add comment to document the column
COMMENT ON COLUMN notifications.from_avatar_url IS 'Avatar URL of the user who triggered this notification (from Supabase Storage or IPFS)';
