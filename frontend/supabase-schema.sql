-- SocialWeb3 Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Enable Row Level Security
ALTER DATABASE postgres SET row_security = on;

-- Create users table for profile information
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    address TEXT UNIQUE NOT NULL,
    username TEXT,
    bio TEXT,
    profile_image TEXT,
    is_creator BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    content_id INTEGER,
    creator_address TEXT NOT NULL,
    username TEXT,
    description TEXT,
    content_hash TEXT,
    image_url TEXT NOT NULL, -- base64 encoded image/video
    price DECIMAL(18,8) DEFAULT 0,
    is_paid BOOLEAN DEFAULT false,
    likes INTEGER DEFAULT 0,
    purchase_count INTEGER DEFAULT 0,
    file_name TEXT,
    file_type TEXT,
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stories table
CREATE TABLE IF NOT EXISTS stories (
    id SERIAL PRIMARY KEY,
    creator_address TEXT NOT NULL,
    username TEXT,
    content TEXT, -- text content description
    content_hash TEXT,
    image_url TEXT NOT NULL, -- base64 encoded image/video
    file_name TEXT,
    file_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create likes table
CREATE TABLE IF NOT EXISTS likes (
    id SERIAL PRIMARY KEY,
    user_address TEXT NOT NULL,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_address, post_id)
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    user_address TEXT NOT NULL,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    username TEXT,
    avatar TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create purchases table for paid content
CREATE TABLE IF NOT EXISTS purchases (
    id SERIAL PRIMARY KEY,
    user_address TEXT NOT NULL,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    amount DECIMAL(18,8) NOT NULL,
    transaction_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_address, post_id)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_address TEXT NOT NULL,
    type TEXT NOT NULL, -- 'like', 'comment', 'purchase', 'follow'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    from_user_address TEXT,
    from_username TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_posts_creator_address ON posts(creator_address);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_creator_address ON stories(creator_address);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_address ON likes(user_address);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_address ON notifications(user_address);
CREATE INDEX IF NOT EXISTS idx_purchases_user_address ON purchases(user_address);

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view all profiles" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (address = current_setting('request.jwt.claims', true)::json->>'address');
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (address = current_setting('request.jwt.claims', true)::json->>'address');

-- RLS Policies for posts table
CREATE POLICY "Anyone can view posts" ON posts FOR SELECT USING (true);
CREATE POLICY "Users can create posts" ON posts FOR INSERT WITH CHECK (creator_address = current_setting('request.jwt.claims', true)::json->>'address');
CREATE POLICY "Users can update own posts" ON posts FOR UPDATE USING (creator_address = current_setting('request.jwt.claims', true)::json->>'address');
CREATE POLICY "Users can delete own posts" ON posts FOR DELETE USING (creator_address = current_setting('request.jwt.claims', true)::json->>'address');

-- RLS Policies for stories table
CREATE POLICY "Anyone can view active stories" ON stories FOR SELECT USING (expires_at > NOW());
CREATE POLICY "Users can create stories" ON stories FOR INSERT WITH CHECK (creator_address = current_setting('request.jwt.claims', true)::json->>'address');
CREATE POLICY "Users can delete own stories" ON stories FOR DELETE USING (creator_address = current_setting('request.jwt.claims', true)::json->>'address');

-- RLS Policies for likes table
CREATE POLICY "Anyone can view likes" ON likes FOR SELECT USING (true);
CREATE POLICY "Users can manage own likes" ON likes FOR ALL USING (user_address = current_setting('request.jwt.claims', true)::json->>'address');

-- RLS Policies for comments table
CREATE POLICY "Anyone can view comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON comments FOR INSERT WITH CHECK (user_address = current_setting('request.jwt.claims', true)::json->>'address');
CREATE POLICY "Users can update own comments" ON comments FOR UPDATE USING (user_address = current_setting('request.jwt.claims', true)::json->>'address');
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (user_address = current_setting('request.jwt.claims', true)::json->>'address');

-- RLS Policies for purchases table
CREATE POLICY "Users can view own purchases" ON purchases FOR SELECT USING (user_address = current_setting('request.jwt.claims', true)::json->>'address');
CREATE POLICY "Users can create purchases" ON purchases FOR INSERT WITH CHECK (user_address = current_setting('request.jwt.claims', true)::json->>'address');

-- RLS Policies for notifications table
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (user_address = current_setting('request.jwt.claims', true)::json->>'address');
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (user_address = current_setting('request.jwt.claims', true)::json->>'address');

-- Functions for automatic like counting
CREATE OR REPLACE FUNCTION update_post_likes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET likes = likes + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET likes = likes - 1 WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic like counting
DROP TRIGGER IF EXISTS trigger_update_post_likes ON likes;
CREATE TRIGGER trigger_update_post_likes
    AFTER INSERT OR DELETE ON likes
    FOR EACH ROW EXECUTE FUNCTION update_post_likes();

-- Function to clean up expired stories
CREATE OR REPLACE FUNCTION cleanup_expired_stories()
RETURNS void AS $$
BEGIN
    DELETE FROM stories WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_address TEXT,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_post_id INTEGER DEFAULT NULL,
    p_from_user_address TEXT DEFAULT NULL,
    p_from_username TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO notifications (
        user_address,
        type,
        title,
        message,
        post_id,
        from_user_address,
        from_username
    ) VALUES (
        p_user_address,
        p_type,
        p_title,
        p_message,
        p_post_id,
        p_from_user_address,
        p_from_username
    );
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stories_updated_at BEFORE UPDATE ON stories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data (optional, comment out if not needed)
-- INSERT INTO users (address, username, bio, is_creator) VALUES
-- ('0x1234567890123456789012345678901234567890', 'Alice Creator', 'Digital artist and content creator', true),
-- ('0x0987654321098765432109876543210987654321', 'Bob Viewer', 'Art enthusiast and collector', false);

-- Grant necessary permissions
GRANT USAGE ON SEQUENCE posts_id_seq TO anon, authenticated;
GRANT USAGE ON SEQUENCE stories_id_seq TO anon, authenticated;
GRANT USAGE ON SEQUENCE likes_id_seq TO anon, authenticated;
GRANT USAGE ON SEQUENCE comments_id_seq TO anon, authenticated;
GRANT USAGE ON SEQUENCE purchases_id_seq TO anon, authenticated;
GRANT USAGE ON SEQUENCE notifications_id_seq TO anon, authenticated;

-- Grant table permissions
GRANT ALL ON users TO anon, authenticated;
GRANT ALL ON posts TO anon, authenticated;
GRANT ALL ON stories TO anon, authenticated;
GRANT ALL ON likes TO anon, authenticated;
GRANT ALL ON comments TO anon, authenticated;
GRANT ALL ON purchases TO anon, authenticated;
GRANT ALL ON notifications TO anon, authenticated;

-- ===============================
-- MESSAGING SYSTEM TABLES
-- ===============================

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    participant1 TEXT NOT NULL, -- wallet address of first participant
    participant2 TEXT NOT NULL, -- wallet address of second participant
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Ensure no duplicate conversations between same participants
    CONSTRAINT unique_participants UNIQUE (LEAST(participant1, participant2), GREATEST(participant1, participant2))
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_address TEXT NOT NULL, -- wallet address of sender
    receiver_address TEXT NOT NULL, -- wallet address of receiver
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_read BOOLEAN DEFAULT false
);

