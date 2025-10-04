# SocialWeb3 Supabase Integration Setup Guide

## Overview
This guide walks you through setting up the complete Supabase database integration for the SocialWeb3 platform, including proper database schema, Row Level Security (RLS), and functional like/comment systems.

## 🗄️ Database Schema Setup

### Step 1: Create the Database Schema
1. Open your Supabase project dashboard
2. Go to the **SQL Editor**
3. Copy and paste the entire contents of `supabase-schema.sql` into the editor
4. Click **Run** to execute the schema creation

The schema includes:
- ✅ `users` table for profile information
- ✅ `posts` table for content posts
- ✅ `stories` table for 24-hour stories
- ✅ `likes` table for post likes
- ✅ `comments` table for post comments
- ✅ `purchases` table for paid content
- ✅ `notifications` table for user notifications

### Step 2: Verify Table Creation
After running the schema, verify all tables are created:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';
```

## 🔐 Security Setup

### Row Level Security (RLS)
The schema automatically enables RLS with policies for:

- **Public Read Access**: Posts, stories, likes, comments are publicly readable
- **Authenticated Write**: Users can only modify their own content
- **Owner-Only Delete**: Users can only delete their own posts/comments
- **Private Data**: Users can only see their own purchases and notifications

### Test RLS Policies
```sql
-- Test that RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = true;
```

## 📊 Features Implemented

### ✅ Real-time Content Management
- **Posts**: Create, view, delete posts with base64 images
- **Stories**: 24-hour expiring stories with automatic cleanup
- **Likes**: Real-time like/unlike with automatic counting
- **Comments**: Threaded comments with notifications
- **Images**: Compressed image storage and display

### ✅ Enhanced User Experience
- **Optimistic Updates**: Instant UI feedback while saving to database
- **Error Handling**: Comprehensive error messages and fallbacks
- **Loading States**: Visual feedback during API operations
- **Automatic Cleanup**: Expired stories removed automatically

### ✅ Database Integration
- **SupabaseService**: Centralized API service class
- **Context Updates**: LikesContext and CommentsContext use Supabase
- **Real-time Sync**: Changes reflect immediately across users
- **Data Persistence**: All interactions saved to database

## 🛠️ Integration Points

### Updated Files
1. **`/src/services/supabaseService.js`** - New centralized API service
2. **`/src/contexts/LikesContext.js`** - Updated to use Supabase
3. **`/src/contexts/CommentsContext.js`** - Updated to use Supabase
4. **`/src/pages/Home.js`** - Updated to use SupabaseService
5. **`/src/pages/CreatePost.js`** - Updated to use SupabaseService

### Key Improvements
- ✅ **Removed localStorage dependencies** for core data
- ✅ **Added real-time synchronization** between users
- ✅ **Implemented proper error handling** with user feedback
- ✅ **Added optimistic updates** for better UX
- ✅ **Created comprehensive notifications** system

## 🚀 Testing the Integration

### 1. Test Post Creation
```javascript
// Should work in CreatePost.js
const result = await SupabaseService.createPost({
  user_address: "0x...",
  content: "data:image/jpeg;base64,...",
  description: "Test post",
  is_paid: false,
  price: 0
});
```

### 2. Test Like System
```javascript
// Should work in LikesContext
const result = await SupabaseService.toggleLike(1, "0x...", "TestUser");
console.log(result.action); // "liked" or "unliked"
```

### 3. Test Comment System
```javascript
// Should work in CommentsContext
const result = await SupabaseService.createComment({
  post_id: 1,
  user_address: "0x...",
  content: "Great post!",
  username: "TestUser"
});
```

## 🔍 Database Verification

### Check Data Flow
```sql
-- Verify posts are being created
SELECT id, user_address, description, created_at FROM posts ORDER BY created_at DESC LIMIT 5;

-- Verify likes are working
SELECT post_id, user_address FROM likes LIMIT 5;

-- Verify comments are working
SELECT post_id, content, username, created_at FROM comments ORDER BY created_at DESC LIMIT 5;

-- Check stories expiration
SELECT id, user_address, expires_at FROM stories WHERE expires_at > NOW();
```

## 🐛 Troubleshooting

### Common Issues

#### 1. RLS Permission Errors
```
Error: new row violates row-level security policy
```
**Solution**: Check that your JWT token contains the correct user address in claims.

#### 2. Foreign Key Errors
```
Error: insert or update on table "likes" violates foreign key constraint
```
**Solution**: Ensure the post_id exists in the posts table before adding likes.

#### 3. Image Display Issues
- Check that base64 data includes proper MIME type prefix
- Verify image compression is working correctly
- Ensure images are under storage limits

### Debug SQL Queries
```sql
-- Check table sizes
SELECT
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public';

-- Monitor real-time activity
SELECT * FROM pg_stat_activity WHERE state = 'active';
```

## 📈 Performance Optimizations

### Indexes Created
- `idx_posts_user_address` - Fast user post queries
- `idx_posts_created_at` - Fast timeline queries
- `idx_likes_post_id` - Fast like counting
- `idx_comments_post_id` - Fast comment loading

### Automatic Functions
- **`update_post_likes()`** - Automatically updates like counts
- **`cleanup_expired_stories()`** - Removes expired stories
- **`create_notification()`** - Helper for notifications

## 🎯 Next Steps

After setup:
1. **Test all features** in the frontend application
2. **Monitor database performance** under load
3. **Set up backup policies** for production
4. **Configure edge functions** for advanced features
5. **Add analytics** for user engagement

## 📞 Support

The integration includes:
- ✅ Complete error handling
- ✅ Loading states
- ✅ Optimistic updates
- ✅ Real-time synchronization
- ✅ Comprehensive logging

All database operations are handled through the `SupabaseService` class for consistency and maintainability.