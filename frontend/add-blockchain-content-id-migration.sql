-- Migration: Add blockchain_content_id column to posts table
-- Run this in your Supabase SQL Editor to update existing databases

-- Add blockchain_content_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'posts'
        AND column_name = 'blockchain_content_id'
    ) THEN
        ALTER TABLE posts ADD COLUMN blockchain_content_id TEXT;
        RAISE NOTICE 'Column blockchain_content_id added successfully';
    ELSE
        RAISE NOTICE 'Column blockchain_content_id already exists';
    END IF;
END $$;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_posts_blockchain_content_id ON posts(blockchain_content_id);

-- Verify the column was added
SELECT
    column_name,
    data_type,
    is_nullable
FROM
    information_schema.columns
WHERE
    table_name = 'posts'
    AND column_name = 'blockchain_content_id';

-- Display current posts with missing blockchain_content_id
SELECT
    id,
    creator_address,
    price,
    is_paid,
    blockchain_content_id,
    created_at
FROM
    posts
WHERE
    is_paid = true
    AND (blockchain_content_id IS NULL OR blockchain_content_id = '')
ORDER BY
    created_at DESC;