-- Create indexes for messaging performance
CREATE INDEX IF NOT EXISTS idx_conversations_participant1 ON conversations(participant1);
CREATE INDEX IF NOT EXISTS idx_conversations_participant2 ON conversations(participant2);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_address ON messages(sender_address);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_address ON messages(receiver_address);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Enable Row Level Security for messaging tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations table
-- Users can only see conversations they are participating in
CREATE POLICY "Users can view own conversations" ON conversations FOR SELECT
USING (participant1 = current_setting('request.jwt.claims', true)::json->>'address'
       OR participant2 = current_setting('request.jwt.claims', true)::json->>'address');

-- Users can create conversations where they are one of the participants
CREATE POLICY "Users can create conversations" ON conversations FOR INSERT
WITH CHECK (participant1 = current_setting('request.jwt.claims', true)::json->>'address'
            OR participant2 = current_setting('request.jwt.claims', true)::json->>'address');

-- RLS Policies for messages table
-- Users can only see messages in conversations they participate in
CREATE POLICY "Users can view own messages" ON messages FOR SELECT
USING (sender_address = current_setting('request.jwt.claims', true)::json->>'address'
       OR receiver_address = current_setting('request.jwt.claims', true)::json->>'address');

-- Users can only send messages where they are the sender
CREATE POLICY "Users can send messages" ON messages FOR INSERT
WITH CHECK (sender_address = current_setting('request.jwt.claims', true)::json->>'address');

-- Users can only update their own sent messages (for read status, etc.)
CREATE POLICY "Users can update own messages" ON messages FOR UPDATE
USING (sender_address = current_setting('request.jwt.claims', true)::json->>'address'
       OR receiver_address = current_setting('request.jwt.claims', true)::json->>'address');

-- Add triggers for updated_at on messaging tables
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update conversation timestamp when new message is sent
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation timestamp on new message
DROP TRIGGER IF EXISTS trigger_update_conversation_timestamp ON messages;
CREATE TRIGGER trigger_update_conversation_timestamp
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp();

-- Grant sequence permissions for messaging tables
GRANT ALL ON conversations TO anon, authenticated;
GRANT ALL ON messages TO anon, authenticated;