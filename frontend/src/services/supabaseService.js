// src/services/supabaseService.js
import { supabase } from '../supabaseClient';

export class SupabaseService {
  // Posts
  static async createPost(postData) {
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert([postData])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating post:', error);
      return { success: false, error: error.message };
    }
  }

  static async getPosts(limit = 50) {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching posts:', error);
      return { success: false, error: error.message };
    }
  }

  static async getPostsByCreator(creatorAddress, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('creator_address', creatorAddress)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching posts by creator:', error);
      return { success: false, error: error.message };
    }
  }

  static async getPostsByCreators(creatorAddresses, limit = 50) {
    try {
      console.log('🔍 Fetching posts from creators:', creatorAddresses);

      if (!creatorAddresses || creatorAddresses.length === 0) {
        return { success: true, data: [] };
      }

      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .in('creator_address', creatorAddresses)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      console.log('✅ Found', data.length, 'posts from followed creators');
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching posts by creators:', error);
      return { success: false, error: error.message };
    }
  }

  static async deletePost(postId, userAddress) {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('creator_address', userAddress);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting post:', error);
      return { success: false, error: error.message };
    }
  }

  // Stories
  static async createStory(storyData) {
    try {
      const { data, error } = await supabase
        .from('stories')
        .insert([storyData])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating story:', error);
      return { success: false, error: error.message };
    }
  }

  static async getActiveStories() {
    try {
      // First cleanup expired stories
      await supabase
        .from('stories')
        .delete()
        .lt('expires_at', new Date().toISOString());

      // Then fetch active stories
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching stories:', error);
      return { success: false, error: error.message };
    }
  }

  // Likes
  static async toggleLike(postId, userAddress, username = null) {
    try {
      // Check if like exists
      const { data: existingLike, error: checkError } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_address', userAddress)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingLike) {
        // Remove like
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_address', userAddress);

        if (error) throw error;
        return { success: true, action: 'unliked' };
      } else {
        // Add like
        const { error } = await supabase
          .from('likes')
          .insert([{
            post_id: postId,
            user_address: userAddress
          }]);

        if (error) throw error;

        // Create notification for post owner
        const { data: post } = await supabase
          .from('posts')
          .select('creator_address, username')
          .eq('id', postId)
          .single();

        if (post && post.creator_address !== userAddress) {
          await this.createNotification({
            user_address: post.creator_address,
            type: 'like',
            title: 'New Like',
            message: `${username || userAddress.substring(0, 8)} liked your post`,
            post_id: postId,
            from_user_address: userAddress,
            from_username: username
          });
        }

        return { success: true, action: 'liked' };
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      return { success: false, error: error.message };
    }
  }

  static async getLikesForPost(postId) {
    try {
      const { data, error } = await supabase
        .from('likes')
        .select('user_address')
        .eq('post_id', postId);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching likes:', error);
      return { success: false, error: error.message };
    }
  }

  static async getUserLikes(userAddress) {
    try {
      const { data, error } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_address', userAddress);

      if (error) throw error;
      return { success: true, data: data.map(like => like.post_id) };
    } catch (error) {
      console.error('Error fetching user likes:', error);
      return { success: false, error: error.message };
    }
  }

  // Comments
  static async createComment(commentData) {
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert([commentData])
        .select()
        .single();

      if (error) throw error;

      // Create notification for post owner
      const { data: post } = await supabase
        .from('posts')
        .select('creator_address, username')
        .eq('id', commentData.post_id)
        .single();

      if (post && post.creator_address !== commentData.user_address) {
        await this.createNotification({
          user_address: post.creator_address,
          type: 'comment',
          title: 'New Comment',
          message: `${commentData.username || commentData.user_address.substring(0, 8)} commented on your post`,
          post_id: commentData.post_id,
          from_user_address: commentData.user_address,
          from_username: commentData.username
        });
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error creating comment:', error);
      return { success: false, error: error.message };
    }
  }

  static async getCommentsForPost(postId) {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching comments:', error);
      return { success: false, error: error.message };
    }
  }

  static async deleteComment(commentId, userAddress) {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_address', userAddress);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting comment:', error);
      return { success: false, error: error.message };
    }
  }

  // Notifications
  static async createNotification(notificationData) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([notificationData])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating notification:', error);
      return { success: false, error: error.message };
    }
  }

  static async getNotifications(userAddress, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_address', userAddress)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return { success: false, error: error.message };
    }
  }

  static async markNotificationAsRead(notificationId, userAddress) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_address', userAddress);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { success: false, error: error.message };
    }
  }

  static async markAllNotificationsAsRead(userAddress) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_address', userAddress)
        .eq('is_read', false);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return { success: false, error: error.message };
    }
  }

  // Users
  static async createOrUpdateUser(userData) {
    try {
      const { data, error } = await supabase
        .from('users')
        .upsert([userData], { onConflict: 'address' })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating/updating user:', error);
      return { success: false, error: error.message };
    }
  }

  static async getUser(address) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('address', address)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching user:', error);
      return { success: false, error: error.message };
    }
  }

  static async getAllUsers(limit = 50) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching all users:', error);
      return { success: false, error: error.message };
    }
  }

  // Purchases
  static async createPurchase(purchaseData) {
    try {
      const { data, error } = await supabase
        .from('purchases')
        .insert([purchaseData])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating purchase:', error);
      return { success: false, error: error.message };
    }
  }

  static async getUserPurchases(userAddress) {
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('post_id')
        .eq('user_address', userAddress);

      if (error) throw error;
      return { success: true, data: data.map(purchase => purchase.post_id) };
    } catch (error) {
      console.error('Error fetching user purchases:', error);
      return { success: false, error: error.message };
    }
  }

  static async checkContentAccess(userAddress, postId) {
    try {
      // Check if post is free
      const { data: post, error: postError } = await supabase
        .from('posts')
        .select('is_paid, creator_address')
        .eq('id', postId)
        .single();

      if (postError) throw postError;

      // If it's the owner's post or it's free, they have access
      if (post.creator_address === userAddress || !post.is_paid) {
        return { success: true, hasAccess: true };
      }

      // Check if they purchased it
      const { data: purchase, error: purchaseError } = await supabase
        .from('purchases')
        .select('id')
        .eq('user_address', userAddress)
        .eq('post_id', postId)
        .single();

      if (purchaseError && purchaseError.code !== 'PGRST116') throw purchaseError;

      return { success: true, hasAccess: !!purchase };
    } catch (error) {
      console.error('Error checking content access:', error);
      return { success: false, error: error.message };
    }
  }

  // Utility functions
  static async cleanup() {
    try {
      // Remove expired stories
      await supabase
        .from('stories')
        .delete()
        .lt('expires_at', new Date().toISOString());

      return { success: true };
    } catch (error) {
      console.error('Error during cleanup:', error);
      return { success: false, error: error.message };
    }
  }

  // Real-time subscriptions
  static subscribeToLikes(postId, callback) {
    return supabase
      .channel(`likes-${postId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'likes',
        filter: `post_id=eq.${postId}`
      }, callback)
      .subscribe();
  }

  static subscribeToComments(postId, callback) {
    return supabase
      .channel(`comments-${postId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments',
        filter: `post_id=eq.${postId}`
      }, callback)
      .subscribe();
  }

  static subscribeToNotifications(userAddress, callback) {
    return supabase
      .channel(`notifications-${userAddress}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_address=eq.${userAddress}`
      }, callback)
      .subscribe();
  }

  // Messages - Build conversations dynamically from messages table
  static async getConversations(userAddress) {
    try {
      console.log('🔄 Loading conversations for user:', userAddress);

      if (!userAddress) {
        throw new Error('User address is required');
      }

      // Fetch all messages where user is sender or receiver
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_address.eq.${userAddress},receiver_address.eq.${userAddress}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Supabase query error:', error);
        throw error;
      }

      console.log('✅ Loaded messages for building conversations:', data?.length || 0, 'messages');
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('❌ Error fetching conversations:', error);
      console.error('❌ Full error details:', error.message, error.details, error.hint);
      return { success: false, error: error.message };
    }
  }

  static async sendMessage(messageData) {
    try {
      console.log('🔄 Sending message:', messageData);
      console.log('🔍 Message data fields:', Object.keys(messageData));

      const { data, error } = await supabase
        .from('messages')
        .insert([{
          sender_address: messageData.sender_address,
          receiver_address: messageData.receiver_address,
          content: messageData.content,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase insert error:', error);
        throw error;
      }

      console.log('✅ Message sent successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('❌ Error sending message:', error);
      console.error('❌ Full error details:', error.message, error.details, error.hint);
      return { success: false, error: error.message };
    }
  }

  static async getMessages(userAddress, otherAddress) {
    try {
      console.log('🔄 Loading messages between:', userAddress, 'and', otherAddress);

      if (!userAddress || !otherAddress) {
        throw new Error('Both user addresses are required');
      }

      // Get all messages where user and other are either sender or receiver
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_address.eq.${userAddress},receiver_address.eq.${otherAddress}),and(sender_address.eq.${otherAddress},receiver_address.eq.${userAddress})`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Supabase query error:', error);
        throw error;
      }

      console.log('✅ Loaded messages:', data?.length || 0, 'messages');
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
      console.error('❌ Full error details:', error.message, error.details, error.hint);
      return { success: false, error: error.message };
    }
  }

  static async deleteMessage(messageId, userAddress) {
    try {
      console.log('🔄 Deleting message:', messageId, 'by user:', userAddress);

      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_address', userAddress);

      if (error) throw error;

      console.log('✅ Message deleted');
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting message:', error);
      return { success: false, error: error.message };
    }
  }

  // Real-time subscriptions for messages
  static subscribeToMessages(userAddress, otherAddress, callback) {
    console.log('🔄 Subscribing to messages between:', userAddress, 'and', otherAddress);

    // Subscribe to messages where either user is sender or receiver
    return supabase
      .channel(`messages-${userAddress}-${otherAddress}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages'
      }, (payload) => {
        // Filter messages between these two users
        const msg = payload.new || payload.old;
        if (msg && (
          (msg.sender_address === userAddress && msg.receiver_address === otherAddress) ||
          (msg.sender_address === otherAddress && msg.receiver_address === userAddress)
        )) {
          callback(payload);
        }
      })
      .subscribe();
  }

  static subscribeToUserMessages(userAddress, callback) {
    console.log('🔄 Subscribing to all messages for user:', userAddress);

    // Subscribe to all messages where user is sender or receiver
    return supabase
      .channel(`user-messages-${userAddress}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages'
      }, (payload) => {
        // Filter messages where user is involved
        const msg = payload.new || payload.old;
        if (msg && (msg.sender_address === userAddress || msg.receiver_address === userAddress)) {
          callback(payload);
        }
      })
      .subscribe();
  }
}

export default SupabaseService;